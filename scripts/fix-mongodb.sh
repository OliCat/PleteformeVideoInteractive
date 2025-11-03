#!/bin/bash

# Script de réparation MongoDB
# Usage: ./fix-mongodb.sh [jump-host] [lxc-ip] [lxc-user]
# Exemple: ./fix-mongodb.sh root@<PUBLIC_SERVER_IP> <LXC_IP> root

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
SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=no"

# Commande SSH avec jump host
ssh_cmd() {
    ssh $SSH_OPTS -J $JUMP_HOST $LXC_USER@$LXC_IP "$@"
}

# Vérifications préliminaires
check_prerequisites() {
    if [ -z "$JUMP_HOST" ] || [ -z "$LXC_IP" ]; then
        error "Jump host et IP LXC requis"
        echo "Usage: $0 <jump-host> <lxc-ip> [lxc-user]"
        exit 1
    fi
}

# Diagnostiquer le problème
diagnose() {
    log "🔍 Diagnostic MongoDB..."
    
    # Vérifier le statut
    STATUS=$(ssh_cmd "sudo systemctl status mongod 2>/dev/null || sudo systemctl status mongodb 2>/dev/null || echo 'not-found'")
    info "Statut: $STATUS"
    
    # Vérifier les logs
    log "📋 Dernières lignes des logs MongoDB:"
    ssh_cmd "sudo journalctl -u mongod -n 20 --no-pager 2>/dev/null || sudo journalctl -u mongodb -n 20 --no-pager 2>/dev/null || echo 'Aucun log trouvé'"
    
    # Vérifier le fichier de configuration
    MONGO_CONF=$(ssh_cmd "test -f /etc/mongod.conf && echo /etc/mongod.conf || echo /etc/mongodb.conf")
    log "📄 Fichier de configuration: $MONGO_CONF"
    
    # Afficher la configuration
    log "📋 Configuration actuelle:"
    ssh_cmd "sudo cat $MONGO_CONF | grep -A 5 -B 5 'security\|bindIp\|authorization' || echo 'Configuration non trouvée'"
}

# Réparer la configuration
fix_config() {
    log "🔧 Réparation de la configuration MongoDB..."
    
    MONGO_CONF=$(ssh_cmd "test -f /etc/mongod.conf && echo /etc/mongod.conf || echo /etc/mongodb.conf")
    
    # Restaurer une configuration de base valide
    ssh_cmd << EOF
# Sauvegarder l'ancienne config
sudo cp $MONGO_CONF ${MONGO_CONF}.backup.$(date +%Y%m%d_%H%M%S)

# Réparer la configuration
sudo sed -i 's/^  # authorization: enabled/  authorization: enabled/' $MONGO_CONF || true
sudo sed -i '/^  # authorization: enabled/d' $MONGO_CONF || true

# S'assurer que bindIp est correct
if ! sudo grep -q "^  bindIp:" $MONGO_CONF 2>/dev/null; then
    # Ajouter bindIp si absent
    sudo sed -i '/^net:/a\  bindIp: 127.0.0.1' $MONGO_CONF || true
elif ! sudo grep -q "bindIp: 127.0.0.1" $MONGO_CONF; then
    # Corriger bindIp
    sudo sed -i 's/^  bindIp:.*/  bindIp: 127.0.0.1/' $MONGO_CONF || true
fi

# S'assurer que security est correct
if sudo grep -q "^security:" $MONGO_CONF; then
    if ! sudo grep -q "authorization: enabled" $MONGO_CONF; then
        # Ajouter authorization si security existe mais pas authorization
        sudo sed -i '/^security:/a\  authorization: enabled' $MONGO_CONF || true
    fi
fi

echo "✅ Configuration réparée"
EOF
}

# Tester la configuration
test_config() {
    log "🧪 Test de la configuration..."
    
    if ssh_cmd "sudo mongod --config /etc/mongod.conf --test 2>/dev/null || sudo mongod --config /etc/mongodb.conf --test 2>/dev/null"; then
        log "✅ Configuration valide"
        return 0
    else
        warning "⚠️ Configuration peut avoir des erreurs"
        return 1
    fi
}

# Démarrer MongoDB
start_mongodb() {
    log "🚀 Démarrage de MongoDB..."
    
    # Détecter le service
    if ssh_cmd "systemctl list-unit-files | grep -q mongod"; then
        MONGO_SERVICE="mongod"
    else
        MONGO_SERVICE="mongodb"
    fi
    
    # Démarrer
    ssh_cmd "sudo systemctl start $MONGO_SERVICE || true"
    
    # Attendre que MongoDB soit prêt
    log "⏳ Attente que MongoDB démarre (max 30 secondes)..."
    for i in {1..30}; do
        if ssh_cmd "mongosh --quiet --eval \"db.adminCommand('ping').ok\" >/dev/null 2>&1"; then
            log "✅ MongoDB démarré et prêt"
            return 0
        fi
        sleep 1
    done
    
    error "❌ MongoDB n'a pas démarré dans les 30 secondes"
    log "📋 Logs d'erreur:"
    ssh_cmd "sudo journalctl -u $MONGO_SERVICE -n 30 --no-pager 2>/dev/null || true"
    return 1
}

# Afficher informations
show_info() {
    log "📋 Informations MongoDB:"
    
    MONGO_SERVICE=$(ssh_cmd "systemctl list-unit-files | grep -q mongod && echo mongod || echo mongodb")
    MONGO_CONF=$(ssh_cmd "test -f /etc/mongod.conf && echo /etc/mongod.conf || echo /etc/mongodb.conf")
    
    info "Service: $MONGO_SERVICE"
    info "Configuration: $MONGO_CONF"
    info "Statut: $(ssh_cmd "systemctl is-active $MONGO_SERVICE 2>/dev/null || echo 'inactif'")"
    
    if ssh_cmd "mongosh --quiet --eval \"db.adminCommand('ping').ok\" >/dev/null 2>&1"; then
        info "Connexion: ✅ OK"
    else
        warning "Connexion: ❌ ÉCHEC"
    fi
}

# Fonction principale
main() {
    log "🚀 Réparation MongoDB..."
    
    check_prerequisites
    diagnose
    fix_config
    
    if test_config; then
        start_mongodb
        show_info
    else
        error "❌ Impossible de réparer automatiquement"
        warning "⚠️ Veuillez vérifier manuellement la configuration:"
        warning "   ssh -J $JUMP_HOST $LXC_USER@$LXC_IP 'sudo cat $MONGO_CONF'"
    fi
    
    log "✅ Réparation terminée"
}

# Exécution
main "$@"
