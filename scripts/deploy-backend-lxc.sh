#!/bin/bash

# Script de déploiement backend sur LXC - Phase 2
# Usage: ./deploy-backend-lxc.sh [jump-host] [lxc-ip] [lxc-user]
# Exemple: ./deploy-backend-lxc.sh root@<PUBLIC_SERVER_IP> <LXC_IP> root

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
APP_PATH="/opt/video-platform/app"
SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=no"

# Commande SSH avec jump host
ssh_cmd() {
    ssh $SSH_OPTS -J $JUMP_HOST $LXC_USER@$LXC_IP "$@"
}

# Commande rsync avec jump host
rsync_cmd() {
    rsync -avz --delete -e "ssh $SSH_OPTS -J $JUMP_HOST" "$@"
}

# Vérifications préliminaires
check_prerequisites() {
    log "🔍 Vérification des prérequis..."
    
    if [ -z "$JUMP_HOST" ] || [ -z "$LXC_IP" ]; then
        error "Jump host et IP LXC requis"
        echo "Usage: $0 <jump-host> <lxc-ip> [lxc-user]"
        exit 1
    fi
    
    if [ ! -d "backend" ]; then
        error "❌ Dossier backend non trouvé. Exécutez depuis la racine du projet."
        exit 1
    fi
    
    log "✅ Prérequis vérifiés"
}

# Test de connexion SSH
test_ssh_connection() {
    log "🔗 Test de connexion SSH..."
    
    if ssh_cmd exit 2>/dev/null; then
        log "✅ Connexion SSH OK"
    else
        error "❌ Connexion SSH échouée"
        exit 1
    fi
}

# Arrêter le service
stop_service() {
    log "🛑 Arrêt du service video-platform..."
    
    ssh_cmd "sudo systemctl stop video-platform || true"
    
    log "✅ Service arrêté"
}

# Sauvegarder .env existant
backup_env() {
    log "💾 Sauvegarde du fichier .env existant..."
    
    ssh_cmd "sudo cp /opt/video-platform/app/backend/.env /opt/video-platform/app/backend/.env.backup || true"
    
    log "✅ Sauvegarde effectuée"
}

# Déployer fichiers backend
deploy_backend() {
    log "📤 Déploiement des fichiers backend..."
    
    rsync_cmd \
        --exclude='node_modules' \
        --exclude='.env' \
        --exclude='.env.*' \
        --exclude='uploads' \
        --exclude='*.log' \
        --exclude='.git' \
        --exclude='.gitignore' \
        backend/ $LXC_USER@$LXC_IP:$APP_PATH/backend/
    
    log "✅ Fichiers déployés"
}

# Installer dépendances
install_dependencies() {
    log "📦 Installation des dépendances backend..."
    
    ssh_cmd << EOF
cd $APP_PATH/backend

# Utiliser npm ci si package-lock.json existe, sinon npm install
if [ -f package-lock.json ]; then
    echo "📦 Installation avec npm ci (package-lock.json trouvé)"
    npm ci --only=production || npm install --only=production
else
    echo "📦 Installation avec npm install (pas de package-lock.json)"
    npm install --only=production
fi

sudo chown -R videoplatform:videoplatform $APP_PATH/backend
EOF
    
    log "✅ Dépendances installées"
}

# Restaurer .env
restore_env() {
    log "🔄 Restauration du fichier .env..."
    
    ssh_cmd << EOF
if [ -f /opt/video-platform/app/backend/.env.backup ]; then
    sudo cp /opt/video-platform/app/backend/.env.backup /opt/video-platform/app/backend/.env
    sudo chown videoplatform:videoplatform /opt/video-platform/app/backend/.env
    sudo chmod 600 /opt/video-platform/app/backend/.env
    echo "✅ .env restauré"
else
    echo "⚠️ Aucun fichier .env de sauvegarde trouvé"
    echo "   Le fichier .env doit être créé manuellement ou via setup-backend-config.sh"
fi
EOF
    
    log "✅ Restauration .env terminée"
}

# Vérifier permissions
check_permissions() {
    log "🔒 Vérification des permissions..."
    
    ssh_cmd << EOF
sudo chown -R videoplatform:videoplatform /opt/video-platform/app
sudo chmod 600 /opt/video-platform/app/backend/.env || true

# Créer les dossiers nécessaires
sudo mkdir -p /opt/video-platform/{uploads,videos,thumbnails,logs}
sudo chown -R videoplatform:videoplatform /opt/video-platform/{uploads,videos,thumbnails,logs}
sudo chmod -R 775 /opt/video-platform/{uploads,videos,thumbnails,logs}
EOF
    
    log "✅ Permissions configurées"
}

# Démarrer services
start_services() {
    log "🚀 Démarrage des services..."
    
    # Démarrer MongoDB si nécessaire
    ssh_cmd "sudo systemctl start mongod || sudo systemctl start mongodb || true"
    sleep 2
    
    # Redémarrer le service application
    ssh_cmd << EOF
sudo systemctl daemon-reload
sudo systemctl start video-platform
sleep 3
EOF
    
    log "✅ Services démarrés"
}

# Vérifier santé API
health_check() {
    log "🏥 Vérification santé API..."
    
    sleep 5
    
    if ssh_cmd "curl -f http://localhost:5000/api/health >/dev/null 2>&1"; then
        log "✅ API backend opérationnelle"
        
        # Afficher la réponse de l'API
        API_RESPONSE=$(ssh_cmd "curl -s http://localhost:5000/api/health")
        info "Réponse API: $API_RESPONSE"
    else
        warning "⚠️ API backend ne répond pas immédiatement"
        warning "   Vérification des logs..."
        
        ssh_cmd "sudo systemctl status video-platform --no-pager || true"
        ssh_cmd "sudo journalctl -u video-platform -n 20 --no-pager || true"
    fi
}

# Afficher informations
show_info() {
    log "📋 Informations de déploiement :"
    echo ""
    info "🌐 API Backend: http://$LXC_IP:5000/api/health"
    info "📁 Chemin application: $APP_PATH/backend"
    echo ""
    info "🔧 Commandes utiles :"
    info "   Status: ssh -J $JUMP_HOST $LXC_USER@$LXC_IP 'sudo systemctl status video-platform'"
    info "   Logs: ssh -J $JUMP_HOST $LXC_USER@$LXC_IP 'journalctl -u video-platform -f'"
    info "   Restart: ssh -J $JUMP_HOST $LXC_USER@$LXC_IP 'sudo systemctl restart video-platform'"
}

# Fonction principale
main() {
    log "🚀 Démarrage du déploiement backend sur LXC..."
    
    check_prerequisites
    test_ssh_connection
    stop_service
    backup_env
    deploy_backend
    install_dependencies
    restore_env
    check_permissions
    start_services
    health_check
    show_info
    
    log "✅ Déploiement backend terminé avec succès !"
    log "📝 Prochaine étape : Build et déploiement frontend (Phase 3)"
}

# Exécution
main "$@"
