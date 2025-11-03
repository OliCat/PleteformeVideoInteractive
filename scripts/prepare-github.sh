#!/bin/bash

# Script pour préparer le dépôt pour GitHub
# Nettoie les IPs et domaines de production des scripts et documentation

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO] $1${NC}"; }
warning() { echo -e "${YELLOW}[WARNING] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}" >&2; }

# Fonction pour nettoyer un fichier
clean_file() {
    local file="$1"
    
    if [ ! -f "$file" ]; then
        warning "Fichier non trouvé: $file"
        return
    fi
    
    log "Nettoyage de $file..."
    
    # Remplacer les IPs et domaines par des placeholders
    sed -i.bak \
        -e 's/141\.95\.247\.203/<PUBLIC_SERVER_IP>/g' \
        -e 's/192\.168\.20\.125/<LXC_IP>/g' \
        -e 's/coop\.plateau-urbain\.com/<DOMAIN>/g' \
        -e 's/admin@coop\.plateau-urbain\.com/admin@<DOMAIN>/g' \
        "$file"
    
    # Supprimer le backup
    rm -f "${file}.bak"
}

# Scripts à nettoyer
SCRIPTS=(
    "scripts/reset-admin-password.sh"
    "scripts/reset-user-password.sh"
    "scripts/setup-lxc-backend.sh"
    "scripts/setup-firewall-lxc.sh"
    "scripts/setup-monitoring.sh"
    "scripts/deploy-frontend-public.sh"
    "scripts/test-deployment.sh"
    "scripts/fix-ssl-stapling-warnings.sh"
    "scripts/deploy-backend-lxc.sh"
    "scripts/fix-mongodb.sh"
    "scripts/verify-ssl.sh"
    "scripts/build-frontend.sh"
    "scripts/deploy-production.sh"
)

log "🧹 Nettoyage des scripts pour GitHub..."

for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        clean_file "$script"
    fi
done

log "✅ Nettoyage terminé !"
warning "⚠️  Vérifiez manuellement les modifications avant de commit"

