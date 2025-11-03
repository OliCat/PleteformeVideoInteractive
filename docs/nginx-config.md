# Configuration Nginx - Reverse Proxy vers LXC

## Configuration recommandée pour le serveur Nginx (IP publique)

### 1. Configuration du site

Créer le fichier `/etc/nginx/sites-available/plateforme-video` :

```nginx
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;
    
    # Redirection HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name votre-domaine.com www.votre-domaine.com;

    # Certificats SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;
    
    # Configuration SSL moderne
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Sécurité headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Configuration générale
    client_max_body_size 100M;
    
    # Frontend React (fichiers statiques)
    location / {
        root /var/www/plateforme-video;
        try_files $uri $uri/ /index.html;
        
        # Cache pour les assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API backend (proxy vers LXC)
    location /api/ {
        proxy_pass http://IP_LXC_PRIVEE:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Streaming vidéo (proxy vers LXC)
    location /videos/ {
        proxy_pass http://IP_LXC_PRIVEE:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Configuration pour le streaming
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300;
    }

    # Uploads (proxy vers LXC avec limite de taille)
    location /uploads/ {
        proxy_pass http://IP_LXC_PRIVEE:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        client_max_body_size 500M;
    }

    # Logs
    access_log /var/log/nginx/plateforme-video.access.log;
    error_log /var/log/nginx/plateforme-video.error.log;
}
```

### 2. Activation du site

```bash
# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/plateforme-video /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl reload nginx
```

### 3. Certificat SSL avec Let's Encrypt

```bash
# Installer Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtenir le certificat
sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com

# Vérifier le renouvellement automatique
sudo systemctl status certbot.timer
```

### 4. Variables d'environnement frontend

Créer `/var/www/plateforme-video/.env.production` :

```bash
REACT_APP_API_URL=https://votre-domaine.com/api
REACT_APP_VIDEO_URL=https://votre-domaine.com/videos
```

## Configuration pour le développement local

Pour tester localement avant déploiement :

```bash
# Frontend
cd frontend
echo "REACT_APP_API_URL=http://IP_LXC_PRIVEE:5000/api" > .env.local
npm start

# Ou avec proxy dans package.json
"proxy": "http://IP_LXC_PRIVEE:5000"
```

## Tests de connectivité

```bash
# Tester l'API depuis le serveur Nginx
curl -I http://IP_LXC_PRIVEE:5000/api/health

# Tester depuis l'extérieur
curl -I https://votre-domaine.com/api/health
``` 