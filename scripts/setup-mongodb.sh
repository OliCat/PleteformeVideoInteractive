#!/bin/bash

# Script de configuration MongoDB - Phase 1.2
# Usage: ./setup-mongodb.sh [jump-host] [lxc-ip] [lxc-user] [mongo-admin-password]

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
MONGO_ADMIN_PASSWORD=${4:-""}
SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=no"

# Commande SSH avec jump host
ssh_cmd() {
    ssh $SSH_OPTS -J $JUMP_HOST $LXC_USER@$LXC_IP "$@"
}

# Vérifications préliminaires
check_prerequisites() {
    if [ -z "$JUMP_HOST" ] || [ -z "$LXC_IP" ]; then
        error "Jump host et IP LXC requis"
        echo "Usage: $0 <jump-host> <lxc-ip> [lxc-user] [mongo-admin-password]"
        exit 1
    fi
    
    if [ -z "$MONGO_ADMIN_PASSWORD" ]; then
        warning "⚠️ Aucun mot de passe MongoDB admin fourni"
        warning "   L'authentification sera configurée si nécessaire"
    fi
}

# Vérifier état MongoDB
check_mongodb_status() {
    log "📦 Vérification état MongoDB..."
    
    if ssh_cmd "systemctl is-active --quiet mongod 2>/dev/null"; then
        log "✅ MongoDB (mongod) est actif"
        MONGO_SERVICE="mongod"
    elif ssh_cmd "systemctl is-active --quiet mongodb 2>/dev/null"; then
        log "✅ MongoDB (mongodb) est actif"
        MONGO_SERVICE="mongodb"
    else
        log "🔄 Démarrage de MongoDB..."
        
        # Détecter quel service existe
        if ssh_cmd "systemctl list-unit-files | grep -q mongod.service"; then
            MONGO_SERVICE="mongod"
        else
            MONGO_SERVICE="mongodb"
        fi
        
        # Démarrer le service
        ssh_cmd "sudo systemctl start $MONGO_SERVICE || true"
        
        # Attendre que MongoDB soit prêt (max 30 secondes)
        log "⏳ Attente que MongoDB démarre..."
        STARTED=false
        for i in {1..30}; do
            if ssh_cmd "mongosh --quiet --eval \"db.adminCommand('ping').ok\" >/dev/null 2>&1"; then
                log "✅ MongoDB démarré et prêt"
                STARTED=true
                break
            fi
            sleep 1
        done
        
        if [ "$STARTED" = "false" ]; then
            error "❌ Impossible de démarrer MongoDB"
            warning "📋 Dernières lignes des logs:"
            ssh_cmd "sudo journalctl -u $MONGO_SERVICE -n 20 --no-pager 2>/dev/null || echo 'Aucun log trouvé'"
            warning "💡 Essayez de réparer avec: ./scripts/fix-mongodb.sh $JUMP_HOST $LXC_IP $LXC_USER"
            exit 1
        fi
    fi
}

# Configurer bind IP
configure_mongodb_bind() {
    log "🔒 Configuration bind IP MongoDB (127.0.0.1 uniquement)..."
    
    # Détecter le fichier de config
    MONGO_CONF=$(ssh_cmd "test -f /etc/mongod.conf && echo /etc/mongod.conf || echo /etc/mongodb.conf")
    
    ssh_cmd << EOF
if ! sudo grep -q "bindIp: 127.0.0.1" $MONGO_CONF 2>/dev/null; then
    echo "📝 Mise à jour de la configuration..."
    sudo sed -i 's/^  bindIp:.*/  bindIp: 127.0.0.1/' $MONGO_CONF || true
    sudo systemctl restart $MONGO_SERVICE
    sleep 2
    echo "✅ Bind IP configuré"
else
    echo "✅ Bind IP déjà configuré sur 127.0.0.1"
fi
EOF
    
    log "✅ Configuration bind IP terminée"
}

# Créer utilisateur admin MongoDB
create_mongo_admin() {
    if [ -z "$MONGO_ADMIN_PASSWORD" ]; then
        warning "⚠️ Création utilisateur admin MongoDB ignorée (pas de mot de passe fourni)"
        return
    fi
    
    log "👤 Création utilisateur admin MongoDB..."
    
    ssh_cmd << EOF
mongosh --quiet << 'MONGO_SCRIPT'
try {
    var adminDb = db.getSiblingDB('admin');
    
    // Vérifier si l'utilisateur admin existe
    var adminExists = adminDb.getUser('admin');
    
    if (adminExists) {
        print('✅ Utilisateur admin existe déjà');
        // Mettre à jour le mot de passe si nécessaire
        adminDb.changeUserPassword('admin', '$MONGO_ADMIN_PASSWORD');
        print('✅ Mot de passe admin mis à jour');
    } else {
        adminDb.createUser({
            user: 'admin',
            pwd: '$MONGO_ADMIN_PASSWORD',
            roles: ['userAdminAnyDatabase', 'dbAdminAnyDatabase', 'readWriteAnyDatabase']
        });
        print('✅ Utilisateur admin créé');
    }
} catch (e) {
    print('⚠️ Erreur lors de la création de l admin: ' + e.message);
    print('   Cela peut être normal si l authentification est déjà activée');
}
MONGO_SCRIPT
EOF
}

# Supprimer base de données existante si demandé
drop_existing_database() {
    log "🗑️  Suppression base de données existante..."
    
    # Détecter le service MongoDB
    if ssh_cmd "systemctl is-active --quiet mongod 2>/dev/null"; then
        MONGO_SERVICE="mongod"
    else
        MONGO_SERVICE="mongodb"
    fi
    
    # Vérifier si l'authentification est activée
    MONGO_CONF=$(ssh_cmd "test -f /etc/mongod.conf && echo /etc/mongod.conf || echo /etc/mongodb.conf")
    AUTH_ENABLED=$(ssh_cmd "sudo grep -q 'authorization: enabled' $MONGO_CONF 2>/dev/null && echo 'yes' || echo 'no'")
    
    if [ "$AUTH_ENABLED" = "yes" ]; then
        log "⚠️ Authentification MongoDB activée, désactivation temporaire pour supprimer la base..."
        
        # Désactiver temporairement l'authentification en supprimant la section security
        ssh_cmd << EOF
# Sauvegarder la config actuelle
sudo cp $MONGO_CONF ${MONGO_CONF}.auth_backup

# Supprimer les lignes security et authorization (suppression complète, pas de commentaire)
sudo sed -i '/^security:/d' $MONGO_CONF
sudo sed -i '/^  authorization:/d' $MONGO_CONF

sudo systemctl restart $MONGO_SERVICE

# Attendre que MongoDB soit prêt (max 30 secondes)
for i in {1..30}; do
    if mongosh --quiet --eval "db.adminCommand('ping').ok" >/dev/null 2>&1; then
        echo "✅ MongoDB prêt"
        break
    fi
    sleep 1
done
EOF
        
        log "✅ Authentification temporairement désactivée"
    fi
    
    ssh_cmd << 'EOF'
mongosh --quiet << MONGO_SCRIPT
try {
    var db = db.getSiblingDB('video-platform');
    
    // Supprimer l'utilisateur s'il existe
    try {
        db.dropUser('videoapp');
        print('✅ Utilisateur videoapp supprimé');
    } catch (e) {
        print('ℹ️ Utilisateur videoapp n existe pas ou déjà supprimé');
    }
    
    // Supprimer la base de données
    db.dropDatabase();
    print('✅ Base de données video-platform supprimée');
} catch (e) {
    print('⚠️ Erreur lors de la suppression: ' + e.message);
    print('   Cela peut être normal si la base n existe pas');
}
MONGO_SCRIPT
EOF
    
    # Réactiver l'authentification si elle était activée
    if [ "$AUTH_ENABLED" = "yes" ]; then
        log "🔒 Réactivation de l'authentification MongoDB..."
        
        ssh_cmd << EOF
# Restaurer la configuration d'origine depuis la sauvegarde
if [ -f ${MONGO_CONF}.auth_backup ]; then
    sudo cp ${MONGO_CONF}.auth_backup $MONGO_CONF
    sudo rm -f ${MONGO_CONF}.auth_backup
else
    # Si pas de backup, réinsérer la section security avant setParameter
    sudo sed -i '/^setParameter:/i\
security:\
  authorization: enabled' $MONGO_CONF
fi

# Redémarrer MongoDB
sudo systemctl restart $MONGO_SERVICE
sleep 5

# Attendre que MongoDB soit prêt (max 30 secondes)
for i in {1..30}; do
    if mongosh --quiet --eval "db.adminCommand('ping').ok" >/dev/null 2>&1; then
        echo "✅ MongoDB prêt"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "⚠️ MongoDB n'a pas démarré, vérification..."
        sudo systemctl status $MONGO_SERVICE --no-pager | head -20
    fi
    sleep 1
done
EOF
        
        log "✅ Authentification réactivée"
    fi
    
    log "✅ Base de données supprimée"
}

# Créer base de données et utilisateur application
create_app_database() {
    log "📊 Création base de données video-platform..."
    
    # Demander si on doit supprimer la base existante
    read -p "Supprimer la base de données existante (si elle existe) ? (o/N): " DROP_DB
    if [[ $DROP_DB =~ ^[Oo]$ ]]; then
        drop_existing_database
    fi
    
    # Générer un mot de passe aléatoire pour l'utilisateur app
    APP_USER_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    # Détecter le service MongoDB
    if ssh_cmd "systemctl is-active --quiet mongod 2>/dev/null"; then
        MONGO_SERVICE="mongod"
    else
        MONGO_SERVICE="mongodb"
    fi
    
    # Vérifier si l'authentification est activée
    MONGO_CONF=$(ssh_cmd "test -f /etc/mongod.conf && echo /etc/mongod.conf || echo /etc/mongodb.conf")
    AUTH_ENABLED=$(ssh_cmd "sudo grep -q 'authorization: enabled' $MONGO_CONF 2>/dev/null && echo 'yes' || echo 'no'")
    
    if [ "$AUTH_ENABLED" = "yes" ]; then
        log "⚠️ Authentification MongoDB activée, désactivation temporaire pour créer l'utilisateur..."
        
        # Désactiver temporairement l'authentification en supprimant la section security
        ssh_cmd << EOF
# Sauvegarder la config actuelle
sudo cp $MONGO_CONF ${MONGO_CONF}.auth_backup

# Supprimer les lignes security et authorization (suppression complète, pas de commentaire)
sudo sed -i '/^security:/d' $MONGO_CONF
sudo sed -i '/^  authorization:/d' $MONGO_CONF

sudo systemctl restart $MONGO_SERVICE

# Attendre que MongoDB soit prêt (max 30 secondes)
for i in {1..30}; do
    if mongosh --quiet --eval "db.adminCommand('ping').ok" >/dev/null 2>&1; then
        echo "✅ MongoDB prêt"
        break
    fi
    sleep 1
done
EOF
        
        log "✅ Authentification temporairement désactivée"
    fi
    
    # Créer l'utilisateur
    ssh_cmd << EOF
mongosh --quiet << 'MONGO_SCRIPT'
try {
    var db = db.getSiblingDB('video-platform');
    
    // Créer la base de données (se fait automatiquement avec l'insertion)
    db.createCollection('temp');
    db.temp.insertOne({temp: true});
    db.temp.drop();
    
    // Supprimer l'utilisateur s'il existe déjà
    try {
        db.dropUser('videoapp');
        print('ℹ️ Utilisateur videoapp existant supprimé');
    } catch (e) {
        // L'utilisateur n'existe pas, c'est OK
    }
    
    // Créer l'utilisateur
    db.createUser({
        user: 'videoapp',
        pwd: '$APP_USER_PASSWORD',
        roles: ['readWrite']
    });
    print('✅ Utilisateur videoapp créé');
    print('MONGODB_APP_PASSWORD=$APP_USER_PASSWORD');
} catch (e) {
    print('❌ Erreur lors de la création: ' + e.message);
    process.exit(1);
}
MONGO_SCRIPT
EOF
    
    # Réactiver l'authentification si elle était activée
    if [ "$AUTH_ENABLED" = "yes" ]; then
        log "🔒 Réactivation de l'authentification MongoDB..."
        
        ssh_cmd << EOF
# Restaurer la configuration d'origine depuis la sauvegarde
if [ -f ${MONGO_CONF}.auth_backup ]; then
    sudo cp ${MONGO_CONF}.auth_backup $MONGO_CONF
    sudo rm -f ${MONGO_CONF}.auth_backup
else
    # Si pas de backup, réinsérer la section security avant setParameter
    sudo sed -i '/^setParameter:/i\
security:\
  authorization: enabled' $MONGO_CONF
fi

# Redémarrer MongoDB
sudo systemctl restart $MONGO_SERVICE
sleep 5

# Attendre que MongoDB soit prêt (max 30 secondes)
for i in {1..30}; do
    if mongosh --quiet --eval "db.adminCommand('ping').ok" >/dev/null 2>&1; then
        echo "✅ MongoDB prêt"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "⚠️ MongoDB n'a pas démarré, vérification..."
        sudo systemctl status $MONGO_SERVICE --no-pager | head -20
    fi
    sleep 1
done
EOF
        
        log "✅ Authentification réactivée"
    fi
    
    # Extraire le mot de passe depuis la sortie
    MONGODB_URI="mongodb://videoapp:${APP_USER_PASSWORD}@localhost:27017/video-platform"
    echo ""
    warning "📝 IMPORTANT - Sauvegardez ces informations :"
    echo "   Base de données: video-platform"
    echo "   Utilisateur: videoapp"
    echo "   Mot de passe: $APP_USER_PASSWORD"
    echo "   URI MongoDB: $MONGODB_URI"
    echo ""
    echo "MONGODB_URI=$MONGODB_URI" > /tmp/mongodb_uri.txt
    info "URI sauvegardée dans /tmp/mongodb_uri.txt"
}

# Activer authentification MongoDB
enable_mongodb_auth() {
    log "🔒 Activation authentification MongoDB..."
    
    MONGO_CONF=$(ssh_cmd "test -f /etc/mongod.conf && echo /etc/mongod.conf || echo /etc/mongodb.conf")
    
    ssh_cmd << EOF
if ! sudo grep -q "^security:" $MONGO_CONF 2>/dev/null; then
    echo "📝 Ajout configuration sécurité..."
    echo "" | sudo tee -a $MONGO_CONF > /dev/null
    echo "security:" | sudo tee -a $MONGO_CONF > /dev/null
    echo "  authorization: enabled" | sudo tee -a $MONGO_CONF > /dev/null
    
    sudo systemctl restart $MONGO_SERVICE
    sleep 2
    echo "✅ Authentification activée"
else
    if sudo grep -q "authorization: enabled" $MONGO_CONF; then
        echo "✅ Authentification déjà activée"
    else
        echo "📝 Mise à jour configuration sécurité..."
        sudo sed -i '/^security:/a\  authorization: enabled' $MONGO_CONF
        sudo systemctl restart $MONGO_SERVICE
        sleep 2
        echo "✅ Authentification activée"
    fi
fi
EOF
    
    log "✅ Configuration authentification terminée"
}

# Fonction principale
main() {
    log "🚀 Démarrage de la configuration MongoDB..."
    
    check_prerequisites
    check_mongodb_status
    configure_mongodb_bind
    
    # Si mot de passe admin fourni, créer admin et activer auth
    if [ -n "$MONGO_ADMIN_PASSWORD" ]; then
        create_mongo_admin
        enable_mongodb_auth
    else
        warning "⚠️ Authentification MongoDB non configurée (pas de mot de passe admin fourni)"
        warning "   Vous pouvez la configurer manuellement plus tard"
    fi
    
    create_app_database
    
    log "✅ Configuration MongoDB terminée !"
    log "📝 Prochaine étape : Création fichier .env backend (Phase 1.3)"
}

# Exécution
main "$@"
