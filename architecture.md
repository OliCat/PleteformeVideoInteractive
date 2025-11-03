# Architecture de la plateforme vidéo interactive pour coopérative

**Version** : V1.0 (Production)  
**Dernière mise à jour** : Novembre 2025

## Vue d'ensemble

Cette plateforme est une application web d'hébergement de vidéos avec parcours ludique à base de quiz, destinée à un usage privatif pour les membres d'une coopérative. L'application permet de suivre un parcours séquentiel où chaque vidéo est suivie d'un quiz dont la réussite (80% minimum) débloque l'accès à la vidéo suivante.

**Status actuel** : ✅ **Version 1.0 en production** - Plateforme fonctionnelle et opérationnelle.

## 1. Architecture technique

### 1.1 Infrastructure

- **Hébergement** : Container (CT) sur infrastructure OVH
- **Système d'exploitation** : Linux (Ubuntu/Debian)
- **Serveur web** : Nginx (reverse proxy + serveur de fichiers statiques)
- **Sécurité** : Certificats SSL Let's Encrypt, authentification JWT

### 1.2 Stack technologique

**Frontend** :
- React.js (v18.2.0) pour l'interface utilisateur
- Redux Toolkit (@reduxjs/toolkit v2.0.1) pour la gestion d'état
- React Router DOM (v6.20.1) pour la navigation
- Axios (v1.6.2) pour les requêtes API
- React Player (v2.16.1) pour la lecture vidéo
- TailwindCSS (v3.3.6) pour le styling
- React Hook Form (v7.48.2) pour les formulaires
- React Hot Toast (v2.4.1) pour les notifications

**Backend** :
- Node.js (v18+) avec Express (v4.18.2) pour l'API REST
- MongoDB (v6+) via Mongoose (v8.0.3) pour la base de données
- JWT (jsonwebtoken v9.0.2) pour l'authentification
- Multer (v1.4.5-lts.1) pour la gestion des uploads
- Helmet (v7.1.0) pour la sécurité HTTP
- Express Rate Limit (v7.1.5) pour la protection contre les attaques
- Express Validator (v7.0.1) pour la validation des données
- Morgan (v1.10.0) pour le logging
- Compression (v1.7.4) pour l'optimisation des réponses

**Traitement vidéo** :
- FFmpeg via fluent-ffmpeg (v2.1.2) pour le transcodage et la génération de thumbnails
- Transcodage en plusieurs qualités (480p, 720p, 1080p) - **implémenté**
- Diffusion vidéo MP4 directe via HTTP Range Requests - **actuellement en production**
- HLS (HTTP Live Streaming) - **prévu pour future version** (infrastructure prête, non activée)

### 1.3 Stockage et diffusion vidéo (V1.0 - Production)

**Actuellement implémenté** :
- Stockage direct sur le serveur (système de fichiers)
- Diffusion vidéo MP4 via HTTP Range Requests (streaming progressif)
- Support des requêtes Range pour la lecture séquentielle
- Transcodage automatique en plusieurs résolutions (480p, 720p, 1080p) lors de l'upload
- Génération automatique de thumbnails (JPEG 320x240) à partir des vidéos
- Sélection manuelle de la qualité par l'utilisateur
- CORS configuré pour le streaming vidéo
- Cache Nginx pour les fichiers vidéo

**Prévu pour future version** :
- Streaming HLS adaptatif automatique (infrastructure prête, non activée)
- URLs signées temporairement pour la sécurité avancée
- Adaptation automatique de la qualité selon la bande passante

### 1.4 Schéma d'infrastructure

```
                         +---------------+
                         |   Navigateur  |
                         |  Utilisateur  |
                         +-------+-------+
                                 |
                                 | HTTPS
                                 v
+----------+            +--------+--------+
| MongoDB  | <------->  |      Nginx      | <-- Certificat SSL
+----------+            |  (Reverse Proxy) |
                        +--------+--------+
                                 |
                 +---------------+---------------+
                 |                               |
        +--------v--------+            +---------v---------+
        |                 |            |                   |
        | Application     |            | Système de        |
        | Node.js/Express |            | fichiers vidéos   |
        |                 |            |                   |
        +-----------------+            +-------------------+
```

## 2. Architecture applicative

### 2.1 Modèle de données

**Collection Users** :
```json
{
  "_id": "ObjectId",
  "username": "String (unique, 3-50 chars)",
  "email": "String (unique, lowercase)",
  "password": "String (hashed bcrypt, salt 12)",
  "role": "String (admin/user)",
  "firstName": "String (optionnel)",
  "lastName": "String (optionnel)",
  "isActive": "Boolean (défaut: true)",
  "lastLogin": "Date",
  "loginAttempts": "Number (protection brute force)",
  "lockUntil": "Date (verrouillage temporaire)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

**Collection Videos** :
```json
{
  "_id": "ObjectId",
  "title": "String (required, 1-200 chars)",
  "description": "String (optionnel, max 1000 chars)",
  "filePath": "String (dossier de stockage)",
  "originalFileName": "String",
  "mimeType": "String",
  "fileSize": "Number (bytes)",
  "duration": "Number (secondes)",
  "thumbnailPath": "String",
  "order": "Number (unique, required, min: 1)",
  "quizId": "ObjectId (référence Quiz)",
  "qualities": [{
    "quality": "String (480p|720p|1080p)",
    "path": "String",
    "bitrate": "Number",
    "fileSize": "Number"
  }],
  "hlsPath": "String (prévu pour HLS)",
  "processingStatus": "String (pending|processing|completed|failed)",
  "processingError": "String",
  "metadata": {
    "width": "Number",
    "height": "Number",
    "frameRate": "Number",
    "bitrate": "Number",
    "codec": "String"
  },
  "viewCount": "Number (défaut: 0)",
  "isPublished": "Boolean (défaut: false)",
  "publishedAt": "Date",
  "createdBy": "ObjectId (référence User)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

**Collection Quizzes** :
```json
{
  "_id": "ObjectId",
  "title": "String (required, max 100 chars)",
  "description": "String (optionnel, max 500 chars)",
  "videoId": "ObjectId (référence Video, required)",
  "questions": [{
    "_id": "String",
    "question": "String (required, max 500 chars)",
    "type": "String (multiple-choice|true-false|text-input)",
    "options": [{
      "_id": "String",
      "text": "String (required, max 200 chars)",
      "isCorrect": "Boolean",
      "explanation": "String (optionnel, max 300 chars)"
    }],
    "correctAnswer": "String (pour text-input, max 200 chars)",
    "points": "Number (1-10, défaut: 1)",
    "timeLimit": "Number (secondes, 5-300, défaut: 30)",
    "order": "Number (required, min: 1)"
  }],
  "difficulty": "String (facile|intermédiaire|difficile, défaut: intermédiaire)",
  "passingScore": "Number (1-100, required)",
  "timeLimit": "Number (secondes, 0-3600, défaut: 0 = illimité)",
  "isActive": "Boolean (défaut: true)",
  "isRandomized": "Boolean (défaut: false)",
  "allowRetake": "Boolean (défaut: true)",
  "maxAttempts": "Number (1-10, défaut: 3)",
  "tags": ["String (max 50 chars)"],
  "createdBy": "ObjectId (référence User)",
  "updatedBy": "ObjectId (référence User)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

**Collection UserProgress** :
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (référence User, unique)",
  "completedVideos": ["ObjectId (référence Video)"],
  "currentPosition": "Number (défaut: 1, min: 1)",
  "videoWatchTimes": [{
    "videoId": "ObjectId (référence Video)",
    "totalWatchTime": "Number (secondes)",
    "watchSessions": [{
      "startTime": "Number (position en secondes)",
      "endTime": "Number (position en secondes)",
      "sessionDuration": "Number (secondes)",
      "timestamp": "Date"
    }],
    "completionPercentage": "Number (0-100)",
    "isCompleted": "Boolean (≥90% visionné)",
    "lastWatchedPosition": "Number (secondes)"
  }],
  "quizAttempts": [{
    "quizId": "ObjectId (référence Quiz)",
    "attemptNumber": "Number (min: 1)",
    "answers": [{
      "questionId": "String",
      "userAnswer": "Mixed",
      "isCorrect": "Boolean",
      "points": "Number",
      "timeSpent": "Number (secondes)"
    }],
    "score": "Number",
    "totalPoints": "Number",
    "percentage": "Number (0-100)",
    "passed": "Boolean",
    "timeSpent": "Number (secondes)",
    "startedAt": "Date",
    "completedAt": "Date"
  }],
  "totalVideosWatched": "Number (défaut: 0)",
  "totalQuizzesPassed": "Number (défaut: 0)",
  "totalTimeSpent": "Number (secondes, défaut: 0)",
  "startedAt": "Date",
  "lastActivityAt": "Date",
  "completedAt": "Date (quand parcours terminé)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### 2.2 Composants principaux

#### Module d'authentification ✅ **Implémenté**
- Inscription/connexion des utilisateurs
- Gestion des sessions avec JWT (tokens expirent après 30 jours)
- Middleware de vérification des autorisations (rôles admin/user)
- Protection contre les attaques brute force (verrouillage après 5 tentatives, 2h)
- Hachage sécurisé des mots de passe (bcrypt, salt 12)
- Gestion de profils utilisateurs (firstname, lastname, email)

#### Module de gestion vidéo ✅ **Implémenté**
- Upload de vidéos via interface admin (formats: mp4, avi, mov, mkv, webm)
- Validation des formats et tailles (max 500MB par défaut)
- Transcodage automatisé en 3 qualités (480p, 720p, 1080p) avec FFmpeg
- Génération automatique de thumbnails (extraction frame à 5 secondes)
- Extraction des métadonnées vidéo (durée, résolution, codec, bitrate)
- Gestion de l'ordre des vidéos (système séquentiel)
- Système de publication/dépublication des vidéos
- Distribution via Nginx avec support Range Requests
- Contrôle d'accès strict aux vidéos selon progression utilisateur

#### Module de quiz ✅ **Implémenté**
- Création et édition de quiz via interface admin
- 3 types de questions : QCM (multiple-choice), Vrai/Faux (true-false), Texte libre (text-input)
- Gestion des options de réponse avec explications
- Attribution de points par question (1-10 points)
- Timer par question et par quiz (configurable)
- Mélange aléatoire des questions (optionnel)
- Évaluation automatique des réponses
- Calcul des scores et validation des seuils (passingScore configurable, défaut 80%)
- Support de plusieurs tentatives (maxAttempts configurable, défaut 3)
- Historique complet des tentatives avec détails

#### Module de progression ✅ **Implémenté**
- Suivi complet du parcours utilisateur
- Déblocage séquentiel strict : vidéo N+1 débloquée uniquement si vidéo N complétée ET quiz réussi (≥80%)
- Suivi détaillé du temps de visionnage par vidéo (sessions de visionnage)
- Calcul automatique du pourcentage de completion par vidéo (≥90% = complété)
- Sauvegarde automatique de la position toutes les 10 secondes
- Historique complet des tentatives de quiz (réponses, scores, temps passé)
- Statistiques globales : progression totale, temps total passé, taux de réussite
- Détection automatique de la fin du parcours (toutes vidéos complétées)

#### Interface d'administration ✅ **Implémenté**

**Dashboard administrateur** :
- Vue d'ensemble de la plateforme (nombre de vidéos, utilisateurs, quiz)
- Accès rapide aux fonctionnalités principales
- Aperçu des dernières vidéos avec thumbnails

**Gestion des vidéos** :
- Liste complète des vidéos avec thumbnails, statut de publication, ordre
- Upload de nouvelles vidéos avec formulaire complet (titre, description, ordre)
- Édition des vidéos existantes (modification titre, description, ordre, statut)
- Publication/dépublication des vidéos
- Recherche et filtrage des vidéos

**Gestion des quiz** :
- Liste des quiz avec informations (vidéo associée, difficulté, score requis)
- Création de quiz avec interface intuitive
- Édition de quiz existants
- Gestion des questions (ajout, modification, suppression, réorganisation)
- Association des quiz aux vidéos publiées uniquement

**Gestion des utilisateurs** :
- Liste complète des utilisateurs avec rôles et statuts
- Création de nouveaux utilisateurs
- Édition des utilisateurs (profil, rôle, statut actif/inactif)
- Suppression d'utilisateurs (avec nettoyage des données associées)
- Recherche et filtrage des utilisateurs

**Statistiques** :
- Statistiques globales de progression
- Vue des performances par utilisateur (via API, interface à enrichir)

### 2.3 Flux applicatifs

#### Parcours utilisateur ✅ **Implémenté**
1. L'utilisateur s'inscrit ou se connecte sur la plateforme
2. Le système charge automatiquement sa progression actuelle
3. Le Dashboard affiche :
   - Progression globale avec pourcentage
   - Statistiques personnelles (vidéos complétées, quiz réussis, temps passé)
   - Prochaine vidéo recommandée
   - Liste des vidéos récentes avec barre de progression
4. L'utilisateur accède au parcours d'apprentissage
5. Seules les vidéos débloquées sont affichées (première vidéo + suivantes selon progression)
6. L'utilisateur visionne une vidéo avec lecteur personnalisé :
   - Tracking automatique de la position
   - Sauvegarde toutes les 10 secondes
   - Déblocage du quiz à 90% de visionnage
7. Le quiz est automatiquement proposé à la fin de la vidéo
8. L'utilisateur répond aux questions (avec timer si configuré)
9. Le système évalue les réponses et calcule le score
10. Affichage des résultats détaillés avec explications
11. Si score ≥ 80% (ou passingScore configuré) : la vidéo suivante est automatiquement débloquée
12. L'utilisateur peut retenter le quiz si échec (selon maxAttempts)

#### Gestion administrative
1. L'administrateur se connecte à l'interface d'administration
2. Il peut ajouter/modifier des vidéos via l'interface d'upload
3. Pour chaque vidéo, il crée ou modifie le quiz associé
4. Il peut configurer l'ordre des vidéos dans le parcours
5. Il a accès aux statistiques d'utilisation et de réussite

## 3. Spécifications techniques

### 3.1 Prérequis serveur
- CPU : 2-4 cœurs minimum
- RAM : 4-8 Go minimum
- Stockage : Dimensionné selon volume vidéo (prévoir marge)
- Bande passante : Adaptée au nombre d'utilisateurs simultanés

### 3.2 Sécurité ✅ **Implémenté**

**Authentification** :
- JWT avec expiration configurable (défaut : 30 jours)
- Hachage bcrypt des mots de passe (salt 12)
- Protection brute force : verrouillage après 5 tentatives (2h)
- Validation stricte des données (express-validator)

**Protection HTTP** :
- Helmet pour sécurisation des headers HTTP
- CORS configuré pour les domaines autorisés
- Rate limiting : 100 requêtes / 15 minutes en production
- Content Security Policy configuré

**Protection des données** :
- Sanitisation des entrées utilisateur
- Validation côté serveur de tous les inputs
- Protection SQL injection (Mongoose ODM)
- Protection XSS via validation et échappement

**Contrôle d'accès** :
- Middleware d'authentification sur toutes les routes protégées
- Vérification des rôles (admin/user)
- Contrôle strict de l'accès aux vidéos selon progression
- Les utilisateurs ne peuvent modifier que leur propre profil

**Améliorations prévues** :
- URLs signées pour l'accès aux vidéos (futur)
- Protection renforcée contre le hotlinking

### 3.3 Performance et optimisation ✅ **Implémenté**

**Frontend** :
- Build de production optimisé (React Scripts)
- Compression des assets (gzip via Nginx)
- Code splitting et lazy loading des composants
- Minification automatique des fichiers JS/CSS

**Backend** :
- Compression des réponses HTTP (express-compression)
- Logging optimisé (Morgan en production)
- Indexation MongoDB sur les champs fréquents :
  - Users : email, username (unique), createdAt
  - Videos : isPublished + order, createdAt, processingStatus
  - Quizzes : videoId, createdBy, isActive, difficulty
  - UserProgress : userId (unique), lastActivityAt, currentPosition

**Vidéo** :
- Transcodage en plusieurs qualités (sélection manuelle par l'utilisateur)
- Support HTTP Range Requests pour streaming progressif
- Cache Nginx pour les fichiers vidéo (7 jours)
- Optimisation des thumbnails (taille réduite)

**Améliorations prévues** :
- Streaming HLS adaptatif automatique (adaptation selon bande passante)
- CDN pour distribution vidéo (optionnel)

### 3.4 Sauvegarde et résilience
- Backup quotidien de la base de données
- Backup hebdomadaire des fichiers vidéo
- Rétention de 30 jours
- Monitoring des ressources serveur

## 4. État de la V1.0 en production

### ✅ Fonctionnalités implémentées et opérationnelles

**Authentification & Utilisateurs** :
- ✅ Inscription/Connexion avec JWT
- ✅ Gestion des profils utilisateurs
- ✅ Gestion administrative des utilisateurs (CRUD complet)
- ✅ Protection contre les attaques brute force

**Gestion Vidéo** :
- ✅ Upload de vidéos avec validation
- ✅ Transcodage automatique multi-qualités (480p, 720p, 1080p)
- ✅ Génération automatique de thumbnails
- ✅ Gestion de l'ordre séquentiel
- ✅ Système de publication/dépublication
- ✅ Distribution vidéo via HTTP Range Requests

**Quiz & Évaluation** :
- ✅ Création/Édition de quiz complets
- ✅ 3 types de questions (QCM, Vrai/Faux, Texte)
- ✅ Évaluation automatique
- ✅ Gestion des tentatives multiples
- ✅ Historique détaillé des performances

**Progression & Parcours** :
- ✅ Suivi séquentiel strict
- ✅ Déblocage conditionnel (vidéo + quiz ≥ 80%)
- ✅ Tracking du temps de visionnage
- ✅ Sauvegarde automatique de la progression
- ✅ Statistiques de progression complètes

**Interface Utilisateur** :
- ✅ Dashboard personnalisé
- ✅ Parcours d'apprentissage
- ✅ Lecteur vidéo avec tracking
- ✅ Interface de quiz interactive
- ✅ Design responsive avec TailwindCSS

**Interface Administration** :
- ✅ Dashboard admin avec aperçu
- ✅ Gestion complète des vidéos
- ✅ Gestion complète des quiz
- ✅ Gestion complète des utilisateurs

**Infrastructure** :
- ✅ API REST complète
- ✅ Nginx reverse proxy configuré
- ✅ SSL/HTTPS avec Let's Encrypt
- ✅ MongoDB avec indexation optimisée
- ✅ Logging et monitoring de base

### ⚠️ Limites connues de la V1.0

- **Streaming** : Pas de streaming HLS adaptatif automatique (MP4 direct avec Range Requests)
- **URLs signées** : Pas encore implémenté pour la sécurité avancée
- **Notifications** : Pas de système de notifications email/push
- **Analytics** : Statistiques de base, pas de tableau de bord analytics avancé
- **Mobile** : Interface responsive mais pas d'application PWA native
- **Social** : Pas de fonctionnalités sociales (commentaires, partage)

Voir `ROADMAP.md` pour les évolutions prévues.

---

Cette architecture combine robustesse technique et flexibilité applicative, tout en respectant les contraintes d'hébergement sur infrastructure OVH avec gestion interne des vidéos, sans recours à des services tiers.