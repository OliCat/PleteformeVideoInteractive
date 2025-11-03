# Configuration utilisateur LXC

## Commandes à exécuter sur le LXC

Connectez-vous sur votre LXC via SSH jump host et exécutez les commandes suivantes :

```bash
# 1. Connexion en tant que root ou utilisateur avec sudo
ssh -J root@<PUBLIC_SERVER_IP> root@<LXC_IP>

# 2. Créer l'utilisateur dédié
sudo useradd -m -s /bin/bash videoplatform

# 3. Ajouter l'utilisateur au groupe sudo
sudo usermod -aG sudo videoplatform

# 4. Créer le répertoire de l'application
sudo mkdir -p /opt/video-platform/app
sudo mkdir -p /opt/video-platform/{uploads,videos,thumbnails,logs}

# 5. Changer le propriétaire des répertoires
sudo chown -R videoplatform:videoplatform /opt/video-platform

# 6. Configurer les permissions sudo sans mot de passe pour les services (optionnel)
echo "videoplatform ALL=(ALL) NOPASSWD: /bin/systemctl, /bin/chown, /bin/chmod, /bin/mkdir, /usr/bin/tail" | sudo tee /etc/sudoers.d/videoplatform

# 7. Copier la clé SSH de root vers videoplatform (si nécessaire)
sudo mkdir -p /home/videoplatform/.ssh
sudo cp /root/.ssh/authorized_keys /home/videoplatform/.ssh/
sudo chown -R videoplatform:videoplatform /home/videoplatform/.ssh
sudo chmod 700 /home/videoplatform/.ssh
sudo chmod 600 /home/videoplatform/.ssh/authorized_keys

# 8. Tester la connexion
exit
ssh -J root@<PUBLIC_SERVER_IP> videoplatform@<LXC_IP> "whoami && sudo whoami"
```

## Vérifications

```bash
# Tester que l'utilisateur peut écrire dans /opt/video-platform
ssh -J root@<PUBLIC_SERVER_IP> videoplatform@<LXC_IP> "touch /opt/video-platform/test && rm /opt/video-platform/test"

# Tester les permissions sudo
ssh -J root@<PUBLIC_SERVER_IP> videoplatform@<LXC_IP> "sudo systemctl status ssh"
```

## Si vous préférez utiliser un utilisateur existant

Si vous avez déjà un utilisateur (ex: votre utilisateur principal), modifiez simplement le script `deploy.sh` :

```bash
# Dans deploy.sh, changez :
LXC_USER="votre_utilisateur_existant"
```

Et assurez-vous que cet utilisateur :
1. A accès sudo
2. Peut écrire dans `/opt/video-platform/`
3. Votre clé SSH est configurée pour cet utilisateur 