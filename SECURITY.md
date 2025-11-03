# 🔒 Guide de Sécurité

Ce document décrit les bonnes pratiques de sécurité pour contribuer à ce projet.

## ⚠️ Informations Sensibles

**NE JAMAIS COMMITTER** :
- ✅ Fichiers `.env` (déjà dans `.gitignore`)
- ✅ IPs de production (remplacées par `<PUBLIC_SERVER_IP>`, `<LXC_IP>`)
- ✅ Domaines de production (remplacés par `<DOMAIN>`)
- ✅ Secrets JWT ou mots de passe
- ✅ Certificats SSL (`.key`, `.crt`, `.pem`)
- ✅ Répertoire `doc-intermediaires/` (contient des informations de production)

## ✅ Vérification avant Commit

Avant de faire un commit, exécutez :

```bash
./scripts/check-secrets.sh
```

Ce script vérifie qu'aucune IP, domaine ou secret de production n'est exposé.

## 📝 Variables d'Environnement

Utilisez toujours les fichiers `.env.example` comme référence et créez vos propres fichiers `.env` localement.

**Backend** : `backend/config/env.example`  
**Frontend** : Créez `.env.production` avec `REACT_APP_API_URL`

## 🔧 Scripts de Déploiement

Tous les scripts de déploiement utilisent des paramètres ou des variables d'environnement. Les valeurs par défaut sont des placeholders (`<DOMAIN>`, `<PUBLIC_SERVER_IP>`, etc.) qui doivent être remplacés lors de l'utilisation.

## 📚 Documentation

La documentation dans `docs/` ne contient pas d'informations de production. Tous les exemples utilisent des placeholders ou des valeurs génériques.

## 🛡️ Bonnes Pratiques

1. **Toujours** utiliser des variables d'environnement pour les secrets
2. **Toujours** vérifier avec `check-secrets.sh` avant de commit
3. **Ne jamais** hardcoder des IPs, domaines ou secrets dans le code
4. **Utiliser** `.env.example` comme modèle pour la configuration
5. **Ignorer** les fichiers de build dans Git (déjà configuré)

## 🚨 Si vous avez commité des secrets

1. **Immédiatement** : Révoquer/renouveler les secrets exposés
2. **Nettoyer** l'historique Git si nécessaire
3. **Vérifier** que les secrets ne sont plus dans le dépôt

