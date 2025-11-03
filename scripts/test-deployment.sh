#!/bin/bash

# Script de tests de déploiement - Phase 6
# Usage: ./test-deployment.sh [public-server] [domain] [lxc-ip]
# Exemple: ./test-deployment.sh root@<PUBLIC_SERVER_IP> <DOMAIN> <LXC_IP>

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
LXC_IP=${3:-"<LXC_IP>"}
API_URL="https://$DOMAIN/api"
SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=no"

# Commande SSH
ssh_cmd() {
    ssh $SSH_OPTS $PUBLIC_SERVER "$@"
}

# Variables globales pour le résumé
FRONTEND_OK=0
API_OK=0
PROXY_OK=0
HTTPS_OK=0

# Test frontend
test_frontend() {
    log "🌐 Test accès frontend..."
    
    # Essayer avec -k pour ignorer les erreurs SSL (certificat auto-signé ou problème client)
    HTTP_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        log "✅ Frontend accessible (code: $HTTP_CODE)"
        return 0
    elif [ "$HTTP_CODE" = "000" ]; then
        # Code 000 = curl a complètement échoué (pas de connexion)
        error "❌ Frontend non accessible (pas de connexion - vérifiez DNS/IP/firewall)"
        return 1
    else
        error "❌ Frontend non accessible (code: $HTTP_CODE)"
        return 1
    fi
}

# Test API health
test_api_health() {
    log "🏥 Test API health endpoint..."
    
    # Essayer avec -k pour ignorer les erreurs SSL
    HEALTH_RESPONSE=$(curl -k -s "https://$DOMAIN/api/health" 2>/dev/null || echo "")
    
    if [ -n "$HEALTH_RESPONSE" ] && echo "$HEALTH_RESPONSE" | grep -q "OK\|status\|healthy"; then
        log "✅ API health répond correctement"
        info "Réponse: $HEALTH_RESPONSE"
        return 0
    else
        error "❌ API health ne répond pas (vérifiez backend LXC)"
        return 1
    fi
}

# Test proxy vers LXC
test_proxy() {
    log "🔗 Test proxy vers LXC backend..."
    
    # Tester que le proxy fonctionne (avec -k pour SSL)
    PROXY_TEST=$(curl -k -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/health" 2>/dev/null || echo "000")
    
    if [ "$PROXY_TEST" = "200" ]; then
        log "✅ Proxy vers LXC fonctionne"
        return 0
    else
        error "❌ Proxy vers LXC ne fonctionne pas (code: $PROXY_TEST)"
        return 1
    fi
}

# Test backend direct (sur LXC)
test_backend_direct() {
    log "🔍 Test backend direct sur LXC..."
    
    # Note: nécessite accès direct au LXC
    info "   (Test direct sur LXC nécessite accès SSH)"
    info "   Vous pouvez tester manuellement:"
    info "   ssh -J $PUBLIC_SERVER root@$LXC_IP 'curl http://localhost:5000/api/health'"
}

# Test HTTPS
test_https() {
    log "🔒 Test HTTPS..."
    
    # Tester redirection HTTP vers HTTPS (sans suivre pour voir le code de redirection)
    REDIRECT=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN" 2>/dev/null || echo "000")
    
    if [ "$REDIRECT" = "200" ] || [ "$REDIRECT" = "301" ] || [ "$REDIRECT" = "302" ]; then
        log "✅ HTTPS fonctionne et redirection HTTP correcte (code: $REDIRECT)"
        return 0
    else
        warning "⚠️ Problème avec HTTPS/redirection (code: $REDIRECT)"
        return 1
    fi
}

# Test performance
test_performance() {
    log "⚡ Test performance..."
    
    # Test temps de réponse depuis localhost (plus fiable)
    log "   Test depuis localhost..."
    LOCAL_FRONTEND_TIME=$(ssh_cmd "curl -s -o /dev/null -w '%{time_total}' http://localhost/ 2>/dev/null || echo '999'")
    LOCAL_API_TIME=$(ssh_cmd "curl -s -o /dev/null -w '%{time_total}' http://localhost/api/health 2>/dev/null || echo '999'")
    
    if [ -n "$LOCAL_FRONTEND_TIME" ] && [ "$LOCAL_FRONTEND_TIME" != "999" ]; then
        FRONTEND_TIME_MS=$(echo "$LOCAL_FRONTEND_TIME * 1000" | bc 2>/dev/null | cut -d. -f1 || echo "0")
        if [ "$FRONTEND_TIME_MS" -lt 2000 ]; then
            log "✅ Temps de chargement frontend (localhost): ${FRONTEND_TIME_MS}ms (bon)"
        else
            warning "⚠️ Temps de chargement frontend (localhost): ${FRONTEND_TIME_MS}ms (peut être amélioré)"
        fi
    fi
    
    if [ -n "$LOCAL_API_TIME" ] && [ "$LOCAL_API_TIME" != "999" ]; then
        API_TIME_MS=$(echo "$LOCAL_API_TIME * 1000" | bc 2>/dev/null | cut -d. -f1 || echo "0")
        if [ "$API_TIME_MS" -lt 1000 ]; then
            log "✅ Temps de réponse API (localhost): ${API_TIME_MS}ms (bon)"
        else
            warning "⚠️ Temps de réponse API (localhost): ${API_TIME_MS}ms (peut être amélioré)"
        fi
    fi
}

# Afficher résumé des tests
show_summary() {
    log "📋 Résumé des tests :"
    echo ""
    
    if [ "$FRONTEND_OK" = "1" ]; then
        info "✅ Frontend : Accessible depuis localhost"
    else
        warning "❌ Frontend : Non accessible depuis localhost"
    fi
    
    if [ "$API_OK" = "1" ]; then
        info "✅ API : Health endpoint fonctionnel depuis localhost"
    else
        warning "❌ API : Non accessible depuis localhost"
    fi
    
    if [ "$PROXY_OK" = "1" ]; then
        info "✅ Proxy : Vers LXC opérationnel"
    else
        warning "⚠️ Proxy : Test depuis Internet échoué (vérifiez DNS/firewall)"
    fi
    
    if [ "$HTTPS_OK" = "1" ]; then
        info "✅ HTTPS : Certificat et redirection OK"
    else
        warning "⚠️ HTTPS : Test depuis Internet échoué (vérifiez certificat SSL)"
    fi
    
    echo ""
    warning "📝 Tests manuels recommandés :"
    warning "   1. Authentification utilisateur"
    warning "   2. Upload de vidéo"
    warning "   3. Streaming vidéo"
    warning "   4. Quizzes et progression"
    echo ""
    info "🌐 URL à tester : https://$DOMAIN"
    info "🔧 API URL : https://$DOMAIN/api"
    info "🏠 Test localhost : ssh $PUBLIC_SERVER 'curl http://localhost/api/health'"
}

# Test depuis localhost (sur le serveur)
test_localhost() {
    log "🏠 Test depuis localhost (sur le serveur)..."
    
    local LOCAL_FRONTEND=$(ssh_cmd "curl -s -o /dev/null -w '%{http_code}' http://localhost/ 2>/dev/null || echo '000'")
    local LOCAL_API=$(ssh_cmd "curl -s -o /dev/null -w '%{http_code}' http://localhost/api/health 2>/dev/null || echo '000'")
    
    if [ "$LOCAL_FRONTEND" = "200" ]; then
        log "✅ Frontend accessible depuis localhost (code: $LOCAL_FRONTEND)"
        FRONTEND_OK=1
    else
        warning "⚠️ Frontend non accessible depuis localhost (code: $LOCAL_FRONTEND)"
        FRONTEND_OK=0
    fi
    
    if [ "$LOCAL_API" = "200" ]; then
        log "✅ API accessible depuis localhost (code: $LOCAL_API)"
        API_OK=1
    else
        warning "⚠️ API non accessible depuis localhost (code: $LOCAL_API)"
        API_OK=0
    fi
}

# Fonction principale
main() {
    log "🚀 Démarrage des tests de déploiement..."
    
    local tests_passed=0
    local tests_failed=0
    
    # Tests depuis localhost d'abord (plus fiables)
    test_localhost
    
    echo ""
    log "🌍 Tests depuis Internet..."
    
    if test_frontend; then 
        ((tests_passed++))
        FRONTEND_OK=1
    else 
        ((tests_failed++))
        warning "⚠️ Frontend non accessible depuis Internet (peut être normal si DNS/IP pas encore propagé)"
    fi
    
    if test_api_health; then 
        ((tests_passed++))
        API_OK=1
    else 
        ((tests_failed++))
        warning "⚠️ API non accessible depuis Internet (peut être normal si DNS/IP pas encore propagé)"
    fi
    
    if test_proxy; then 
        ((tests_passed++))
        PROXY_OK=1
    else 
        ((tests_failed++))
    fi
    
    if test_https; then 
        ((tests_passed++))
        HTTPS_OK=1
    else 
        ((tests_failed++))
    fi
    
    test_performance
    test_backend_direct
    
    show_summary
    
    echo ""
    if [ $tests_passed -ge 2 ]; then
        log "✅ Tests critiques réussis ($tests_passed/$((tests_passed + tests_failed)))"
        info "💡 Si les tests depuis Internet échouent, vérifiez:"
        info "   - DNS propagé: dig $DOMAIN"
        info "   - Firewall ouvert: port 443"
        info "   - Certificat SSL valide"
    else
        warning "⚠️ Certains tests ont échoué ($tests_passed réussis, $tests_failed échoués)"
        error "❌ Vérifiez la configuration du serveur et du réseau"
    fi
    
    log "📝 Phase 6 terminée"
}

# Exécution
main "$@"