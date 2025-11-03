#!/bin/bash

# Script principal de déploiement production
# Orchestre toutes les phases du déploiement
# Usage: ./deploy-production.sh

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Fonctions utilitaires
log() { echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"; }
warning() { echo -e "${YELLOW}[WARNING] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}" >&2; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }
step() { echo -e "${CYAN}════════════════════════════════════════${NC}"; echo -e "${CYAN}$1${NC}"; echo -e "${CYAN}════════════════════════════════════════${NC}"; }

# Configuration par défaut
# ⚠️ IMPORTANT : Modifiez ces valeurs selon votre infrastructure
# OU passez-les en paramètres d'environnement :
#   JUMP_HOST, LXC_IP, LXC_USER, PUBLIC_SERVER, DOMAIN
JUMP_HOST="${JUMP_HOST:-root@<PUBLIC_SERVER_IP>}"
LXC_IP="${LXC_IP:-<LXC_IP>}"
LXC_USER="${LXC_USER:-root}"
PUBLIC_SERVER="${PUBLIC_SERVER:-root@<PUBLIC_SERVER_IP>}"
DOMAIN="${DOMAIN:-<DOMAIN>}"

# Vérifier qu'on est à la racine du projet
if [ ! -f "package.json" ]; then
    error "❌ Ce script doit être exécuté depuis la racine du projet"
    exit 1
fi

# Afficher menu
show_menu() {
    clear
    step "🚀 DÉPLOIEMENT PRODUCTION - Plateforme Vidéo Interactive"
    echo ""
    info "Configuration:"
    info "  Jump Host: $JUMP_HOST"
    info "  LXC IP: $LXC_IP"
    info "  LXC User: $LXC_USER"
    info "  Public Server: $PUBLIC_SERVER"
    info "  Domain: $DOMAIN"
    echo ""
    echo "Choisissez une option:"
    echo "  1) Phase 1: Préparation LXC Backend (1.1-1.5)"
    echo "  2) Phase 1.1: Prérequis système LXC uniquement"
    echo "  3) Phase 1.2: Configuration MongoDB"
    echo "  4) Phase 1.3-1.4: Configuration backend (.env + systemd)"
    echo "  5) Phase 1.5: Configuration firewall LXC"
    echo ""
    echo "  6) Phase 2: Déploiement backend sur LXC"
    echo ""
    echo "  7) Phase 3.1: Build frontend production"
    echo "  8) Phase 3.2: Déploiement frontend sur serveur public"
    echo ""
    echo "  9) Phase 4: Configuration Nginx serveur public"
    echo " 10) Phase 5: Vérification SSL"
    echo " 11) Phase 6: Tests de déploiement"
    echo " 12) Phase 7: Configuration monitoring"
    echo ""
    echo " 13) DÉPLOIEMENT COMPLET (toutes les phases)"
    echo ""
    echo "  0) Quitter"
    echo ""
    read -p "Votre choix [0-13]: " choice
    echo ""
}

# Phase 1 complète
phase_1_complete() {
    step "PHASE 1: Préparation LXC Backend"
    
    log "Phase 1.1: Prérequis système LXC..."
    ./scripts/setup-lxc-backend.sh "$JUMP_HOST" "$LXC_IP" "$LXC_USER"
    
    log "Phase 1.2: Configuration MongoDB..."
    read -p "Mot de passe MongoDB admin (laisser vide si non configuré): " MONGO_ADMIN_PWD
    ./scripts/setup-mongodb.sh "$JUMP_HOST" "$LXC_IP" "$LXC_USER" "$MONGO_ADMIN_PWD"
    
    log "Phase 1.3-1.4: Configuration backend..."
    MONGODB_URI=$(ssh -J "$JUMP_HOST" "$LXC_USER@$LXC_IP" "cat /tmp/mongodb_uri.txt 2>/dev/null | grep MONGODB_URI | cut -d= -f2" || echo "")
    
    if [ -z "$MONGODB_URI" ]; then
        read -p "MongoDB URI (format: mongodb://user:pass@localhost:27017/video-platform): " MONGODB_URI
    fi
    
    read -p "JWT Secret (laisser vide pour générer automatiquement): " JWT_SECRET
    
    ./scripts/setup-backend-config.sh "$JUMP_HOST" "$LXC_IP" "$LXC_USER" "$MONGODB_URI" "$JWT_SECRET"
    
    log "Phase 1.5: Configuration firewall..."
    ./scripts/setup-firewall-lxc.sh "$JUMP_HOST" "$LXC_IP" "$LXC_USER" "<PUBLIC_SERVER_IP>"
    
    log "✅ Phase 1 terminée"
}

# Déploiement complet
deploy_complete() {
    step "🚀 DÉPLOIEMENT COMPLET"
    
    warning "⚠️ Ce processus va déployer l'application en production"
    warning "   Assurez-vous d'avoir:"
    warning "   - Accès SSH au jump host et au LXC"
    warning "   - Accès SSH au serveur public"
    warning "   - Certificat SSL déjà configuré"
    echo ""
    read -p "Continuer ? (o/N): " confirm
    if [[ ! $confirm =~ ^[Oo]$ ]]; then
        log "❌ Déploiement annulé"
        exit 0
    fi
    
    phase_1_complete
    
    step "PHASE 2: Déploiement backend sur LXC"
    ./scripts/deploy-backend-lxc.sh "$JUMP_HOST" "$LXC_IP" "$LXC_USER"
    
    step "PHASE 3: Build et déploiement frontend"
    log "Phase 3.1: Build frontend..."
    ./scripts/build-frontend.sh
    
    log "Phase 3.2: Déploiement frontend..."
    ./scripts/deploy-frontend-public.sh "$PUBLIC_SERVER" "/var/www/video-platform"
    
    step "PHASE 4: Configuration Nginx"
    ./scripts/configure-nginx-public.sh "$PUBLIC_SERVER" "$LXC_IP" "$DOMAIN"
    
    step "PHASE 5: Vérification SSL"
    ./scripts/verify-ssl.sh "$PUBLIC_SERVER" "$DOMAIN"
    
    step "PHASE 6: Tests de déploiement"
    ./scripts/test-deployment.sh "$PUBLIC_SERVER" "$DOMAIN" "$LXC_IP"
    
    step "PHASE 7: Configuration monitoring"
    ./scripts/setup-monitoring.sh "$JUMP_HOST" "$LXC_IP" "$LXC_USER" "$PUBLIC_SERVER"
    
    step "✅ DÉPLOIEMENT TERMINÉ"
    echo ""
    log "🎉 Votre application est maintenant en production !"
    echo ""
    info "🌐 URL: https://$DOMAIN"
    info "🔧 API: https://$DOMAIN/api"
    info "📊 Health: https://$DOMAIN/api/health"
    echo ""
}

# Menu principal
main() {
    while true; do
        show_menu
        
        case $choice in
            1)
                phase_1_complete
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            2)
                ./scripts/setup-lxc-backend.sh "$JUMP_HOST" "$LXC_IP" "$LXC_USER"
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            3)
                read -p "Mot de passe MongoDB admin (laisser vide si non configuré): " MONGO_ADMIN_PWD
                ./scripts/setup-mongodb.sh "$JUMP_HOST" "$LXC_IP" "$LXC_USER" "$MONGO_ADMIN_PWD"
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            4)
                read -p "MongoDB URI: " MONGODB_URI
                read -p "JWT Secret (laisser vide pour générer): " JWT_SECRET
                ./scripts/setup-backend-config.sh "$JUMP_HOST" "$LXC_IP" "$LXC_USER" "$MONGODB_URI" "$JWT_SECRET"
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            5)
                ./scripts/setup-firewall-lxc.sh "$JUMP_HOST" "$LXC_IP" "$LXC_USER" "<PUBLIC_SERVER_IP>"
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            6)
                ./scripts/deploy-backend-lxc.sh "$JUMP_HOST" "$LXC_IP" "$LXC_USER"
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            7)
                ./scripts/build-frontend.sh
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            8)
                ./scripts/deploy-frontend-public.sh "$PUBLIC_SERVER" "/var/www/video-platform"
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            9)
                ./scripts/configure-nginx-public.sh "$PUBLIC_SERVER" "$LXC_IP" "$DOMAIN"
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            10)
                ./scripts/verify-ssl.sh "$PUBLIC_SERVER" "$DOMAIN"
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            11)
                ./scripts/test-deployment.sh "$PUBLIC_SERVER" "$DOMAIN" "$LXC_IP"
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            12)
                ./scripts/setup-monitoring.sh "$JUMP_HOST" "$LXC_IP" "$LXC_USER" "$PUBLIC_SERVER"
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            13)
                deploy_complete
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
            0)
                log "👋 Au revoir !"
                exit 0
                ;;
            *)
                error "❌ Option invalide"
                read -p "Appuyez sur Entrée pour continuer..."
                ;;
        esac
    done
}

# Exécution
main "$@"
