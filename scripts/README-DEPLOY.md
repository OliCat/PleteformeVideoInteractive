# Guide de Déploiement Production

Ce guide décrit le processus de déploiement de la plateforme vidéo interactive en production.

## Architecture

```
Internet → Serveur Public (Nginx + Frontend React) - root@<PUBLIC_SERVER_IP>
                ↓ proxy /api/, /videos/, /thumbnails/
           LXC <LXC_IP>:5000 (Backend Node.js + MongoDB)
```

**URL publique :** `https://votre-domaine.com`

## Prérequis

### Sur votre machine locale (Mac)
- Node.js et npm installés
- Accès SSH avec clé configurée
- Accès au jump host `root@<PUBLIC_SERVER_IP>`
- Accès direct au LXC `<LXC_IP>` via jump host

### Sur le LXC
- Node.js 18.x installé
- MongoDB installé et actif
- FFmpeg (sera installé automatiquement si absent)
- Utilisateur avec sudo (par défaut: `root`)

### Sur le serveur public
- Nginx installé
- Certbot et certificat SSL pour votre domaine déjà configurés

## Configuration

Avant de commencer, configurez les variables d'environnement suivantes ou passez-les en paramètres aux scripts :

- `PUBLIC_SERVER_IP` : IP publique du serveur Nginx
- `LXC_IP` : IP privée du conteneur LXC
- `DOMAIN` : Domaine public de l'application (ex: `votre-domaine.com`)
- `LXC_USER` : Utilisateur sur le LXC (par défaut: `root`)

## Scripts de Déploiement

Tous les scripts sont dans le dossier `scripts/`.

### Script Principal
```bash
./scripts/deploy-production.sh
```
Menu interactif pour exécuter toutes les phases une par une ou le déploiement complet.

### Scripts par Phase

#### Phase 1 : Préparation LXC Backend

1. **setup-lxc-backend.sh** - Prérequis système
   ```bash
   ./scripts/setup-lxc-backend.sh <JUMP_HOST> <LXC_IP> <LXC_USER>
   ```
   - Vérifie Node.js et MongoDB
   - Installe FFmpeg si nécessaire
   - Crée utilisateur `videoplatform`
   - Configure structure de dossiers `/opt/video-platform/`

2. **setup-mongodb.sh** - Configuration MongoDB
   ```bash
   ./scripts/setup-mongodb.sh <JUMP_HOST> <LXC_IP> <LXC_USER> "MotDePasseAdmin"
   ```
   - Configure bind IP (127.0.0.1)
   - Crée utilisateur admin MongoDB (optionnel)
   - Crée base de données `video-platform`
   - Crée utilisateur application `videoapp`
   - Génère URI MongoDB et la sauvegarde dans `/tmp/mongodb_uri.txt`

3. **setup-backend-config.sh** - Configuration backend
   ```bash
   ./scripts/setup-backend-config.sh <JUMP_HOST> <LXC_IP> <LXC_USER> "mongodb://user:pass@localhost:27017/video-platform" "JWTSecret"
   ```
   - Crée fichier `.env` production
   - Crée service systemd `video-platform.service`
   - Configure logrotate

4. **setup-firewall-lxc.sh** - Firewall LXC
   ```bash
   ./scripts/setup-firewall-lxc.sh <JUMP_HOST> <LXC_IP> <LXC_USER> <PUBLIC_SERVER_IP>
   ```
   - Configure UFW
   - Autorise port 5000 uniquement depuis serveur public
   - Sécurise SSH

#### Phase 2 : Déploiement Backend

**deploy-backend-lxc.sh** - Déploiement backend sur LXC
```bash
./scripts/deploy-backend-lxc.sh <JUMP_HOST> <LXC_IP> <LXC_USER>
```
- Transfère fichiers backend (exclut node_modules, .env)
- Installe dépendances npm
- Configure permissions
- Démarre service video-platform
- Vérifie santé API

#### Phase 3 : Build et Déploiement Frontend

1. **build-frontend.sh** - Build frontend
   ```bash
   ./scripts/build-frontend.sh
   ```
   - Crée `.env.production` avec URL API
   - Build React en mode production
   - Génère fichiers dans `frontend/build/`

2. **deploy-frontend-public.sh** - Déploiement frontend
   ```bash
   ./scripts/deploy-frontend-public.sh <PUBLIC_SERVER> <TARGET_DIR>
   ```
   - Transfère fichiers buildés vers serveur public
   - Configure permissions www-data

#### Phase 4 : Configuration Nginx

**configure-nginx-public.sh** - Configuration Nginx
```bash
./scripts/configure-nginx-public.sh <PUBLIC_SERVER> <LXC_IP> <DOMAIN>
```
- Crée configuration Nginx avec SSL
- Configure proxy vers LXC backend
- Configure fichiers statiques frontend
- Active configuration
- Recharge Nginx

#### Phase 5 : Vérification SSL

**verify-ssl.sh** - Vérification certificat SSL
```bash
./scripts/verify-ssl.sh <PUBLIC_SERVER> <DOMAIN>
```
- Vérifie certificat Let's Encrypt
- Vérifie configuration certbot
- Teste connexion HTTPS

#### Phase 6 : Tests

**test-deployment.sh** - Tests de déploiement
```bash
./scripts/test-deployment.sh <PUBLIC_SERVER> <DOMAIN> <LXC_IP>
```
- Teste accès frontend
- Teste API health
- Teste proxy vers LXC
- Teste HTTPS
- Teste performance

#### Phase 7 : Monitoring

**setup-monitoring.sh** - Configuration monitoring
```bash
./scripts/setup-monitoring.sh <JUMP_HOST> <LXC_IP> <LXC_USER> <PUBLIC_SERVER>
```
- Crée script santé services
- Crée script sauvegarde MongoDB
- Configure cron pour sauvegardes quotidiennes
- Configure logrotate pour Nginx

## Ordre d'Exécution Recommandé

### Option 1 : Déploiement Automatique Complet
```bash
./scripts/deploy-production.sh
# Choisir option 13) DÉPLOIEMENT COMPLET
```

### Option 2 : Déploiement Phase par Phase
```bash
# Phase 1 complète
./scripts/deploy-production.sh
# Choisir option 1) Phase 1 complète

# Phase 2
./scripts/deploy-production.sh
# Choisir option 6) Phase 2

# Phase 3
./scripts/build-frontend.sh
./scripts/deploy-frontend-public.sh <PUBLIC_SERVER> <TARGET_DIR>

# Phase 4
./scripts/configure-nginx-public.sh <PUBLIC_SERVER> <LXC_IP> <DOMAIN>

# Phase 5
./scripts/verify-ssl.sh <PUBLIC_SERVER> <DOMAIN>

# Phase 6
./scripts/test-deployment.sh <PUBLIC_SERVER> <DOMAIN> <LXC_IP>

# Phase 7
./scripts/setup-monitoring.sh <JUMP_HOST> <LXC_IP> <LXC_USER> <PUBLIC_SERVER>
```

## Variables d'Environnement Importantes

### Backend (.env)
- `MONGODB_URI`: URI de connexion MongoDB (format: `mongodb://user:pass@localhost:27017/video-platform`)
- `JWT_SECRET`: Secret pour JWT (généré automatiquement si non fourni)
- `FRONTEND_URL`: URL publique frontend (`https://votre-domaine.com`)
- `VIDEO_PATH`: `/opt/video-platform/videos`
- `THUMBNAIL_PATH`: `/opt/video-platform/thumbnails`
- `UPLOAD_PATH`: `/opt/video-platform/uploads`

### Frontend (.env.production)
- `REACT_APP_API_URL`: `https://votre-domaine.com/api`

## Commandes Utiles

### LXC Backend
```bash
# Status service
ssh -J <JUMP_HOST> <LXC_USER>@<LXC_IP> 'sudo systemctl status video-platform'

# Logs
ssh -J <JUMP_HOST> <LXC_USER>@<LXC_IP> 'journalctl -u video-platform -f'

# Restart
ssh -J <JUMP_HOST> <LXC_USER>@<LXC_IP> 'sudo systemctl restart video-platform'

# Health check
ssh -J <JUMP_HOST> <LXC_USER>@<LXC_IP> 'curl http://localhost:5000/api/health'

# Script santé
ssh -J <JUMP_HOST> <LXC_USER>@<LXC_IP> '/usr/local/bin/video-platform-health'
```

### Serveur Public
```bash
# Status Nginx
ssh <PUBLIC_SERVER> 'sudo systemctl status nginx'

# Logs Nginx
ssh <PUBLIC_SERVER> 'sudo tail -f /var/log/nginx/video-platform.access.log'
ssh <PUBLIC_SERVER> 'sudo tail -f /var/log/nginx/video-platform.error.log'

# Test configuration Nginx
ssh <PUBLIC_SERVER> 'sudo nginx -t'

# Reload Nginx
ssh <PUBLIC_SERVER> 'sudo systemctl reload nginx'
```

## Troubleshooting

### Backend ne démarre pas
1. Vérifier logs: `journalctl -u video-platform -n 50`
2. Vérifier MongoDB: `systemctl status mongod`
3. Vérifier fichier .env: `/opt/video-platform/app/backend/.env`
4. Vérifier permissions: `ls -la /opt/video-platform/app/backend/`

### Frontend non accessible
1. Vérifier Nginx: `systemctl status nginx`
2. Vérifier fichiers: `ls -la <TARGET_DIR>/`
3. Vérifier configuration: `nginx -t`
4. Vérifier logs Nginx

### API ne répond pas via proxy
1. Vérifier backend sur LXC: `curl http://localhost:5000/api/health`
2. Vérifier firewall LXC: `sudo ufw status`
3. Vérifier configuration Nginx proxy
4. Tester depuis serveur public: `curl http://<LXC_IP>:5000/api/health`

## Sauvegardes

Les sauvegardes MongoDB sont automatiques tous les jours à 2h du matin et conservées 30 jours.

Sauvegarde manuelle:
```bash
ssh -J <JUMP_HOST> <LXC_USER>@<LXC_IP> '/usr/local/bin/backup-mongodb'
```

Emplacement: `/opt/backups/video-platform/`

## Sécurité

- Port 5000 LXC accessible uniquement depuis serveur public
- MongoDB bind sur 127.0.0.1 uniquement
- Authentification MongoDB activée
- HTTPS obligatoire (redirection HTTP → HTTPS)
- Headers sécurité Nginx configurés
- Permissions fichiers strictes
