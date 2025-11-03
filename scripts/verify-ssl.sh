#!/bin/bash

# Script de vérification SSL - Phase 5
# Usage: ./verify-ssl.sh [public-server] [domain]
# Exemple: ./verify-ssl.sh root@<PUBLIC_SERVER_IP> <DOMAIN>

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
DOMAIN=${2:-"<DOMAIN>"}
SSL_CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=no"

# Commande SSH
ssh_cmd() {
    ssh $SSH_OPTS $PUBLIC_SERVER "$@"
}

# Vérifier certificat
check_certificate() {
    log "🔒 Vérification certificat SSL..."
    
    if ssh_cmd "test -f $SSL_CERT_PATH/fullchain.pem"; then
        log "✅ Certificat trouvé : $SSL_CERT_PATH/fullchain.pem"
        
        # Afficher informations certificat
        CERT_INFO=$(ssh_cmd "openssl x509 -in $SSL_CERT_PATH/fullchain.pem -noout -subject -issuer -dates 2>/dev/null")
        info "$CERT_INFO"
        
        # Vérifier date d'expiration
        EXPIRY_DATE=$(ssh_cmd "openssl x509 -in $SSL_CERT_PATH/fullchain.pem -noout -enddate 2>/dev/null | cut -d= -f2")
        EXPIRY_EPOCH=$(ssh_cmd "date -d '$EXPIRY_DATE' +%s 2>/dev/null || date -j -f '%b %d %H:%M:%S %Y' '$EXPIRY_DATE' +%s 2>/dev/null")
        CURRENT_EPOCH=$(ssh_cmd "date +%s")
        DAYS_LEFT=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))
        
        if [ $DAYS_LEFT -gt 30 ]; then
            log "✅ Certificat valide encore ${DAYS_LEFT} jours"
        else
            warning "⚠️ Certificat expire dans ${DAYS_LEFT} jours"
        fi
    else
        error "❌ Certificat non trouvé dans $SSL_CERT_PATH"
        exit 1
    fi
}

# Vérifier configuration certbot
check_certbot() {
    log "🔍 Vérification configuration certbot..."
    
    if ssh_cmd "command -v certbot >/dev/null 2>&1"; then
        log "✅ Certbot installé"
        
        # Vérifier auto-renewal
        if ssh_cmd "systemctl list-timers | grep -q certbot"; then
            log "✅ Auto-renewal certbot configuré"
        else
            warning "⚠️ Auto-renewal certbot non trouvé dans les timers"
            info "   Vérifiez: sudo systemctl list-timers | grep certbot"
        fi
    else
        warning "⚠️ Certbot non installé"
    fi
}

# Tester connexion HTTPS
test_https() {
    log "🌐 Test connexion HTTPS..."
    
    sleep 2
    
    if ssh_cmd "curl -k -I https://$DOMAIN 2>/dev/null | head -n 1"; then
        HTTP_STATUS=$(ssh_cmd "curl -k -s -o /dev/null -w '%{http_code}' https://$DOMAIN 2>/dev/null")
        
        if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
            log "✅ HTTPS fonctionne (code: $HTTP_STATUS)"
        else
            warning "⚠️ HTTPS répond avec code: $HTTP_STATUS"
        fi
    else
        error "❌ Connexion HTTPS échouée"
        exit 1
    fi
}

# Vérifier configuration Nginx SSL
check_nginx_ssl() {
    log "📋 Vérification configuration Nginx SSL..."
    
    if ssh_cmd "grep -q 'ssl_certificate $SSL_CERT_PATH' /etc/nginx/sites-available/video-platform"; then
        log "✅ Configuration SSL trouvée dans Nginx"
    else
        warning "⚠️ Configuration SSL non trouvée dans Nginx"
        warning "   Vérifiez que configure-nginx-public.sh a été exécuté"
    fi
}

# Afficher résumé
show_summary() {
    log "📋 Résumé de la vérification SSL :"
    echo ""
    info "🌐 Domaine : $DOMAIN"
    info "🔒 Certificat : $SSL_CERT_PATH"
    info "✅ HTTPS accessible"
    echo ""
    info "📝 Commandes utiles :"
    info "   Vérifier cert: ssh $PUBLIC_SERVER 'sudo certbot certificates'"
    info "   Tester renewal: ssh $PUBLIC_SERVER 'sudo certbot renew --dry-run'"
    info "   Logs certbot: ssh $PUBLIC_SERVER 'sudo tail -f /var/log/letsencrypt/letsencrypt.log'"
}

# Fonction principale
main() {
    log "🚀 Démarrage de la vérification SSL..."
    
    check_certificate
    check_certbot
    check_nginx_ssl
    test_https
    show_summary
    
    log "✅ Vérification SSL terminée avec succès !"
}

# Exécution
main "$@"
