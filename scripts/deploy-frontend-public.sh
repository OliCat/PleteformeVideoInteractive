#!/bin/bash

# Script de déploiement frontend sur serveur public - Phase 3.2
# Usage: ./deploy-frontend-public.sh [public-server] [target-dir]
# Exemple: ./deploy-frontend-public.sh root@<PUBLIC_SERVER_IP> /var/www/video-platform

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
PUBLIC_SERVER=${1:-"root@<PUBLIC_SERVER_IP>"}
TARGET_DIR=${2:-"/var/www/video-platform"}
SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=no"

# Commande SSH
ssh_cmd() {
    ssh $SSH_OPTS $PUBLIC_SERVER "$@"
}

# Commande rsync
rsync_cmd() {
    rsync -avz --delete -e "ssh $SSH_OPTS" "$@"
}

# Vérifications préliminaires
check_prerequisites() {
    log "🔍 Vérification des prérequis..."
    
    if [ ! -d "frontend/build" ]; then
        error "❌ Dossier frontend/build non trouvé"
        error "   Exécutez d'abord: ./build-frontend.sh"
        exit 1
    fi
    
    if [ ! -f "frontend/build/index.html" ]; then
        error "❌ index.html non trouvé dans frontend/build/"
        error "   Le build semble incomplet"
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

# Créer dossier cible
create_target_directory() {
    log "📁 Création du dossier cible..."
    
    ssh_cmd << EOF
# Détecter si sudo existe
if command -v sudo >/dev/null 2>&1; then
    SUDO_CMD="sudo"
else
    SUDO_CMD=""
fi

\$SUDO_CMD mkdir -p $TARGET_DIR
\$SUDO_CMD chown -R www-data:www-data $TARGET_DIR 2>/dev/null || \$SUDO_CMD chown -R root:root $TARGET_DIR
EOF
    
    log "✅ Dossier créé : $TARGET_DIR"
}

# Déployer fichiers frontend
deploy_frontend() {
    log "📤 Déploiement des fichiers frontend..."
    
    rsync_cmd \
        frontend/build/ $PUBLIC_SERVER:$TARGET_DIR/
    
    log "✅ Fichiers déployés"
}

# Configurer permissions
set_permissions() {
    log "🔒 Configuration des permissions..."
    
    ssh_cmd << EOF
# Détecter si sudo existe
if command -v sudo >/dev/null 2>&1; then
    SUDO_CMD="sudo"
else
    SUDO_CMD=""
fi

\$SUDO_CMD chown -R www-data:www-data $TARGET_DIR 2>/dev/null || \$SUDO_CMD chown -R root:root $TARGET_DIR
\$SUDO_CMD find $TARGET_DIR -type d -exec chmod 755 {} \;
\$SUDO_CMD find $TARGET_DIR -type f -exec chmod 644 {} \;
EOF
    
    log "✅ Permissions configurées"
}

# Vérifier déploiement
verify_deployment() {
    log "🔍 Vérification du déploiement..."
    
    if ssh_cmd "test -f $TARGET_DIR/index.html"; then
        log "✅ index.html trouvé"
        
        # Compter les fichiers
        FILE_COUNT=$(ssh_cmd "find $TARGET_DIR -type f | wc -l")
        info "📦 Nombre de fichiers déployés : $FILE_COUNT"
    else
        error "❌ index.html non trouvé après déploiement"
        exit 1
    fi
    
    # Lister les fichiers principaux
    info "📋 Fichiers principaux :"
    ssh_cmd "ls -lh $TARGET_DIR/ | head -10"
}

# Afficher informations
show_info() {
    log "📋 Informations de déploiement :"
    echo ""
    info "📁 Dossier : $TARGET_DIR"
    info "🌐 URL : https://<DOMAIN>"
    echo ""
    info "🔧 Commandes utiles :"
    info "   Lister fichiers: ssh $PUBLIC_SERVER 'ls -lh $TARGET_DIR/'"
    info "   Vérifier permissions: ssh $PUBLIC_SERVER 'ls -ld $TARGET_DIR'"
}

# Fonction principale
main() {
    log "🚀 Démarrage du déploiement frontend sur serveur public..."
    
    check_prerequisites
    test_ssh_connection
    create_target_directory
    deploy_frontend
    set_permissions
    verify_deployment
    show_info
    
    log "✅ Déploiement frontend terminé avec succès !"
    log "📝 Prochaine étape : Configuration Nginx (Phase 4)"
}

# Exécution
main "$@"
