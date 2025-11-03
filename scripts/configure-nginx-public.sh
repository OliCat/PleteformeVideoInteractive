#!/bin/bash

# Script de configuration Nginx serveur public - Phase 4
# Usage: ./configure-nginx-public.sh [public-server] [lxc-ip] [domain]

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
# ⚠️ IMPORTANT : Fournissez ces paramètres lors de l'exécution
# Usage: ./configure-nginx-public.sh <PUBLIC_SERVER> <LXC_IP> <DOMAIN>
# Exemple: ./configure-nginx-public.sh root@votre-serveur.com 192.168.1.100 votre-domaine.com
PUBLIC_SERVER=${1:-""}
LXC_IP=${2:-""}
DOMAIN=${3:-""}
TARGET_DIR="/var/www/video-platform"
SSL_CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=no"

# Commande SSH
ssh_cmd() {
    ssh $SSH_OPTS $PUBLIC_SERVER "$@"
}

# Vérifications préliminaires
check_prerequisites() {
    log "🔍 Vérification des prérequis..."
    
    # Vérifier que Nginx est installé
    if ! ssh_cmd "command -v nginx >/dev/null 2>&1"; then
        error "❌ Nginx non installé sur le serveur"
        error "   Installez Nginx : sudo apt-get install -y nginx"
        exit 1
    fi
    
    log "✅ Prérequis vérifiés"
}

# Vérifier certificat SSL
check_ssl_certificate() {
    log "🔒 Vérification certificat SSL..."
    
    # Détecter si sudo existe
    SUDO_CMD=$(ssh_cmd "command -v sudo >/dev/null 2>&1 && echo 'sudo' || echo ''")
    
    if ssh_cmd "test -d $SSL_CERT_PATH"; then
        log "✅ Certificat SSL trouvé : $SSL_CERT_PATH"
        
        CERT_INFO=$(ssh_cmd "$SUDO_CMD openssl x509 -in $SSL_CERT_PATH/fullchain.pem -noout -subject -dates 2>/dev/null || openssl x509 -in $SSL_CERT_PATH/fullchain.pem -noout -subject -dates 2>/dev/null")
        info "$CERT_INFO"
    else
        warning "⚠️ Certificat SSL non trouvé dans $SSL_CERT_PATH"
        warning "   La configuration utilisera le certificat si disponible"
    fi
}

# Créer configuration Nginx
create_nginx_config() {
    log "📝 Création configuration Nginx..."
    
    ssh_cmd << EOF
# Détecter si sudo existe
if command -v sudo >/dev/null 2>&1; then
    SUDO_CMD="sudo"
else
    SUDO_CMD=""
fi

# Créer un fichier temporaire avec la configuration
\$SUDO_CMD tee /tmp/video-platform-nginx.conf > /dev/null << 'NGINX_TEMPLATE'
# Configuration pour la plateforme vidéo interactive
# Domaine: __DOMAIN__

# Redirection HTTP vers HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name __DOMAIN__ www.__DOMAIN__;
    
    # Redirection HTTPS
    return 301 https://\$server_name\$request_uri;
}

# Configuration HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name __DOMAIN__ www.__DOMAIN__;
    
    # Logs
    access_log /var/log/nginx/video-platform.access.log;
    error_log /var/log/nginx/video-platform.error.log;
    
    # SSL Configuration
    ssl_certificate __SSL_CERT_PATH__/fullchain.pem;
    ssl_certificate_key __SSL_CERT_PATH__/privkey.pem;
    
    # Utiliser la configuration SSL standard du serveur (qui fonctionne pour les autres sites)
    include /etc/nginx/ssl.conf;
    
    # Utiliser un nom différent pour le cache SSL pour éviter les conflits
    ssl_session_cache shared:SSL-VideoPlatform:10m;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        application/xml;
    
    # Upload size (pour les vidéos)
    client_max_body_size 500M;
    client_body_timeout 3600s;     # 1 heure pour upload + traitement
    client_header_timeout 3600s;   # 1 heure pour upload + traitement
    
    # API Backend - Reverse proxy vers LXC
    location /api/ {
        # Important : slash final pour préserver le path /api/
        proxy_pass http://__LXC_IP__:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts pour les uploads et traitement vidéo (transcodage peut prendre du temps)
        proxy_connect_timeout 30s;
        proxy_send_timeout 1800s;      # 30 minutes pour le traitement vidéo
        proxy_read_timeout 1800s;      # 30 minutes pour le traitement vidéo
        
        # Buffers pour uploads volumineux
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_max_temp_file_size 0;
        
        # Headers pour uploads longs
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Server \$host;
    }
    
    # Route spécifique pour l'upload de vidéos avec timeouts encore plus longs
    location /api/videos/upload {
        proxy_pass http://__LXC_IP__:5000/api/videos/upload;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts très longs pour upload + transcodage vidéo
        proxy_connect_timeout 30s;
        proxy_send_timeout 3600s;      # 1 heure pour upload + transcodage
        proxy_read_timeout 3600s;      # 1 heure pour upload + transcodage
        
        # Buffers
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_max_temp_file_size 0;
        
        # Headers
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Server \$host;
    }
    
    # Vidéos - Proxy vers LXC
    location /videos/ {
        proxy_pass http://__LXC_IP__:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Support Range requests pour streaming
        proxy_set_header Range \$http_range;
        proxy_set_header If-Range \$http_if_range;
        
        # Cache pour les vidéos
        expires 7d;
        add_header Cache-Control "public, immutable";
        
        # CORS pour streaming
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS";
        add_header Access-Control-Allow-Headers "Range, Content-Type, Authorization";
    }
    
    # Thumbnails - Proxy vers LXC
    location /thumbnails/ {
        proxy_pass http://__LXC_IP__:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Cache pour les thumbnails
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Frontend React - Fichiers statiques
    location / {
        root __TARGET_DIR__;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        
        # Cache pour les assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # Pas de cache pour index.html
        location = /index.html {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
NGINX_TEMPLATE

# Remplacer les variables dans le fichier généré
\$SUDO_CMD sed -i "s|__DOMAIN__|$DOMAIN|g" /tmp/video-platform-nginx.conf
\$SUDO_CMD sed -i "s|__SSL_CERT_PATH__|$SSL_CERT_PATH|g" /tmp/video-platform-nginx.conf
\$SUDO_CMD sed -i "s|__LXC_IP__|$LXC_IP|g" /tmp/video-platform-nginx.conf
\$SUDO_CMD sed -i "s|__TARGET_DIR__|$TARGET_DIR|g" /tmp/video-platform-nginx.conf

# Copier le fichier final
\$SUDO_CMD cp /tmp/video-platform-nginx.conf /etc/nginx/sites-available/video-platform
\$SUDO_CMD rm -f /tmp/video-platform-nginx.conf

echo "✅ Configuration Nginx créée"
EOF
    
    log "✅ Configuration Nginx créée (fichier: /etc/nginx/sites-available/video-platform)"
}

# Activer configuration
enable_nginx_config() {
    log "🔗 Activation configuration Nginx..."
    
    ssh_cmd << EOF
# Détecter si sudo existe
if command -v sudo >/dev/null 2>&1; then
    SUDO_CMD="sudo"
else
    SUDO_CMD=""
fi

# Créer lien symbolique (sans supprimer default car d'autres apps peuvent l'utiliser)
\$SUDO_CMD ln -sf /etc/nginx/sites-available/video-platform /etc/nginx/sites-enabled/video-platform

echo "✅ Configuration activée"
EOF
    
    log "✅ Configuration activée"
}

# Tester configuration Nginx
test_nginx_config() {
    log "🧪 Test configuration Nginx..."
    
    # Détecter si sudo existe
    SUDO_CMD=$(ssh_cmd "command -v sudo >/dev/null 2>&1 && echo 'sudo' || echo ''")
    
    if ssh_cmd "$SUDO_CMD nginx -t"; then
        log "✅ Configuration Nginx valide"
    else
        error "❌ Configuration Nginx invalide"
        error "   Vérifiez les erreurs ci-dessus"
        exit 1
    fi
}

# Recharger Nginx
reload_nginx() {
    log "🔄 Rechargement Nginx..."
    
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
}

# Vérifier santé
health_check() {
    log "🏥 Vérification santé..."
    
    sleep 2
    
    # Test HTTP (devrait rediriger vers HTTPS)
    if ssh_cmd "curl -I http://localhost/health 2>/dev/null | head -n 1"; then
        log "✅ Serveur HTTP répond"
    fi
    
    # Vérifier que le frontend est accessible
    if ssh_cmd "test -f $TARGET_DIR/index.html"; then
        log "✅ Frontend déployé correctement"
    else
        warning "⚠️ Frontend non trouvé dans $TARGET_DIR"
        warning "   Déployez d'abord le frontend avec deploy-frontend-public.sh"
    fi
}

# Afficher informations
show_info() {
    log "📋 Informations de configuration Nginx :"
    echo ""
    info "📁 Configuration : /etc/nginx/sites-available/video-platform"
    info "🔗 Lien activé : /etc/nginx/sites-enabled/video-platform"
    info "🌐 Domaine : $DOMAIN"
    info "🔧 Backend LXC : http://$LXC_IP:5000"
    echo ""
    info "🔧 Commandes utiles :"
    info "   Status: ssh $PUBLIC_SERVER 'sudo systemctl status nginx'"
    info "   Logs access: ssh $PUBLIC_SERVER 'sudo tail -f /var/log/nginx/video-platform.access.log'"
    info "   Logs error: ssh $PUBLIC_SERVER 'sudo tail -f /var/log/nginx/video-platform.error.log'"
    info "   Test config: ssh $PUBLIC_SERVER 'sudo nginx -t'"
    info "   Reload: ssh $PUBLIC_SERVER 'sudo systemctl reload nginx'"
}

# Fonction principale
main() {
    log "🚀 Démarrage de la configuration Nginx serveur public..."
    
    check_prerequisites
    check_ssl_certificate
    create_nginx_config
    enable_nginx_config
    test_nginx_config
    reload_nginx
    health_check
    show_info
    
    log "✅ Configuration Nginx terminée avec succès !"
    log "📝 Prochaine étape : Vérification SSL (Phase 5)"
}

# Exécution
main "$@"
