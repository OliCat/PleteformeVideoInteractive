#!/bin/bash

# Script de configuration backend - Phase 1.3 et 1.4
# Usage: ./setup-backend-config.sh [jump-host] [lxc-ip] [lxc-user] [mongodb-uri] [jwt-secret]

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
MONGODB_URI=${4:-""}
JWT_SECRET=${5:-""}
FRONTEND_URL="https://votre-domaine.com"
SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=no"

# Commande SSH avec jump host
ssh_cmd() {
    ssh $SSH_OPTS -J $JUMP_HOST $LXC_USER@$LXC_IP "$@"
}

# Générer JWT secret si non fourni
generate_jwt_secret() {
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
        log "🔑 JWT secret généré automatiquement"
    fi
}

# Créer fichier .env
create_env_file() {
    log "📝 Création fichier .env production..."
    
    if [ -z "$MONGODB_URI" ]; then
        error "❌ MONGODB_URI requis"
        echo "Usage: $0 <jump-host> <lxc-ip> [lxc-user] <mongodb-uri> [jwt-secret]"
        exit 1
    fi
    
    generate_jwt_secret
    
    ssh_cmd << EOF
cat > /tmp/video-platform.env << ENV_FILE
# Environment Configuration - Production
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=$MONGODB_URI

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRE=30d

# Upload Configuration
UPLOAD_PATH=/opt/video-platform/uploads
MAX_FILE_SIZE=500000000
ALLOWED_VIDEO_FORMATS=mp4,avi,mov,mkv,webm

# Video Processing
FFMPEG_PATH=/usr/bin/ffmpeg
VIDEO_QUALITY_LEVELS=480p,720p,1080p

# Security
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
FRONTEND_URL=$FRONTEND_URL

# Paths
VIDEO_PATH=/opt/video-platform/videos
THUMBNAIL_PATH=/opt/video-platform/thumbnails
LOG_PATH=/opt/video-platform/logs

# Admin User (création automatique au démarrage)
ADMIN_EMAIL=admin@votre-domaine.com
ADMIN_PASSWORD=admin123
ADMIN_USERNAME=admin
ENV_FILE

sudo mv /tmp/video-platform.env /opt/video-platform/app/backend/.env
sudo chown videoplatform:videoplatform /opt/video-platform/app/backend/.env
sudo chmod 600 /opt/video-platform/app/backend/.env
EOF
    
    log "✅ Fichier .env créé"
}

# Créer service systemd
create_systemd_service() {
    log "⚙️ Création service systemd video-platform..."
    
    ssh_cmd << 'EOF'
sudo tee /etc/systemd/system/video-platform.service > /dev/null << SERVICE_FILE
[Unit]
Description=Video Platform API Server
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=videoplatform
Group=videoplatform
WorkingDirectory=/opt/video-platform/app/backend
Environment=NODE_ENV=production
Environment=PORT=5000
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=video-platform

# Sécurité
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/video-platform/uploads /opt/video-platform/videos /opt/video-platform/thumbnails /opt/video-platform/logs

# Limites
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
SERVICE_FILE

sudo systemctl daemon-reload
sudo systemctl enable video-platform
EOF
    
    log "✅ Service systemd créé et activé"
}

# Créer logrotate
create_logrotate() {
    log "📄 Création configuration logrotate..."
    
    ssh_cmd << 'EOF'
sudo tee /etc/logrotate.d/video-platform > /dev/null << LOGROTATE_FILE
/opt/video-platform/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 videoplatform videoplatform
    sharedscripts
    postrotate
        systemctl reload video-platform > /dev/null 2>&1 || true
    endscript
}
LOGROTATE_FILE
EOF
    
    log "✅ Logrotate configuré"
}

# Afficher résumé
show_summary() {
    log "📋 Résumé de la configuration backend :"
    echo ""
    info "📁 Fichier .env créé : /opt/video-platform/app/backend/.env"
    info "⚙️ Service systemd : video-platform.service"
    info "📄 Logrotate : /etc/logrotate.d/video-platform"
    echo ""
    warning "📝 Informations importantes sauvegardées :"
    echo "   JWT_SECRET: $JWT_SECRET"
    echo "   FRONTEND_URL: $FRONTEND_URL"
    echo ""
    info "🔧 Commandes utiles :"
    info "   Démarrer: ssh -J $JUMP_HOST $LXC_USER@$LXC_IP 'sudo systemctl start video-platform'"
    info "   Arrêter: ssh -J $JUMP_HOST $LXC_USER@$LXC_IP 'sudo systemctl stop video-platform'"
    info "   Status: ssh -J $JUMP_HOST $LXC_USER@$LXC_IP 'sudo systemctl status video-platform'"
    info "   Logs: ssh -J $JUMP_HOST $LXC_USER@$LXC_IP 'journalctl -u video-platform -f'"
}

# Fonction principale
main() {
    log "🚀 Démarrage de la configuration backend..."
    
    create_env_file
    create_systemd_service
    create_logrotate
    show_summary
    
    log "✅ Configuration backend terminée !"
    log "📝 Prochaine étape : Configuration firewall (Phase 1.5)"
}

# Exécution
main "$@"
