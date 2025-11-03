# Guide de publication sur GitHub

## ✅ Préparation

1. **Vérification des fichiers sensibles** : Les fichiers suivants sont déjà exclus via `.gitignore` :
   - `.env` et variantes
   - `node_modules/`
   - `charte-graphique/` (ajouté)
   - `doc-intermediaires/`
   - Fichiers de logs, uploads, vidéos, etc.

2. **Optionnel : Nettoyer les scripts de production** (si vous avez des IPs/domaines en dur) :
   ```bash
   ./scripts/prepare-github.sh
   ```

## 🚀 Étapes de publication

### 1. Initialiser Git (si pas déjà fait)
```bash
cd /Users/ogrieco/PlateformeVideoInteractive
git init
```

### 2. Vérifier ce qui sera ajouté
```bash
git status
```

### 3. Ajouter tous les fichiers (sauf ceux dans .gitignore)
```bash
git add .
```

### 4. Vérifier à nouveau ce qui sera commité
```bash
git status
```

### 5. Créer le premier commit
```bash
git commit -m "Initial commit: Plateforme Vidéo Interactive V1.0"
```

### 6. Créer le dépôt sur GitHub
- Aller sur https://github.com
- Cliquer sur "New repository"
- Donner un nom (ex: `PlateformeVideoInteractive`)
- **NE PAS** initialiser avec README, .gitignore ou licence (le projet existe déjà)
- Cliquer sur "Create repository"

### 7. Connecter le dépôt local à GitHub
```bash
# Remplacer <votre-username> et <nom-du-repo> par vos valeurs
git remote add origin https://github.com/<votre-username>/<nom-du-repo>.git
```

### 8. Renommer la branche principale en "main" (si nécessaire)
```bash
git branch -M main
```

### 9. Pousser le code sur GitHub
```bash
git push -u origin main
```

## 📝 Commandes complètes (copier-coller)

```bash
# 1. Initialiser Git
cd /Users/ogrieco/PlateformeVideoInteractive
git init

# 2. Vérifier les fichiers
git status

# 3. Ajouter les fichiers
git add .

# 4. Commit initial
git commit -m "Initial commit: Plateforme Vidéo Interactive V1.0"

# 5. Ajouter le remote (REMPLACER par vos valeurs)
git remote add origin https://github.com/VOTRE-USERNAME/VOTRE-REPO.git

# 6. Renommer la branche
git branch -M main

# 7. Pousser sur GitHub
git push -u origin main
```

## ⚠️ Vérifications importantes

Avant de pousser, vérifiez que ces fichiers ne sont **PAS** dans le commit :
- ❌ `.env` (backend/.env, frontend/.env.*)
- ❌ `node_modules/`
- ❌ `charte-graphique/`
- ❌ `doc-intermediaires/`
- ❌ Fichiers de logs, vidéos, uploads

Pour vérifier ce qui sera commité :
```bash
git status
git ls-files | grep -E "(\.env|node_modules|charte-graphique)"
```

Si vous voyez des fichiers sensibles, ils ne devraient pas apparaître. Sinon, vérifiez votre `.gitignore`.

## 🔒 Sécurité

- Les fichiers `.env` sont ignorés par Git
- Les secrets (JWT_SECRET, MONGODB_URI, etc.) ne seront **jamais** publiés
- Créez un fichier `backend/config/env.example` si ce n'est pas déjà fait pour documenter les variables nécessaires

## 📦 Après la publication

1. Ajouter un fichier `LICENSE` si nécessaire
2. Configurer les "Secrets" dans GitHub (Settings → Secrets) pour CI/CD si vous utilisez GitHub Actions
3. Ajouter des descriptions dans le README si besoin
4. Configurer les "Topics" sur GitHub pour faciliter la découverte

## 🆘 En cas de problème

Si vous avez déjà un dépôt Git initialisé :
```bash
git remote -v  # Voir les remotes existants
git remote remove origin  # Supprimer l'ancien remote si nécessaire
```

Si vous avez déjà commité des fichiers sensibles :
```bash
# Supprimer de l'historique (attention, cela réécrit l'historique)
git filter-branch --tree-filter 'rm -rf chemin/vers/fichier' HEAD
# Ou utiliser git-filter-repo (plus moderne)
```

