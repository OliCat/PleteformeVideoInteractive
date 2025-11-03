#!/bin/bash

# Script pour corriger les warnings SSL stapling dans Nginx
# Usage: ./fix-ssl-stapling-warnings.sh [public-server]
# Exemple: ./fix-ssl-stapling-warnings.sh root@<PUBLIC_SERVER_IP>

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
SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=no"
SSL_CONF="/etc/nginx/ssl.conf"

# Commande SSH
ssh_cmd() {
    ssh $SSH_OPTS $PUBLIC_SERVER "$@"
}

# Vérifier que le fichier ssl.conf existe
check_ssl_conf() {
    log "🔍 Vérification fichier ssl.conf..."
    
    if ssh_cmd "test -f $SSL_CONF"; then
        log "✅ Fichier $SSL_CONF trouvé"
        
        # Afficher la configuration actuelle
        info "Configuration actuelle :"
        ssh_cmd "grep -E 'ssl_stapling|ssl_stapling_verify|ssl_stapling_responder' $SSL_CONF || true"
    else
        error "❌ Fichier $SSL_CONF non trouvé"
        exit 1
    fi
}

# Corriger la configuration SSL stapling
fix_ssl_stapling() {
    log "🔧 Correction configuration SSL stapling..."
    
    ssh_cmd << 'EOF'
# Détecter si sudo existe
if command -v sudo >/dev/null 2>&1; then
    SUDO_CMD="sudo"
else
    SUDO_CMD=""
fi

SSL_CONF="/etc/nginx/ssl.conf"

# Sauvegarder le fichier original
$SUDO_CMD cp $SSL_CONF ${SSL_CONF}.backup-$(date +%Y%m%d-%H%M%S)
echo "✅ Sauvegarde créée : ${SSL_CONF}.backup-$(date +%Y%m%d-%H%M%S)"

# Option 1 : Désactiver complètement ssl_stapling pour éviter les warnings
# Les certificats ne supportent pas correctement OCSP, donc le stapling est ignoré de toute façon
if grep -q "^ssl_stapling on;" $SSL_CONF; then
    $SUDO_CMD sed -i 's/^ssl_stapling on;/ssl_stapling off;/' $SSL_CONF
    echo "✅ ssl_stapling désactivé"
elif grep -q "^ssl_stapling off;" $SSL_CONF; then
    echo "ℹ️ ssl_stapling est déjà désactivé"
else
    echo "⚠️ ssl_stapling non trouvé dans le fichier"
fi

# Désactiver également ssl_stapling_verify si présent
if grep -q "^ssl_stapling_verify on;" $SSL_CONF; then
    $SUDO_CMD sed -i 's/^ssl_stapling_verify on;/ssl_stapling_verify off;/' $SSL_CONF
    echo "✅ ssl_stapling_verify désactivé"
fi

# Commenter ssl_stapling_responder car il n'est plus nécessaire
if grep -q "^ssl_stapling_responder" $SSL_CONF; then
    $SUDO_CMD sed -i 's/^ssl_stapling_responder/#ssl_stapling_responder/' $SSL_CONF
    echo "✅ ssl_stapling_responder commenté"
fi

# Afficher la configuration modifiée
echo ""
echo "Configuration modifiée :"
grep -E 'ssl_stapling|ssl_stapling_verify|ssl_stapling_responder' $SSL_CONF || true
EOF
    
    log "✅ Configuration SSL stapling corrigée"
}

# Tester la configuration Nginx
test_nginx_config() {
    log "🧪 Test configuration Nginx..."
    
    # Détecter si sudo existe
    SUDO_CMD=$(ssh_cmd "command -v sudo >/dev/null 2>&1 && echo 'sudo' || echo ''")
    
    if ssh_cmd "$SUDO_CMD nginx -t 2>&1"; then
        log "✅ Configuration Nginx valide"
        
        # Afficher les warnings restants (s'il y en a)
        WARNINGS=$(ssh_cmd "$SUDO_CMD nginx -t 2>&1 | grep -i warning || true")
        if [ -n "$WARNINGS" ]; then
            warning "⚠️ Warnings restants :"
            echo "$WARNINGS"
        else
            log "✅ Aucun warning détecté"
        fi
    else
        error "❌ Configuration Nginx invalide"
        error "   Vérifiez les erreurs ci-dessus"
        exit 1
    fi
}

# Recharger Nginx (optionnel)
reload_nginx() {
    log "🔄 Rechargement Nginx..."
    
    # Demander confirmation
    read -p "Recharger Nginx maintenant ? (O/n): " RELOAD
    if [[ ! $RELOAD =~ ^[Nn]$ ]]; then
        # Détecter si sudo existe
        SUDO_CMD=$(ssh_cmd "command -v sudo >/dev/null 2>&1 && echo 'sudo' || echo ''")
        
        ssh_cmd "$SUDO_CMD systemctl reload nginx"
        
        sleep 2
        
        if ssh_cmd "systemctl is-active --quiet nginx"; then
            log "✅ Nginx rechargé et actif"
        else
            error "❌ Erreur lors du rechargement de Nginx"
            ssh_cmd "$SUDO_CMD systemctl status nginx --no-pager || true"
            exit 1
        fi
    else
        info "ℹ️ Rechargement Nginx ignoré (relancez manuellement si nécessaire)"
    fi
}

# Afficher informations
show_info() {
    log "📋 Informations :"
    echo ""
    info "📁 Fichier modifié : $SSL_CONF"
    info "📁 Sauvegarde : ${SSL_CONF}.backup-*"
    echo ""
    info "🔧 Solution appliquée :"
    info "   ssl_stapling désactivé pour éviter les warnings OCSP"
    info "   ssl_stapling_verify désactivé"
    info "   ssl_stapling_responder commenté"
    echo ""
    info "💡 Note : Ces certificats ne supportent pas correctement OCSP,"
    info "   donc le stapling était ignoré de toute façon et n'apportait aucun bénéfice"
    echo ""
    info "🔄 Pour recharger Nginx :"
    info "   ssh $PUBLIC_SERVER 'sudo systemctl reload nginx'"
}

# Fonction principale
main() {
    log "🚀 Démarrage de la correction des warnings SSL stapling..."
    echo ""
    
    check_ssl_conf
    echo ""
    fix_ssl_stapling
    echo ""
    test_nginx_config
    echo ""
    reload_nginx
    echo ""
    show_info
    
    log "✅ Correction terminée avec succès !"
}

# Exécution
main "$@"

