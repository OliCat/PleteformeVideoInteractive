#!/bin/bash

# Script d'installation automatique - Plateforme Vidéo Interactive
# Compatible Debian 11 (Bullseye) - Container LXC Proxmox 6.4.14
# Auteur: Plateforme Vidéo Interactive Team
# Version: 1.0

set -e  # Arrêt en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Vérification root
if [[ $EUID -ne 0 ]]; then
   error "Ce script doit être exécuté en tant que root"
   exit 1
fi

# Vérification Debian 11
if ! grep -q "bullseye" /etc/os-release; then
    error "Ce script est conçu pour Debian 11 (Bullseye)"
    exit 1
fi

log "🚀 Début de l'installation de la Plateforme Vidéo Interactive"
log "📋 Système détecté: $(lsb_release -d | cut -f2)"

# Variables configurables
DOMAIN_NAME=${1:-"video-platform.local"}
ADMIN_EMAIL=${2:-"admin@cooperative.local"}
MONGO_ROOT_PASSWORD="VideoMongo2024!Root"
MONGO_APP_PASSWORD="VideoApp2024!SecurePwd"

info "🌐 Domaine configuré: $DOMAIN_NAME"
info "📧 Email administrateur: $ADMIN_EMAIL"

# Fonction d'installation des dépendances de base
install_base_dependencies() {
    log "📦 Installation des dépendances de base..."
    
    apt update && apt upgrade -y
    apt install -y \
        curl \
        wget \
        gnupg2 \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        lsb-release \
        htop \
        tree \
        git \
        unzip \
        nano \
        vim
        
    log "✅ Dépendances de base installées"
}

# Installation Node.js 18.x
install_nodejs() {
    log "📦 Installation de Node.js 18.x..."
    
    # Nettoyer les anciennes installations
    apt remove -y nodejs npm 2>/dev/null || true
    
    # Ajouter le repository NodeSource
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    
    # Vérification
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    
    log "✅ Node.js installé: $NODE_VERSION"
    log "✅ NPM installé: $NPM_VERSION"
}

# Installation MongoDB 6.x
install_mongodb() {
    log "📦 Installation de MongoDB 6.x..."
    
    # Ajouter la clé GPG MongoDB
    wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
    
    # Ajouter le repository
    echo "deb http://repo.mongodb.org/apt/debian bullseye/mongodb-org/6.0 main" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    
    # Installation
    apt update
    apt install -y mongodb-org
    
    # Configuration sécurisée
    cat > /etc/mongod.conf << 'EOF'
# Configuration MongoDB pour plateforme vidéo
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
    commitIntervalMs: 100

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log
  logRotate: rename

net:
  port: 27017
  bindIp: 127.0.0.1

processManagement:
  timeZoneInfo: /usr/share/zoneinfo
  fork: true
  pidFilePath: /var/run/mongodb/mongod.pid

security:
  authorization: enabled

setParameter:
  authenticationMechanisms: SCRAM-SHA-1,SCRAM-SHA-256

operationProfiling:
  slowOpThresholdMs: 100
  mode: slowOp
EOF
    
    # Démarrage automatique
    systemctl enable mongod
    systemctl start mongod
    
    # Attendre que MongoDB soit prêt
    sleep 5
    
    # Vérification
    if systemctl is-active --quiet mongod; then
        log "✅ MongoDB installé et démarré"
    else
        error "❌ Problème avec l'installation de MongoDB"
        exit 1
    fi
}

# Configuration sécurisée MongoDB
setup_mongodb_security() {
    log "🔒 Configuration de la sécurité MongoDB..."
    
    # Créer un utilisateur admin
    mongo --eval "
    db = db.getSiblingDB('admin');
    db.createUser({
        user: 'admin',
        pwd: '$MONGO_ROOT_PASSWORD',
        roles: ['userAdminAnyDatabase', 'dbAdminAnyDatabase', 'readWriteAnyDatabase']
    });
    " 2>/dev/null || warning "Utilisateur admin peut déjà exister"
    
    # Redémarrer MongoDB avec l'authentification
    systemctl restart mongod
    sleep 3
    
    # Créer l'utilisateur pour l'application
    mongo -u admin -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin --eval "
    db = db.getSiblingDB('video-platform');
    db.createUser({
        user: 'videoapp',
        pwd: '$MONGO_APP_PASSWORD',
        roles: ['readWrite']
    });
    " 2>/dev/null || warning "Utilisateur videoapp peut déjà exister"
    
    log "✅ Sécurité MongoDB configurée"
}

# Installation FFmpeg
install_ffmpeg() {
    log "📦 Installation de FFmpeg..."
    
    apt install -y ffmpeg
    
    # Vérification
    FFMPEG_VERSION=$(ffmpeg -version 2>&1 | head -n1 | cut -d' ' -f3)
    log "✅ FFmpeg installé: version $FFMPEG_VERSION"
}

# Installation Nginx
install_nginx() {
    log "📦 Installation de Nginx..."
    
    apt install -y nginx
    
    # Démarrage automatique
    systemctl enable nginx
    systemctl start nginx
    
    # Vérification
    if systemctl is-active --quiet nginx; then
        log "✅ Nginx installé et démarré"
    else
        error "❌ Problème avec l'installation de Nginx"
        exit 1
    fi
}

# Configuration sécurité système
setup_system_security() {
    log "🔒 Configuration de la sécurité système..."
    
    # Installation des outils de sécurité
    apt install -y ufw fail2ban certbot python3-certbot-nginx
    
    # Configuration UFW
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    
    # Configuration fail2ban
    cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
    
    # Configuration personnalisée fail2ban
    cat >> /etc/fail2ban/jail.local << 'EOF'

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-noscript]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 6

[nginx-badbots]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2

[nginx-noproxy]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
EOF
    
    systemctl enable fail2ban
    systemctl start fail2ban
    
    log "✅ Sécurité système configurée"
}

# Création de la structure d'application
setup_application_structure() {
    log "📁 Création de la structure d'application..."
    
    # Créer l'utilisateur système
    if ! id "videoapp" &>/dev/null; then
        useradd -r -s /bin/false videoapp
        usermod -a -G video videoapp
        log "✅ Utilisateur videoapp créé"
    else
        warning "Utilisateur videoapp existe déjà"
    fi
    
    # Créer la structure de dossiers
    mkdir -p /opt/video-platform/{app,uploads,videos,thumbnails,logs,backups}
    mkdir -p /opt/video-platform/app/{backend,frontend}
    
    # Permissions
    chown -R videoapp:videoapp /opt/video-platform
    chmod -R 755 /opt/video-platform
    chmod -R 775 /opt/video-platform/uploads
    chmod -R 775 /opt/video-platform/videos
    chmod -R 775 /opt/video-platform/thumbnails
    chmod -R 755 /opt/video-platform/logs
    
    log "✅ Structure d'application créée"
}

# Configuration Nginx
setup_nginx_config() {
    log "⚙️ Configuration de Nginx..."
    
    # Créer la configuration du site
    cat > /etc/nginx/sites-available/video-platform << EOF
# Configuration Nginx pour Plateforme Vidéo Interactive
server {
    listen 80;
    server_name $DOMAIN_NAME;
    
    # Pour certbot
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirection HTTPS (sera activée après SSL)
    # return 301 https://\$server_name\$request_uri;
    
    # Temporaire: servir directement en HTTP pour les tests
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout pour les uploads de vidéos
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 300s;
    }
    
    # Streaming vidéo HLS
    location /videos/ {
        alias /opt/video-platform/videos/;
        
        # CORS pour HLS
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods GET;
        
        # Cache headers pour segments HLS
        location ~* \.(m3u8)$ {
            expires -1;
            add_header Cache-Control no-cache;
        }
        
        location ~* \.(ts)$ {
            expires 1y;
            add_header Cache-Control public;
        }
    }
    
    # Thumbnails
    location /thumbnails/ {
        alias /opt/video-platform/thumbnails/;
        expires 1y;
        add_header Cache-Control public;
    }
    
    # Limite taille upload (500MB)
    client_max_body_size 500M;
    client_body_timeout 300s;
    
    # Logs
    access_log /var/log/nginx/video-platform.access.log;
    error_log /var/log/nginx/video-platform.error.log;
}
EOF
    
    # Activer le site
    ln -sf /etc/nginx/sites-available/video-platform /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test de la configuration
    if nginx -t 2>/dev/null; then
        systemctl reload nginx
        log "✅ Configuration Nginx activée"
    else
        error "❌ Erreur dans la configuration Nginx"
        nginx -t
        exit 1
    fi
}

# Configuration service systemd
setup_systemd_service() {
    log "⚙️ Configuration du service systemd..."
    
    cat > /etc/systemd/system/video-platform.service << 'EOF'
[Unit]
Description=Video Platform API Server
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=videoapp
Group=videoapp
WorkingDirectory=/opt/video-platform/app/backend
EnvironmentFile=/opt/video-platform/app/backend/.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=video-platform

# Sécurité
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/video-platform/uploads /opt/video-platform/videos /opt/video-platform/thumbnails /opt/video-platform/logs

# Limites de ressources
LimitNOFILE=65536
MemoryMax=2G

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable video-platform
    
    log "✅ Service systemd configuré"
}

# Configuration monitoring et logs
setup_monitoring() {
    log "📊 Configuration du monitoring et des logs..."
    
    # Logrotate pour l'application
    cat > /etc/logrotate.d/video-platform << 'EOF'
/opt/video-platform/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 videoapp videoapp
    postrotate
        systemctl reload video-platform > /dev/null 2>&1 || true
    endscript
}

/var/log/nginx/video-platform.*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 640 www-data adm
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}
EOF
    
    # Scripts de monitoring
    cat > /usr/local/bin/video-platform-status << 'EOF'
#!/bin/bash
echo "=== Video Platform Status ==="
echo "Date: $(date)"
echo ""

echo "=== Services Status ==="
for service in mongod nginx video-platform; do
    if systemctl is-active --quiet $service; then
        echo "✅ $service: Running"
    else
        echo "❌ $service: Stopped"
    fi
done

echo ""
echo "=== System Resources ==="
echo "Disk Usage:"
df -h /opt/video-platform | tail -n +2
echo ""
echo "Memory Usage:"
free -h
echo ""
echo "Load Average:"
uptime

echo ""
echo "=== MongoDB Status ==="
if mongo --quiet --eval "db.adminCommand('serverStatus').ok" 2>/dev/null; then
    echo "✅ MongoDB: OK"
    echo "Databases:"
    mongo --quiet --eval "db.adminCommand('listDatabases')" 2>/dev/null | grep -E '"name"|"sizeOnDisk"' || true
else
    echo "❌ MongoDB: ERROR"
fi

echo ""
echo "=== Recent Logs ==="
echo "Last 5 lines from video-platform logs:"
tail -n 5 /var/log/syslog | grep video-platform || echo "No recent logs"
EOF
    
    chmod +x /usr/local/bin/video-platform-status
    
    log "✅ Monitoring configuré"
}

# Configuration sauvegarde
setup_backup() {
    log "💾 Configuration des sauvegardes..."
    
    cat > /usr/local/bin/backup-video-platform << EOF
#!/bin/bash
BACKUP_DIR="/opt/video-platform/backups"
DATE=\$(date +%Y%m%d_%H%M%S)
LOG_FILE="/opt/video-platform/logs/backup.log"

echo "\$(date): Début de la sauvegarde" >> \$LOG_FILE

# Créer le dossier de sauvegarde
mkdir -p \$BACKUP_DIR

# Sauvegarde MongoDB
if mongodump --host localhost --port 27017 --username admin --password "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin --db video-platform --out \$BACKUP_DIR/mongo_\$DATE >> \$LOG_FILE 2>&1; then
    echo "\$(date): Sauvegarde MongoDB OK" >> \$LOG_FILE
else
    echo "\$(date): Erreur sauvegarde MongoDB" >> \$LOG_FILE
fi

# Sauvegarde fichiers de configuration
if tar -czf \$BACKUP_DIR/config_\$DATE.tar.gz /opt/video-platform/app/backend/.env /etc/nginx/sites-available/video-platform >> \$LOG_FILE 2>&1; then
    echo "\$(date): Sauvegarde config OK" >> \$LOG_FILE
else
    echo "\$(date): Erreur sauvegarde config" >> \$LOG_FILE
fi

# Nettoyage (garder 30 jours)
find \$BACKUP_DIR -type f -mtime +30 -delete

echo "\$(date): Sauvegarde terminée" >> \$LOG_FILE
EOF
    
    chmod +x /usr/local/bin/backup-video-platform
    
    # Ajouter au crontab
    (crontab -l 2>/dev/null | grep -v backup-video-platform; echo "0 2 * * * /usr/local/bin/backup-video-platform") | crontab -
    
    log "✅ Sauvegardes configurées (exécution quotidienne à 2h)"
}

# Création du fichier .env par défaut
create_env_file() {
    log "⚙️ Création du fichier de configuration (.env)..."
    
    cat > /opt/video-platform/app/backend/.env << EOF
# Environment Configuration
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb://videoapp:$MONGO_APP_PASSWORD@localhost:27017/video-platform

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
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
FRONTEND_URL=http://$DOMAIN_NAME

# Admin User (création automatique au démarrage)
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=admin123
ADMIN_USERNAME=admin

# Paths
VIDEO_PATH=/opt/video-platform/videos
THUMBNAIL_PATH=/opt/video-platform/thumbnails
LOG_PATH=/opt/video-platform/logs
EOF
    
    chown videoapp:videoapp /opt/video-platform/app/backend/.env
    chmod 600 /opt/video-platform/app/backend/.env
    
    log "✅ Fichier .env créé"
}

# Fonction principale d'installation
main() {
    log "🎯 Démarrage de l'installation complète..."
    
    install_base_dependencies
    install_nodejs
    install_mongodb
    setup_mongodb_security
    install_ffmpeg
    install_nginx
    setup_system_security
    setup_application_structure
    setup_nginx_config
    setup_systemd_service
    setup_monitoring
    setup_backup
    create_env_file
    
    log "🎉 Installation terminée avec succès!"
    echo ""
    info "📋 Informations importantes:"
    info "• Domaine configuré: $DOMAIN_NAME"
    info "• Dossier application: /opt/video-platform"
    info "• Utilisateur système: videoapp"
    info "• Base de données: MongoDB sur port 27017"
    info "• Mot de passe MongoDB admin: $MONGO_ROOT_PASSWORD"
    info "• Mot de passe MongoDB app: $MONGO_APP_PASSWORD"
    echo ""
    info "🔧 Prochaines étapes:"
    info "1. Déployer votre application dans /opt/video-platform/app/"
    info "2. Configurer votre domaine DNS"
    info "3. Obtenir un certificat SSL: certbot --nginx -d $DOMAIN_NAME"
    info "4. Démarrer le service: systemctl start video-platform"
    echo ""
    info "📊 Commandes utiles:"
    info "• Status: video-platform-status"
    info "• Logs: journalctl -u video-platform -f"
    info "• Sauvegarde manuelle: backup-video-platform"
    echo ""
    warning "⚠️  Changez immédiatement les mots de passe par défaut!"
}

# Exécution du script principal
main "$@" 