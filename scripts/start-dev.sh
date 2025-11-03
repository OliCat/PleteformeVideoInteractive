#!/bin/bash

# 🚀 Script de démarrage intelligent pour la plateforme vidéo interactive
# Ce script trouve automatiquement un port libre et démarre le projet

set -e

# Couleurs pour l'affichage
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Fonction pour trouver un port libre
find_free_port() {
    local start_port=$1
    local port=$start_port
    
    while [ $port -lt 65535 ]; do
        if ! lsof -i :$port >/dev/null 2>&1; then
            echo $port
            return 0
        fi
        port=$((port + 1))
    done
    
    return 1
}

# Fonction pour vérifier MongoDB
check_mongodb() {
    print_status "Vérification de MongoDB..."
    
    if brew services list | grep -q "mongodb.*started"; then
        print_success "MongoDB est démarré"
        return 0
    else
        print_warning "MongoDB n'est pas démarré, tentative de démarrage..."
        brew services start mongodb/brew/mongodb-community
        
        # Attendre que MongoDB démarre
        sleep 3
        
        if brew services list | grep -q "mongodb.*started"; then
            print_success "MongoDB démarré avec succès"
            return 0
        else
            print_error "Impossible de démarrer MongoDB"
            return 1
        fi
    fi
}

# Fonction pour démarrer le backend
start_backend() {
    local port=$1
    
    print_status "Démarrage du backend sur le port $port..."
    
    cd backend
    
    # Créer un fichier .env temporaire avec le bon port
    if [ ! -f ".env" ]; then
        print_warning "Fichier .env manquant, création d'un fichier temporaire..."
        cat > .env << EOF
# Environment Configuration
NODE_ENV=development
PORT=$port

# Database
MONGODB_URI=mongodb://localhost:27017/video-platform

# JWT Configuration
JWT_SECRET=dev-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=30d

# Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=500000000
ALLOWED_VIDEO_FORMATS=mp4,avi,mov,mkv,webm

# Video Processing
FFMPEG_PATH=/opt/homebrew/bin/ffmpeg
VIDEO_QUALITY_LEVELS=480p,720p,1080p

# Security
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Admin User (création automatique au démarrage)
ADMIN_EMAIL=admin@cooperative.local
ADMIN_PASSWORD=admin123
ADMIN_USERNAME=admin
EOF
        print_success "Fichier .env créé avec le port $port"
    else
        # Mettre à jour le port dans le fichier .env existant
        if grep -q "PORT=" .env; then
            sed -i '' "s/PORT=.*/PORT=$port/" .env
        else
            echo "PORT=$port" >> .env
        fi
        print_success "Port mis à jour dans .env"
    fi
    
    # Démarrer le backend
    print_status "Démarrage du serveur backend..."
    npm run dev &
    BACKEND_PID=$!
    
    # Attendre que le serveur démarre
    sleep 5
    
    # Vérifier que le serveur fonctionne
    if curl -s "http://localhost:$port/api/health" >/dev/null 2>&1; then
        print_success "Backend démarré avec succès sur le port $port"
        return 0
    else
        print_error "Le backend n'a pas pu démarrer"
        kill $BACKEND_PID 2>/dev/null || true
        return 1
    fi
}

# Fonction pour démarrer le frontend
start_frontend() {
    print_status "Démarrage du frontend..."
    
    cd frontend
    
    # Vérifier que les dépendances sont installées
    if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules)" ]; then
        print_warning "Dépendances frontend manquantes, installation..."
        npm install
    fi
    
    # Démarrer le frontend
    print_status "Démarrage de l'application React..."
    npm start &
    FRONTEND_PID=$!
    
    # Attendre que le frontend démarre
    sleep 10
    
    # Vérifier que le frontend fonctionne
    if curl -s "http://localhost:3000" >/dev/null 2>&1; then
        print_success "Frontend démarré avec succès sur le port 3000"
        return 0
    else
        print_warning "Le frontend pourrait ne pas être encore prêt"
        return 0
    fi
}

# Fonction principale
main() {
    echo "🚀 Démarrage de la plateforme vidéo interactive"
    echo "=============================================="
    echo ""
    
    # Vérifier MongoDB
    if ! check_mongodb; then
        print_error "Impossible de continuer sans MongoDB"
        exit 1
    fi
    
    # Trouver un port libre pour le backend
    print_status "Recherche d'un port libre..."
    BACKEND_PORT=$(find_free_port 5000)
    
    if [ -z "$BACKEND_PORT" ]; then
        print_error "Aucun port libre trouvé"
        exit 1
    fi
    
    print_success "Port libre trouvé: $BACKEND_PORT"
    
    # Démarrer le backend
    if ! start_backend $BACKEND_PORT; then
        print_error "Impossible de démarrer le backend"
        exit 1
    fi
    
    # Démarrer le frontend
    if ! start_frontend; then
        print_error "Impossible de démarrer le frontend"
        exit 1
    fi
    
    # Afficher les informations de connexion
    echo ""
    echo "🎉 PLATEFORME DÉMARRÉE AVEC SUCCÈS !"
    echo "======================================"
    echo ""
    echo "🌐 Accès à l'application :"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://localhost:$BACKEND_PORT"
    echo "   API:      http://localhost:$BACKEND_PORT/api/health"
    echo ""
    echo "🔑 Compte administrateur :"
    echo "   Email: admin@cooperative.local"
    echo "   Mot de passe: admin123"
    echo ""
    echo "📋 Commandes utiles :"
    echo "   Voir les logs backend: tail -f backend/logs/*.log"
    echo "   Arrêter les services: pkill -f 'node.*server' && pkill -f 'react-scripts'"
    echo "   Redémarrer MongoDB: brew services restart mongodb/brew/mongodb-community"
    echo ""
    echo "💡 Le projet est maintenant prêt pour le développement !"
    echo "   Les services redémarreront automatiquement lors des modifications de code."
    echo ""
    
    # Garder le script en vie pour afficher les logs
    print_status "Appuyez sur Ctrl+C pour arrêter tous les services..."
    
    # Attendre l'interruption
    wait
}

# Gestion de l'arrêt propre
cleanup() {
    print_status "Arrêt des services..."
    
    # Arrêter le backend
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    # Arrêter le frontend
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    # Arrêter tous les processus Node.js liés au projet
    pkill -f "node.*server" 2>/dev/null || true
    pkill -f "react-scripts" 2>/dev/null || true
    
    print_success "Services arrêtés"
    exit 0
}

# Capturer les signaux d'arrêt
trap cleanup SIGINT SIGTERM

# Exécuter le script principal
main "$@"
