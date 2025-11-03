# Plateforme Vidéo Interactive pour Coopérative

**Version** : V1.0 (Production)  
**Status** : ✅ Fonctionnelle et opérationnelle en production

Une plateforme web d'hébergement de vidéos avec parcours ludique à base de quiz, destinée à un usage privatif pour les membres d'une coopérative.

## 🚀 Fonctionnalités (V1.0)

### ✅ Implémenté et opérationnel

- **Authentification sécurisée** : Système de connexion avec JWT, protection brute force, gestion de profils
- **Parcours séquentiel** : Vidéos débloquées après réussite du quiz précédent (≥80%)
- **Quiz interactifs** : QCM, Vrai/Faux, questions ouvertes avec timer et explications
- **Gestion vidéo** : Upload, transcodage automatique (480p/720p/1080p), génération de thumbnails
- **Interface d'administration** : Gestion complète des utilisateurs, vidéos et quiz
- **Suivi de progression** : Historique détaillé des tentatives, scores, temps de visionnage
- **Lecteur vidéo avancé** : Tracking automatique de la progression, sauvegarde toutes les 10 secondes
- **Dashboard personnalisé** : Statistiques de progression, prochaine vidéo recommandée
- **Design responsive** : Interface moderne avec TailwindCSS, adaptée mobile et desktop

## 🏗️ Architecture

- **Frontend** : React.js (v18.2.0) + Redux Toolkit (v2.0.1) + TailwindCSS (v3.3.6)
- **Backend** : Node.js (v18+) + Express (v4.18.2) + MongoDB (v6+) + Mongoose (v8.0.3)
- **Vidéo** : FFmpeg (fluent-ffmpeg v2.1.2) + MP4 Range Requests (HLS prévu future version)
- **Sécurité** : JWT + Rate Limiting + Helmet + Express Validator

## 📋 Prérequis

- Node.js (v18+)
- MongoDB (v6+)
- FFmpeg
- Git

## 🛠️ Installation

### 1. Cloner le projet
```bash
git clone <repository-url>
cd PlateformeVideoInteractive
```

### 2. Installer les dépendances
```bash
npm run install:all
```

### 3. Configuration de l'environnement

Créer le fichier `backend/.env` :
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/video-platform
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=30d

# Upload configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=500000000
ALLOWED_VIDEO_FORMATS=mp4,avi,mov,mkv

# Video processing
FFMPEG_PATH=/usr/bin/ffmpeg
VIDEO_QUALITY_LEVELS=480p,720p,1080p

# Security
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Démarrage en mode développement
```bash
npm run dev
```

Cela démarre :
- Backend API sur http://localhost:5000
- Frontend React sur http://localhost:3000

## 📁 Structure du projet

```
PlateformeVideoInteractive/
├── architecture.md          # Documentation architecture
├── README.md               # Ce fichier
├── package.json           # Configuration workspace
├── backend/               # API Node.js
│   ├── controllers/       # Contrôleurs API
│   ├── middleware/        # Middlewares Express
│   ├── models/           # Modèles MongoDB
│   ├── routes/           # Routes API
│   ├── services/         # Services métier
│   ├── utils/            # Utilitaires
│   ├── uploads/          # Fichiers uploadés
│   └── server.js         # Point d'entrée
├── frontend/             # Application React
│   ├── public/           # Fichiers statiques
│   ├── src/
│   │   ├── components/   # Composants React
│   │   ├── pages/        # Pages de l'application
│   │   ├── store/        # Configuration Redux
│   │   ├── services/     # Services API
│   │   ├── hooks/        # Hooks personnalisés
│   │   ├── utils/        # Utilitaires
│   │   └── App.js        # Composant principal
└── docs/                 # Documentation
```

## 🔧 Scripts disponibles

- `npm run dev` : Démarrage en mode développement (backend + frontend)
- `npm run dev:backend` : Démarrage backend uniquement
- `npm run dev:frontend` : Démarrage frontend uniquement
- `npm run build` : Build de production
- `npm run start` : Démarrage en production
- `npm run install:all` : Installation de toutes les dépendances
- `npm run clean` : Nettoyage des node_modules

## 🌐 Déploiement (V1.0)

### Prérequis serveur
- **OS** : Ubuntu/Debian 11+
- **Node.js** : v18+ (recommandé v18.x LTS)
- **MongoDB** : v6+ (recommandé v6.x ou v7.x)
- **Nginx** : v1.18+ (reverse proxy)
- **FFmpeg** : v4.x+ (transcodage vidéo)
- **SSL** : Certificat Let's Encrypt (automatisé via certbot)

### Scripts de déploiement
Des scripts automatisés sont disponibles dans le dossier `scripts/` :
- `scripts/deploy-production.sh` : Déploiement complet
- `scripts/setup-backend-config.sh` : Configuration backend
- `scripts/configure-nginx-public.sh` : Configuration Nginx
- `scripts/install-debian11.sh` : Installation complète sur Debian 11

### Configuration
- **Documentation Nginx** : `docs/nginx-config.md`
- **Documentation authentification** : `docs/AUTHENTIFICATION.md`
- **Documentation architecture** : `architecture.md`

### Variables d'environnement requises
Consulter `backend/config/env.example` pour la liste complète des variables.

## 📊 Utilisation (V1.0)

### Compte administrateur par défaut
- Email: `admin@cooperative.local`
- Mot de passe: `admin123` (⚠️ **À changer immédiatement en production**)

### Workflow administrateur
1. Se connecter avec le compte admin
2. Accéder au dashboard d'administration
3. **Upload de vidéos** : Aller dans "Gérer les vidéos" → "Ajouter une vidéo"
   - Remplir le formulaire (titre, description, ordre)
   - Uploader le fichier vidéo (formats : mp4, avi, mov, mkv, webm)
   - La vidéo sera automatiquement transcodée en 3 qualités et un thumbnail généré
4. **Création de quiz** : Aller dans "Gérer les quiz" → "Créer un quiz"
   - Associer le quiz à une vidéo publiée
   - Ajouter des questions (QCM, Vrai/Faux, ou Texte)
   - Configurer le score de passage (défaut : 80%)
5. **Gestion des utilisateurs** : Créer, modifier, activer/désactiver les comptes

### Workflow utilisateur
1. **Inscription/Connexion** : Créer un compte ou se connecter
2. **Dashboard** : Consulter la progression, statistiques, prochaine vidéo
3. **Parcours d'apprentissage** : Accéder aux vidéos débloquées
4. **Visionnage** : Regarder la vidéo (la progression est sauvegardée automatiquement)
5. **Quiz** : Répondre aux questions après avoir visionné ≥90% de la vidéo
6. **Résultats** : Consulter le score et les explications
7. **Déblocage** : Si score ≥80%, la vidéo suivante est automatiquement débloquée
8. **Reprise** : Si échec, possibilité de retenter (selon configuration)

### Fonctionnalités clés
- **Déblocage séquentiel strict** : La première vidéo est toujours accessible. Les suivantes nécessitent la complétion de la précédente ET un quiz réussi
- **Suivi automatique** : La progression est sauvegardée toutes les 10 secondes
- **Statistiques** : Suivi du temps passé, nombre de vidéos complétées, taux de réussite

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -am 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Créer une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

Pour toute question ou problème, ouvrir une issue sur le repository Git. 