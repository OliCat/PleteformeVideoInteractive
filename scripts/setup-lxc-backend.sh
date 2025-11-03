#!/bin/bash

# Script de préparation du LXC backend - Phase 1
# Usage: ./setup-lxc-backend.sh [jump-host] [lxc-ip] [lxc-user]

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
    log "🔍 Vérification des prérequis..."
    
    if [ -z "$JUMP_HOST" ] || [ -z "$LXC_IP" ]; then
        error "Jump host et IP LXC requis"
        echo "Usage: $0 <jump-host> <lxc-ip> [lxc-user]"
        echo "Exemple: $0 root@<PUBLIC_SERVER_IP> <LXC_IP> root"
        exit 1
    fi
    
    log "✅ Prérequis vérifiés"
}

# Test de connexion SSH
test_ssh_connection() {
    log "🔗 Test de connexion SSH via jump host..."
    
    if ssh_cmd exit 2>/dev/null; then
        log "✅ Connexion SSH OK via $JUMP_HOST vers $LXC_IP"
    else
        error "❌ Connexion SSH échouée"
        exit 1
    fi
}

# Vérification Node.js
check_nodejs() {
    log "📦 Vérification Node.js..."
    
    if ssh_cmd "command -v node >/dev/null 2>&1"; then
        NODE_VERSION=$(ssh_cmd "node --version")
        log "✅ Node.js installé : $NODE_VERSION"
    else
        error "❌ Node.js non trouvé. Veuillez l'installer d'abord."
        exit 1
    fi
}

# Vérification MongoDB
check_mongodb() {
    log "📦 Vérification MongoDB..."
    
    if ssh_cmd "systemctl is-active --quiet mongod 2>/dev/null || systemctl is-active --quiet mongodb 2>/dev/null"; then
        log "✅ MongoDB est actif"
    elif ssh_cmd "command -v mongod >/dev/null 2>&1 || command -v mongodb >/dev/null 2>&1"; then
        warning "⚠️ MongoDB installé mais non actif"
    else
        error "❌ MongoDB non trouvé. Veuillez l'installer d'abord."
        exit 1
    fi
}

# Installation FFmpeg
install_ffmpeg() {
    log "📦 Vérification/Installation FFmpeg..."
    
    if ssh_cmd "command -v ffmpeg >/dev/null 2>&1"; then
        FFMPEG_VERSION=$(ssh_cmd "ffmpeg -version | head -n 1")
        log "✅ FFmpeg déjà installé : $FFMPEG_VERSION"
    else
        log "📥 Installation FFmpeg..."
        ssh_cmd "sudo apt-get update && sudo apt-get install -y ffmpeg"
        log "✅ FFmpeg installé"
    fi
}

# Nettoyer fichier sudoers invalide s'il existe
cleanup_invalid_sudoers() {
    log "🧹 Vérification fichier sudoers invalide..."
    
    if ssh_cmd "test -f /etc/sudoers.d/video-platform"; then
        log "⚠️ Fichier sudoers video-platform trouvé, vérification..."
        
        # Vérifier si le fichier est invalide (visudo -c retourne code non-zéro si erreur)
        if ! ssh_cmd "sudo visudo -c -f /etc/sudoers.d/video-platform >/dev/null 2>&1"; then
            warning "⚠️ Fichier sudoers invalide détecté, suppression..."
            ssh_cmd "sudo rm -f /etc/sudoers.d/video-platform"
            log "✅ Fichier sudoers invalide supprimé"
        else
            log "✅ Fichier sudoers valide"
        fi
    else
        log "✅ Aucun fichier sudoers à nettoyer"
    fi
}

# Création utilisateur système
create_user() {
    log "👤 Création utilisateur videoplatform..."
    
    if ssh_cmd "id videoplatform >/dev/null 2>&1"; then
        log "✅ Utilisateur videoplatform existe déjà"
    else
        log "📝 Création de l'utilisateur..."
        ssh_cmd "sudo useradd -r -s /bin/bash -m -d /home/videoplatform videoplatform || sudo useradd -r -s /bin/bash videoplatform"
        log "✅ Utilisateur videoplatform créé"
    fi
}

# Configuration structure de dossiers
setup_directories() {
    log "📁 Configuration structure de dossiers..."
    
    ssh_cmd << 'EOF'
sudo mkdir -p /opt/video-platform/{app/{backend,frontend},uploads,videos,thumbnails,logs}
sudo chown -R videoplatform:videoplatform /opt/video-platform
sudo chmod -R 755 /opt/video-platform
sudo chmod -R 775 /opt/video-platform/{uploads,videos,thumbnails,logs}
EOF
    
    log "✅ Structure de dossiers créée"
}

# Affichage résumé
show_summary() {
    log "📋 Résumé de la configuration LXC :"
    echo ""
    info "📁 Dossiers créés :"
    info "   /opt/video-platform/app/backend"
    info "   /opt/video-platform/app/frontend"
    info "   /opt/video-platform/uploads"
    info "   /opt/video-platform/videos"
    info "   /opt/video-platform/thumbnails"
    info "   /opt/video-platform/logs"
    echo ""
    info "👤 Utilisateur : videoplatform"
    info "🔧 Node.js : $(ssh_cmd 'node --version')"
    info "📦 MongoDB : $(ssh_cmd 'mongod --version 2>/dev/null | head -n 1 || echo "Installé"')"
    info "🎬 FFmpeg : $(ssh_cmd 'ffmpeg -version 2>/dev/null | head -n 1 | cut -d" " -f3 || echo "Installé"')"
}

# Fonction principale
main() {
    log "🚀 Démarrage de la préparation du LXC backend..."
    
    check_prerequisites
    test_ssh_connection
    cleanup_invalid_sudoers
    check_nodejs
    check_mongodb
    install_ffmpeg
    create_user
    setup_directories
    show_summary
    
    log "✅ Préparation LXC terminée avec succès !"
    log "📝 Prochaine étape : Configuration MongoDB (Phase 1.2)"
}

# Exécution
main "$@"
