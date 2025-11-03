#!/bin/bash

# Script de build frontend production - Phase 3.1
# Usage: ./build-frontend.sh
# Crée le fichier .env.production et build le frontend

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
FRONTEND_URL="https://<DOMAIN>"
API_URL="$FRONTEND_URL/api"

# Vérifications préliminaires
check_prerequisites() {
    log "🔍 Vérification des prérequis..."
    
    if [ ! -d "frontend" ]; then
        error "❌ Dossier frontend non trouvé. Exécutez depuis la racine du projet."
        exit 1
    fi
    
    if [ ! -f "frontend/package.json" ]; then
        error "❌ package.json non trouvé dans frontend/"
        exit 1
    fi
    
    if ! command -v npm >/dev/null 2>&1; then
        error "❌ npm non installé"
        exit 1
    fi
    
    log "✅ Prérequis vérifiés"
}

# Créer fichier .env.production
create_env_production() {
    log "📝 Création fichier .env.production..."
    
    cd frontend
    
    cat > .env.production << EOF
REACT_APP_API_URL=$API_URL
EOF
    
    log "✅ Fichier .env.production créé :"
    info "   REACT_APP_API_URL=$API_URL"
    
    cd ..
}

# Installer dépendances
install_dependencies() {
    log "📦 Installation des dépendances frontend..."
    
    cd frontend
    
    if [ ! -d "node_modules" ]; then
        log "📥 Installation npm..."
        npm install
    else
        log "✅ Dépendances déjà installées"
    fi
    
    cd ..
}

# Build frontend
build_frontend() {
    log "🔨 Build du frontend en mode production..."
    
    cd frontend
    
    # Nettoyer le build précédent
    if [ -d "build" ]; then
        log "🧹 Nettoyage du build précédent..."
        rm -rf build
    fi
    
    # Build
    log "🏗️  Compilation en cours..."
    npm run build
    
    cd ..
    
    # Vérifier que le build a réussi
    if [ -d "frontend/build" ] && [ -f "frontend/build/index.html" ]; then
        log "✅ Build terminé avec succès"
        
        BUILD_SIZE=$(du -sh frontend/build | cut -f1)
        info "📦 Taille du build : $BUILD_SIZE"
    else
        error "❌ Le build a échoué ou est incomplet"
        exit 1
    fi
}

# Vérifier fichiers générés
verify_build() {
    log "🔍 Vérification des fichiers générés..."
    
    REQUIRED_FILES=(
        "frontend/build/index.html"
        "frontend/build/static"
    )
    
    for file in "${REQUIRED_FILES[@]}"; do
        if [ ! -e "$file" ]; then
            error "❌ Fichier manquant : $file"
            exit 1
        fi
    done
    
    log "✅ Tous les fichiers requis sont présents"
    
    # Lister les fichiers principaux
    info "📋 Fichiers principaux :"
    ls -lh frontend/build/ | head -10
}

# Afficher résumé
show_summary() {
    log "📋 Résumé du build frontend :"
    echo ""
    info "📁 Dossier build : frontend/build/"
    info "🌐 URL API : $API_URL"
    info "📦 Taille : $(du -sh frontend/build | cut -f1)"
    echo ""
    info "📝 Prochaine étape : Déployer sur serveur public"
    info "   Script: ./deploy-frontend-public.sh"
}

# Fonction principale
main() {
    log "🚀 Démarrage du build frontend production..."
    
    check_prerequisites
    create_env_production
    install_dependencies
    build_frontend
    verify_build
    show_summary
    
    log "✅ Build frontend terminé avec succès !"
}

# Exécution
main "$@"
