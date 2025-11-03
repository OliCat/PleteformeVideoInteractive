#!/bin/bash

# Script de configuration firewall LXC - Phase 1.5
# Usage: ./setup-firewall-lxc.sh [jump-host] [lxc-ip] [lxc-user] [public-server-ip]

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
PUBLIC_SERVER_IP=${4:-"<PUBLIC_SERVER_IP>"}
SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=no"

# Commande SSH avec jump host
ssh_cmd() {
    ssh $SSH_OPTS -J $JUMP_HOST $LXC_USER@$LXC_IP "$@"
}

# Vérifications préliminaires
check_prerequisites() {
    if [ -z "$JUMP_HOST" ] || [ -z "$LXC_IP" ]; then
        error "Jump host et IP LXC requis"
        echo "Usage: $0 <jump-host> <lxc-ip> [lxc-user] [public-server-ip]"
        exit 1
    fi
}

# Vérifier si UFW est installé
check_ufw() {
    log "🔍 Vérification UFW..."
    
    if ssh_cmd "command -v ufw >/dev/null 2>&1"; then
        log "✅ UFW installé"
    else
        log "📦 Installation UFW..."
        ssh_cmd "sudo apt-get update && sudo apt-get install -y ufw"
        log "✅ UFW installé"
    fi
}

# Configurer firewall
configure_firewall() {
    log "🔥 Configuration firewall..."
    
    ssh_cmd << EOF
# Vérifier l'état actuel
if sudo ufw status | grep -q "Status: active"; then
    echo "✅ UFW déjà actif"
else
    echo "🔄 Activation UFW..."
    sudo ufw --force reset
fi

# Règles par défaut
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH - autoriser depuis partout (ou restreindre si nécessaire)
sudo ufw allow ssh

# Port 5000 - uniquement depuis serveur public
echo "🔒 Autorisation port 5000 depuis $PUBLIC_SERVER_IP uniquement..."
sudo ufw allow from $PUBLIC_SERVER_IP to any port 5000 proto tcp comment 'Video Platform Backend'

# Activer firewall
sudo ufw --force enable

echo "✅ Firewall configuré"
EOF
    
    # Afficher les règles
    log "📋 Règles firewall actuelles :"
    ssh_cmd "sudo ufw status numbered"
}

# Afficher résumé
show_summary() {
    log "📋 Résumé de la configuration firewall :"
    echo ""
    info "✅ UFW activé"
    info "🔒 Port 5000 autorisé uniquement depuis : $PUBLIC_SERVER_IP"
    info "🔐 SSH autorisé"
    info "🚫 Toutes les autres connexions entrantes refusées par défaut"
    echo ""
    info "📝 Commandes utiles :"
    info "   Status: ssh -J $JUMP_HOST $LXC_USER@$LXC_IP 'sudo ufw status'"
    info "   Logs: ssh -J $JUMP_HOST $LXC_USER@$LXC_IP 'sudo tail -f /var/log/ufw.log'"
}

# Fonction principale
main() {
    log "🚀 Démarrage de la configuration firewall LXC..."
    
    check_prerequisites
    check_ufw
    configure_firewall
    show_summary
    
    log "✅ Configuration firewall terminée !"
    log "📝 Phase 1 terminée - Le LXC est maintenant prêt pour le déploiement"
}

# Exécution
main "$@"
