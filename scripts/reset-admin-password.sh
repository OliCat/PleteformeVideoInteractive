#!/bin/bash

# Script pour réinitialiser le mot de passe admin
# Usage: ./reset-admin-password.sh [jump-host] [lxc-ip] [lxc-user] [new-password]
# Exemple: ./reset-admin-password.sh root@<PUBLIC_SERVER_IP> <LXC_IP> root "NouveauMotDePasse123!"

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
# Usage: ./reset-admin-password.sh <JUMP_HOST> <LXC_IP> <LXC_USER> <NEW_PASSWORD>
# Exemple: ./reset-admin-password.sh root@votre-serveur.com 192.168.1.100 root "MonNouveauMotDePasse123!"
JUMP_HOST=${1:-""}
LXC_IP=${2:-""}
LXC_USER=${3:-"root"}
NEW_PASSWORD=${4:-""}
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@votre-domaine.com}"
SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=no"

# Commande SSH avec jump host
ssh_cmd() {
    ssh $SSH_OPTS -J $JUMP_HOST $LXC_USER@$LXC_IP "$@"
}

# Vérifications préliminaires
check_prerequisites() {
    if [ -z "$NEW_PASSWORD" ]; then
        error "❌ Nouveau mot de passe requis"
        echo "Usage: $0 <jump-host> <lxc-ip> <lxc-user> <new-password>"
        echo "Exemple: $0 root@<PUBLIC_SERVER_IP> <LXC_IP> root \"MonNouveauMotDePasse123!\""
        exit 1
    fi
    
    if [ ${#NEW_PASSWORD} -lt 6 ]; then
        error "❌ Le mot de passe doit contenir au moins 6 caractères"
        exit 1
    fi
}

# Créer script Node.js pour réinitialiser le mot de passe
reset_admin_password() {
    log "🔑 Réinitialisation du mot de passe admin..."
    
    ssh_cmd << EOF
cd /opt/video-platform/app/backend

# Charger les variables d'environnement
export \$(grep -v '^#' .env | xargs)

cat > reset-admin-password.js << 'NODE_SCRIPT'
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    role: String,
    firstName: String,
    lastName: String,
    isActive: Boolean,
    loginAttempts: Number,
    lockUntil: Date
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

async function resetPassword() {
    try {
        // Connexion à MongoDB
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/video-platform';
        console.log('🔌 Connexion à MongoDB...');
        await mongoose.connect(mongoURI);
        console.log('✅ Connecté à MongoDB');
        
        // Trouver l'admin
        const adminEmail = '$ADMIN_EMAIL';
        const newPassword = '$NEW_PASSWORD';
        const admin = await User.findOne({ email: adminEmail });
        
        if (!admin) {
            console.log('📝 Utilisateur admin non trouvé, création...');
            
            // Créer l'admin
            const salt = await bcrypt.genSalt(12);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            
            const newAdmin = new User({
                username: 'admin',
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
                firstName: 'Admin',
                lastName: 'User',
                isActive: true,
                loginAttempts: 0
            });
            
            await newAdmin.save();
            console.log('✅ Utilisateur admin créé avec succès');
            console.log('📧 Email: ' + adminEmail);
            console.log('🔑 Mot de passe: ' + newPassword);
        } else {
            console.log('✅ Utilisateur admin trouvé');
            console.log('📧 Email: ' + admin.email);
            console.log('👤 Username: ' + admin.username);
            console.log('🔓 Déverrouillage du compte...');
            
            // Réinitialiser le mot de passe et déverrouiller le compte
            const salt = await bcrypt.genSalt(12);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            
            admin.password = hashedPassword;
            admin.loginAttempts = 0;
            admin.lockUntil = undefined;
            admin.isActive = true;
            
            await admin.save();
            console.log('✅ Mot de passe admin réinitialisé avec succès');
            console.log('🔑 Nouveau mot de passe: ' + newPassword);
            console.log('🔓 Compte déverrouillé');
        }
        
        mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

resetPassword();
NODE_SCRIPT

node reset-admin-password.js
rm -f reset-admin-password.js
EOF
    
    log "✅ Mot de passe admin réinitialisé"
}

# Vérifier la connexion
test_login() {
    log "🧪 Test de connexion avec le nouveau mot de passe..."
    
    RESPONSE=$(curl -s -X POST https://<DOMAIN>/api/auth/login \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$NEW_PASSWORD\"}")
    
    if echo "$RESPONSE" | grep -q "success.*true\|Connexion réussie"; then
        log "✅ Connexion réussie !"
        return 0
    else
        warning "⚠️ Test de connexion échoué"
        info "Réponse: $RESPONSE"
        return 1
    fi
}

# Afficher informations
show_info() {
    log "📋 Informations :"
    echo ""
    info "📧 Email: $ADMIN_EMAIL"
    info "👤 Username: admin"
    info "🔑 Nouveau mot de passe: $NEW_PASSWORD"
    echo ""
    info "🌐 URL de connexion: https://<DOMAIN>/login"
    echo ""
    warning "⚠️ IMPORTANT : Changez ce mot de passe après votre première connexion"
}

# Fonction principale
main() {
    log "🚀 Démarrage de la réinitialisation du mot de passe admin..."
    
    check_prerequisites
    reset_admin_password
    sleep 2
    test_login
    show_info
    
    log "✅ Réinitialisation terminée avec succès !"
}

# Exécution
main "$@"

