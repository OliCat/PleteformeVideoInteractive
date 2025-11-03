#!/bin/bash

# Script de vérification des secrets avant commit GitHub
# Vérifie qu'aucune IP, domaine ou secret de production n'est exposé

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓] $1${NC}"; }
warning() { echo -e "${YELLOW}[⚠] $1${NC}"; }
error() { echo -e "${RED}[✗] $1${NC}" >&2; }

ERRORS=0

# Patterns à détecter
PATTERNS=(
    "141\.95\.247\.203"
    "192\.168\.20\.125"
    "coop\.plateau-urbain\.com"
    "admin@coop\.plateau-urbain\.com"
)

# Fichiers à ignorer
IGNORE_FILES=(
    ".git"
    "node_modules"
    ".env"
    "doc-intermediaires"
    "doc-intermédiaires"
    ".bak"
    "prepare-github.sh"
    "check-secrets.sh"
    "build/"
    "frontend/build/"
    "backend/build/"
)

check_pattern() {
    local pattern="$1"
    local found=0
    
    while IFS= read -r file; do
        # Ignorer les fichiers dans IGNORE_FILES
        local skip=0
        for ignore in "${IGNORE_FILES[@]}"; do
            if [[ "$file" == *"$ignore"* ]]; then
                skip=1
                break
            fi
        done
        
        if [ $skip -eq 0 ]; then
            if grep -q "$pattern" "$file" 2>/dev/null; then
                error "Fichier contient '$pattern': $file"
                found=$((found + 1))
                ERRORS=$((ERRORS + 1))
            fi
        fi
    done < <(find . -type f ! -path "./.git/*" 2>/dev/null)
    
    if [ $found -eq 0 ]; then
        log "Aucune occurrence de '$pattern' trouvée"
    fi
}

log "🔍 Vérification des secrets avant commit GitHub..."
echo ""

for pattern in "${PATTERNS[@]}"; do
    check_pattern "$pattern"
done

echo ""
if [ $ERRORS -eq 0 ]; then
    log "✅ Aucun secret ou IP de production détecté !"
    exit 0
else
    error "❌ $ERRORS problème(s) détecté(s). Corrigez avant de commit."
    exit 1
fi

