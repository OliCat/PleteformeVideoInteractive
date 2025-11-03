# Setup Container LXC Debian 11 pour Plateforme Vidéo

## Configuration Container LXC Proxmox

### Spécifications recommandées
```bash
# Ressources minimales
CPU: 2 cores
RAM: 4 Go (8 Go recommandés)
Stockage: 50 Go + espace vidéos
Réseau: vmbr0 (ou votre bridge principal)

# Features à activer
- keyctl=1 (pour systemd)
- nesting=1 (pour Docker si besoin)
- fuse=1 (pour montages)
```

### Création du container

#### Avec IP statique (recommandé)
```bash
# Sur Proxmox (depuis l'interface ou CLI)
# Adapter l'IP selon votre réseau local
pct create 200 debian-11-standard_11.7-1_amd64.tar.zst \
  --cores 2 \
  --memory 8192 \
  --swap 1024 \
  --rootfs local-lvm:50 \
  --net0 name=eth0,bridge=vmbr0,firewall=1,ip=192.168.1.100/24,gw=192.168.1.1 \
  --features keyctl=1,nesting=1,fuse=1 \
  --hostname video-platform \
  --nameserver 8.8.8.8 \
  --searchdomain local \
  --start 1
```

#### Avec DHCP (si disponible)
```bash
pct create 200 debian-11-standard_11.7-1_amd64.tar.zst \
  --cores 2 \
  --memory 8192 \
  --swap 1024 \
  --rootfs local-lvm:50 \
  --net0 name=eth0,bridge=vmbr0,firewall=1,ip=dhcp \
  --features keyctl=1,nesting=1,fuse=1 \
  --hostname video-platform \
  --start 1
```

### Paramètres réseau à adapter
- **IP** : `192.168.1.100/24` (remplacer par une IP libre de votre réseau)
- **Gateway** : `192.168.1.1` (IP de votre routeur/box)
- **DNS** : `8.8.8.8` (ou votre serveur DNS local)
- **Bridge** : `vmbr0` (ou votre bridge réseau Proxmox)

## Installation de base (dans le container)

### 1. Mise à jour système
```bash
apt update && apt upgrade -y
apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates
```

### 2. Installation Node.js 18.x (LTS)
```bash
# Ajouter le repository NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Vérification
node --version  # Doit être v18.x
npm --version
```

### 3. Installation MongoDB 6.x (compatible Debian 11)
```bash
# Ajouter la clé GPG MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -

# Ajouter le repository
echo "deb http://repo.mongodb.org/apt/debian bullseye/mongodb-org/6.0 main" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Installation
apt update
apt install -y mongodb-org

# Démarrage automatique
systemctl enable mongod
systemctl start mongod
systemctl status mongod
```

### 4. Installation FFmpeg
```bash
# FFmpeg depuis les repos Debian 11
apt install -y ffmpeg

# Vérification
ffmpeg -version
```

### 5. Installation Nginx
```bash
apt install -y nginx

# Démarrage automatique
systemctl enable nginx
systemctl start nginx
systemctl status nginx
```

### 6. Sécurité et outils
```bash
# Firewall
apt install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 5000/tcp  # API backend (temporaire dev)
ufw --force enable

# Outils système
apt install -y htop tree git unzip fail2ban certbot python3-certbot-nginx

# Configuration fail2ban
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
systemctl enable fail2ban
systemctl start fail2ban
```

## Configuration des services

### MongoDB Sécurisé
```bash
# Configuration MongoDB
cat > /etc/mongod.conf << 'EOF'
# Configuration MongoDB pour plateforme vidéo
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

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
EOF

systemctl restart mongod
```

### Sécurisation MongoDB
```bash
# Créer un utilisateur admin
mongo << 'EOF'
use admin
db.createUser({
  user: "admin",
  pwd: "MotDePasseTresSecurise123!",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})
exit
EOF

# Créer l'utilisateur pour l'application
mongo -u admin -p << 'EOF'
use video-platform
db.createUser({
  user: "videoapp",
  pwd: "VideoApp2024!SecurePwd",
  roles: ["readWrite"]
})
exit
EOF
```

### Structure des dossiers application
```bash
# Créer l'utilisateur système
useradd -r -s /bin/false videoapp
usermod -a -G video videoapp

# Créer la structure
mkdir -p /opt/video-platform/{app,uploads,videos,thumbnails,logs}
mkdir -p /opt/video-platform/app/{backend,frontend}

# Permissions
chown -R videoapp:videoapp /opt/video-platform
chmod -R 755 /opt/video-platform
chmod -R 775 /opt/video-platform/uploads
chmod -R 775 /opt/video-platform/videos
chmod -R 775 /opt/video-platform/thumbnails
```

## Configuration Nginx

### Configuration de base
```bash
# Créer la configuration du site
cat > /etc/nginx/sites-available/video-platform << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirection HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL Configuration (sera configuré avec certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Sécurité SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    # Headers sécurité
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Frontend React
    location / {
        root /opt/video-platform/app/frontend/build;
        try_files $uri $uri/ /index.html;
    }
    
    # API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
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
    
    # Limite taille upload
    client_max_body_size 500M;
}
EOF

# Activer le site
ln -s /etc/nginx/sites-available/video-platform /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test et reload
nginx -t
systemctl reload nginx
```

## Service systemd pour l'application

```bash
cat > /etc/systemd/system/video-platform.service << 'EOF'
[Unit]
Description=Video Platform API Server
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=videoapp
WorkingDirectory=/opt/video-platform/app/backend
Environment=NODE_ENV=production
Environment=PORT=5000
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

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable video-platform
```

## Monitoring et logs

```bash
# Logrotate pour l'application
cat > /etc/logrotate.d/video-platform << 'EOF'
/opt/video-platform/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 videoapp videoapp
    postrotate
        systemctl reload video-platform > /dev/null 2>&1 || true
    endscript
}
EOF

# Script de monitoring
cat > /usr/local/bin/video-platform-status << 'EOF'
#!/bin/bash
echo "=== Video Platform Status ==="
echo "Date: $(date)"
echo ""
echo "Services:"
systemctl status mongod --no-pager -l
systemctl status nginx --no-pager -l
systemctl status video-platform --no-pager -l
echo ""
echo "Disk Usage:"
df -h /opt/video-platform
echo ""
echo "Memory Usage:"
free -h
echo ""
echo "MongoDB Status:"
mongo --quiet --eval "db.adminCommand('serverStatus').ok" 2>/dev/null && echo "MongoDB: OK" || echo "MongoDB: ERROR"
EOF

chmod +x /usr/local/bin/video-platform-status
```

## Sauvegarde automatique

```bash
# Script de sauvegarde
cat > /usr/local/bin/backup-video-platform << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/video-platform"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Sauvegarde MongoDB
mongodump --host localhost --port 27017 --db video-platform --out $BACKUP_DIR/mongo_$DATE

# Sauvegarde fichiers de configuration
tar -czf $BACKUP_DIR/config_$DATE.tar.gz /opt/video-platform/app/backend/.env /etc/nginx/sites-available/video-platform

# Nettoyage (garder 30 jours)
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Sauvegarde terminée: $DATE"
EOF

chmod +x /usr/local/bin/backup-video-platform

# Crontab pour sauvegarde automatique
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-video-platform") | crontab -
```

## Prochaines étapes

1. **Créer le container LXC** avec les spécifications
2. **Exécuter ce script d'installation**
3. **Configurer le domaine et SSL**  
4. **Déployer l'application** depuis ton Mac

Veux-tu que je crée maintenant le **script d'installation automatique** qui exécute toutes ces étapes ? 🚀 