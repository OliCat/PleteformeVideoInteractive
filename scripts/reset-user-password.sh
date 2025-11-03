#!/bin/bash

# Script pour réinitialiser le mot de passe d'un utilisateur
# Usage: ./reset-user-password.sh [jump-host] [lxc-ip] [lxc-user] [user-email] [new-password]

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"; }
warning() { echo -e "${YELLOW}[WARNING] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}" >&2; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }

# Configuration
JUMP_HOST=${1:-"root@<PUBLIC_SERVER_IP>"}
LXC_IP=${2:-"<LXC_IP>"}
LXC_USER=${3:-"root"}
USER_EMAIL=${4:-""}
NEW_PASSWORD=${5:-""}

if [ -z "$USER_EMAIL" ] || [ -z "$NEW_PASSWORD" ]; then
    error "Email utilisateur et nouveau mot de passe requis"
    echo "Usage: $0 [jump-host] [lxc-ip] [lxc-user] <user-email> <new-password>"
    exit 1
fi

ssh_cmd() {
    ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -J $JUMP_HOST $LXC_USER@$LXC_IP "$@"
}

reset_user_password() {
    log "🔑 Réinitialisation du mot de passe pour $USER_EMAIL..."
    
    ssh_cmd << EOF
cd /opt/video-platform/app/backend

# Charger les variables d'environnement
export \$(grep -v '^#' .env | xargs)

cat > reset-user-password.js << 'NODE_SCRIPT'
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
        
        // Trouver l'utilisateur
        const userEmail = '$USER_EMAIL';
        const newPassword = '$NEW_PASSWORD';
        const user = await User.findOne({ email: userEmail }).select('+password');
        
        if (!user) {
            console.error('❌ Utilisateur non trouvé: ' + userEmail);
            process.exit(1);
        }
        
        console.log('✅ Utilisateur trouvé: ' + user.email);
        console.log('👤 Username: ' + user.username);
        console.log('🔓 Déverrouillage du compte...');
        
        // Réinitialiser le mot de passe et déverrouiller le compte
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        user.password = hashedPassword;
        user.loginAttempts = 0;
        user.lockUntil = undefined;
        user.isActive = true;
        
        await user.save();
        console.log('✅ Mot de passe réinitialisé avec succès');
        console.log('🔑 Nouveau mot de passe: ' + newPassword);
        console.log('🔓 Compte déverrouillé');
        
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

node reset-user-password.js
rm -f reset-user-password.js
EOF
    
    log "✅ Mot de passe réinitialisé"
    warning "📝 IMPORTANT - Nouveau mot de passe pour $USER_EMAIL : $NEW_PASSWORD"
}

reset_user_password

