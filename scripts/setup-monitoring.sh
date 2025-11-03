#!/bin/bash

# Script de configuration monitoring - Phase 7
# Usage: ./setup-monitoring.sh [jump-host] [lxc-ip] [lxc-user] [public-server]
# Exemple: ./setup-monitoring.sh root@<PUBLIC_SERVER_IP> <LXC_IP> root root@<PUBLIC_SERVER_IP>

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fonctions utilitaires
log() { echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"; }
warning() { echo -e "${YELLOW}[WARNING] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}" >&2; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }

# Configuration
JUMP_HOST=${1:-""}
LXC_IP=${2:-""}
LXC_USER=${3:-"root"}
PUBLIC_SERVER=${4:-"root@<PUBLIC_SERVER_IP>"}
SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=no"

# Commande SSH LXC
ssh_lxc() {
    ssh $SSH_OPTS -J $JUMP_HOST $LXC_USER@$LXC_IP "$@"
}

# Commande SSH serveur public
ssh_public() {
    ssh $SSH_OPTS $PUBLIC_SERVER "$@"
}

# Vérifications préliminaires
check_prerequisites() {
    if [ -z "$JUMP_HOST" ] || [ -z "$LXC_IP" ]; then
        error "Jump host et IP LXC requis"
        echo "Usage: $0 <jump-host> <lxc-ip> [lxc-user] [public-server]"
        exit 1
    fi
}

# Script santé services
create_health_script() {
    log "📝 Création script santé services..."
    
    ssh_lxc << 'EOF'
# Détecter si sudo existe
if command -v sudo >/dev/null 2>&1; then
    SUDO_CMD="sudo"
else
    SUDO_CMD=""
fi

$SUDO_CMD tee /usr/local/bin/video-platform-health > /dev/null << 'HEALTH_SCRIPT'
#!/bin/bash
# Script de vérification santé plateforme vidéo

echo "=== Video Platform Health Check ==="
echo "Date: $(date)"
echo ""

# Services
echo "Services:"
if systemctl is-active mongod >/dev/null 2>&1 || systemctl is-active mongodb >/dev/null 2>&1; then
    echo "✅ MongoDB: ACTIF"
else
    echo "❌ MongoDB: INACTIF"
fi

if systemctl is-active video-platform >/dev/null 2>&1; then
    echo "✅ Video Platform: ACTIF"
else
    echo "❌ Video Platform: INACTIF"
fi
echo ""

# API Health
echo "API Health:"
API_RESPONSE=$(curl -s -f http://localhost:5000/api/health 2>/dev/null)
if [ $? -eq 0 ] && [ -n "$API_RESPONSE" ]; then
    echo "✅ API Backend: OK"
    echo "   Réponse: $API_RESPONSE"
else
    echo "❌ API Backend: ERREUR"
fi
echo ""

# Disque
echo "Utilisation disque:"
df -h /opt/video-platform 2>/dev/null | tail -1 || echo "⚠️ Impossible de vérifier /opt/video-platform"
df -h / 2>/dev/null | tail -1
echo ""

# Mémoire
echo "Mémoire:"
free -h | grep Mem || free -h | grep "^Mem"
echo ""

# Load average
echo "Charge système:"
uptime | awk -F'load average:' '{print $2}'
echo ""

# MongoDB Status
echo "MongoDB Status:"
if command -v mongosh >/dev/null 2>&1; then
    MONGO_CMD="mongosh"
elif command -v mongo >/dev/null 2>&1; then
    MONGO_CMD="mongo"
else
    MONGO_CMD=""
fi

if [ -n "$MONGO_CMD" ]; then
    if $MONGO_CMD --quiet --eval "db.adminCommand('ping').ok" >/dev/null 2>&1; then
        echo "✅ MongoDB: Connecté"
        # Taille de la base
        DB_SIZE=$($MONGO_CMD --quiet --eval "db.adminCommand('listDatabases').databases.find(d => d.name === 'video-platform').sizeOnDisk" 2>/dev/null)
        if [ -n "$DB_SIZE" ] && [ "$DB_SIZE" != "null" ]; then
            echo "   Taille DB: $DB_SIZE bytes"
        fi
    else
        echo "⚠️ MongoDB: Problème de connexion"
    fi
else
    echo "⚠️ MongoDB CLI non trouvé"
fi
echo ""

# Espace disque critiques
echo "Vérification espace disque:"
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "⚠️ ATTENTION: Disque à ${DISK_USAGE}% utilisé"
elif [ "$DISK_USAGE" -gt 90 ]; then
    echo "❌ CRITIQUE: Disque à ${DISK_USAGE}% utilisé"
else
    echo "✅ Disque: ${DISK_USAGE}% utilisé"
fi

HEALTH_SCRIPT

$SUDO_CMD chmod +x /usr/local/bin/video-platform-health
echo "✅ Script santé créé"
EOF
    
    log "✅ Script santé créé"
}

# Script sauvegarde MongoDB
create_backup_script() {
    log "💾 Création script sauvegarde MongoDB..."
    
    ssh_lxc << 'EOF'
# Détecter si sudo existe
if command -v sudo >/dev/null 2>&1; then
    SUDO_CMD="sudo"
else
    SUDO_CMD=""
fi

$SUDO_CMD tee /usr/local/bin/backup-mongodb > /dev/null << 'BACKUP_SCRIPT'
#!/bin/bash
# Script de sauvegarde MongoDB

BACKUP_DIR="/opt/backups/video-platform"
LOG_FILE="/opt/video-platform/logs/backup.log"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Créer les dossiers nécessaires
mkdir -p $BACKUP_DIR
mkdir -p $(dirname $LOG_FILE)

# Fonction de logging
log_msg() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log_msg "📦 Début de la sauvegarde MongoDB..."

# Vérifier si MongoDB est accessible
if command -v mongosh >/dev/null 2>&1; then
    MONGO_CMD="mongosh"
elif command -v mongo >/dev/null 2>&1; then
    MONGO_CMD="mongo"
else
    log_msg "❌ MongoDB CLI non trouvé"
    exit 1
fi

# Tester la connexion MongoDB
if ! $MONGO_CMD --quiet --eval "db.adminCommand('ping').ok" >/dev/null 2>&1; then
    log_msg "❌ MongoDB non accessible"
    exit 1
fi

# Sauvegarde MongoDB
log_msg "📦 Sauvegarde base de données video-platform..."
if mongodump --quiet --host localhost --port 27017 --db video-platform --out "$BACKUP_DIR/mongo_$DATE" 2>&1 | tee -a $LOG_FILE; then
    log_msg "✅ Sauvegarde MongoDB réussie"
    
    # Compresser
    log_msg "📦 Compression de la sauvegarde..."
    if tar -czf "$BACKUP_DIR/mongo_$DATE.tar.gz" -C "$BACKUP_DIR" "mongo_$DATE" 2>&1 | tee -a $LOG_FILE; then
        rm -rf "$BACKUP_DIR/mongo_$DATE"
        log_msg "✅ Compression réussie: mongo_$DATE.tar.gz"
        
        # Afficher la taille
        BACKUP_SIZE=$(du -h "$BACKUP_DIR/mongo_$DATE.tar.gz" | cut -f1)
        log_msg "   Taille: $BACKUP_SIZE"
    else
        log_msg "⚠️ Erreur lors de la compression"
    fi
else
    log_msg "❌ Erreur lors de la sauvegarde MongoDB"
    exit 1
fi

# Sauvegarder fichiers critiques
log_msg "📦 Sauvegarde fichiers de configuration..."
if tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" \
    /opt/video-platform/app/backend/.env \
    /etc/systemd/system/video-platform.service 2>/dev/null; then
    log_msg "✅ Configuration sauvegardée: config_$DATE.tar.gz"
else
    log_msg "⚠️ Erreur lors de la sauvegarde de la configuration (peut être normal si fichiers manquants)"
fi

# Nettoyage (garder 30 jours)
log_msg "🧹 Nettoyage des sauvegardes anciennes (rétention: $RETENTION_DAYS jours)..."
DELETED=$(find $BACKUP_DIR -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
    log_msg "   $DELETED fichier(s) supprimé(s)"
else
    log_msg "   Aucun fichier à supprimer"
fi

log_msg "✅ Sauvegarde terminée: $DATE"
echo ""
echo "📦 Sauvegardes disponibles:"
ls -lh $BACKUP_DIR/*.tar.gz 2>/dev/null | tail -5 || echo "   Aucune sauvegarde"

BACKUP_SCRIPT

$SUDO_CMD chmod +x /usr/local/bin/backup-mongodb
echo "✅ Script sauvegarde créé"
EOF
    
    log "✅ Script sauvegarde créé"
}

# Configurer cron pour sauvegardes
setup_backup_cron() {
    log "⏰ Configuration cron pour sauvegardes..."
    
    ssh_lxc << 'EOF'
# Créer le dossier de logs si nécessaire
mkdir -p /opt/video-platform/logs

# Ajouter tâche cron si elle n'existe pas déjà
(crontab -l 2>/dev/null | grep -v "backup-mongodb"; echo "0 2 * * * /usr/local/bin/backup-mongodb >> /opt/video-platform/logs/backup.log 2>&1") | crontab -

echo "✅ Cron configuré pour sauvegardes quotidiennes à 2h"
echo "📋 Tâches cron actuelles:"
crontab -l 2>/dev/null | grep -v "^#" | grep -v "^$" || echo "   Aucune tâche cron"
EOF
    
    log "✅ Cron configuré pour sauvegardes quotidiennes à 2h"
}

# Configurer logrotate Nginx (serveur public)
setup_nginx_logrotate() {
    log "📄 Configuration logrotate Nginx..."
    
    ssh_public << 'EOF'
# Détecter si sudo existe
if command -v sudo >/dev/null 2>&1; then
    SUDO_CMD="sudo"
else
    SUDO_CMD=""
fi

$SUDO_CMD tee /etc/logrotate.d/nginx-video-platform > /dev/null << LOGROTATE_FILE
/var/log/nginx/video-platform.*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}
LOGROTATE_FILE

echo "✅ Logrotate Nginx configuré"
EOF
    
    log "✅ Logrotate Nginx configuré"
}

# Configurer logrotate pour les logs de l'application (LXC)
setup_app_logrotate() {
    log "📄 Configuration logrotate application..."
    
    ssh_lxc << 'EOF'
# Détecter si sudo existe
if command -v sudo >/dev/null 2>&1; then
    SUDO_CMD="sudo"
else
    SUDO_CMD=""
fi

# Créer le dossier de logs si nécessaire
mkdir -p /opt/video-platform/logs

$SUDO_CMD tee /etc/logrotate.d/video-platform > /dev/null << LOGROTATE_FILE
/opt/video-platform/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    sharedscripts
    postrotate
        systemctl reload video-platform > /dev/null 2>&1 || true
    endscript
}
LOGROTATE_FILE

echo "✅ Logrotate application configuré"
EOF
    
    log "✅ Logrotate application configuré"
}

# Afficher informations monitoring
show_monitoring_info() {
    log "📋 Informations de monitoring :"
    echo ""
    info "📊 Scripts créés :"
    info "   /usr/local/bin/video-platform-health (LXC)"
    info "   /usr/local/bin/backup-mongodb (LXC)"
    echo ""
    info "⏰ Cron jobs :"
    info "   Sauvegarde MongoDB: Tous les jours à 2h"
    echo ""
    info "📄 Logrotate :"
    info "   /opt/video-platform/logs/*.log (LXC)"
    info "   /var/log/nginx/video-platform.*.log (Public)"
    echo ""
    info "🔧 Commandes utiles :"
    info "   Health check: ssh -J $JUMP_HOST $LXC_USER@$LXC_IP '/usr/local/bin/video-platform-health'"
    info "   Backup manuel: ssh -J $JUMP_HOST $LXC_USER@$LXC_IP '/usr/local/bin/backup-mongodb'"
    info "   Voir backups: ssh -J $JUMP_HOST $LXC_USER@$LXC_IP 'ls -lh /opt/backups/video-platform/'"
}

# Fonction principale
main() {
    log "🚀 Démarrage de la configuration monitoring..."
    
    check_prerequisites
    create_health_script
    create_backup_script
    setup_backup_cron
    setup_nginx_logrotate
    setup_app_logrotate
    show_monitoring_info
    
    log "✅ Configuration monitoring terminée avec succès !"
    log "📝 Déploiement production terminé !"
}

# Exécution
main "$@"
