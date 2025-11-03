# Script de Nettoyage des Associations Quiz-Vidéo

## Problème

Des associations orphelines peuvent exister entre les quiz et les vidéos :
- Quiz qui référencent des vidéos supprimées
- Vidéos qui référencent des quiz supprimés
- Quiz inactifs orphelins
- Associations incohérentes (quiz.videoId ≠ video.quizId)

## Solution

Le script `cleanup-quiz-video-associations.js` nettoie automatiquement toutes ces associations orphelines.

## Utilisation

### Depuis le dossier backend :

```bash
npm run cleanup-quiz
```

Ou directement :

```bash
node scripts/cleanup-quiz-video-associations.js
```

### Variables d'environnement requises

Assurez-vous que votre fichier `.env` contient la variable `MONGO_URI` :

```
MONGO_URI=mongodb://localhost:27017/video-platform
```

## Ce que fait le script

1. **Supprime les quiz orphelins** : Quiz qui référencent des vidéos inexistantes
2. **Nettoie les références quizId** : Supprime les quizId dans les vidéos qui pointent vers des quiz inexistants
3. **Corrige les associations incohérentes** : Met à jour les vidéos pour qu'elles référencent le bon quiz
4. **Supprime les quiz inactifs orphelins** : Supprime les quiz inactifs qui n'ont pas de vidéo publiée associée
5. **Ajoute les références manquantes** : Ajoute le quizId dans les vidéos qui devraient avoir une référence

## Rapport

Le script affiche un rapport détaillé :
- Nombre d'éléments nettoyés
- Liste des problèmes détectés
- Statistiques finales de cohérence

## Important

⚠️ **Ce script modifie directement la base de données. Faites une sauvegarde avant de l'exécuter !**

## Exemple de sortie

```
✅ Connecté à MongoDB

🔍 Recherche des quiz avec vidéos inexistantes...
❌ Quiz 507f1f77bcf86cd799439011 référence une vidéo inexistante: 507f1f77bcf86cd799439012
✅ Quiz orphelin supprimé: 507f1f77bcf86cd799439011

🔍 Recherche des vidéos avec quizId invalide...
❌ Vidéo 507f1f77bcf86cd799439013 référence un quiz inexistant: 507f1f77bcf86cd799439014
✅ Référence quizId nettoyée dans la vidéo: 507f1f77bcf86cd799439013

📊 Statistiques de nettoyage:
   - Éléments nettoyés: 2
   - Problèmes détectés: 2

✅ Nettoyage terminé avec succès!
```

