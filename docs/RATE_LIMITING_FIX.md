# 🔧 Correction du Rate Limiting - Erreurs 429

**Date** : Novembre 2025  
**Problème** : Les utilisateurs recevaient des erreurs 429 (Too Many Requests) en production  
**Solution** : Configuration différenciée du rate limiting par type de route

---

## 🐛 Problème identifié

### Symptômes
- Erreurs 429 (Too Many Requests) fréquentes pour les utilisateurs
- Limitation trop stricte : **100 requêtes / 15 minutes** en production
- Impact particulièrement important sur :
  - Le tracking vidéo (sauvegarde automatique toutes les 10 secondes)
  - Le chargement des pages avec plusieurs appels API
  - Les utilisateurs avec plusieurs onglets ouverts

### Analyse
100 requêtes / 15 minutes = **~6-7 requêtes par minute**, ce qui est insuffisant pour :
- ✅ Sauvegarde de progression vidéo (toutes les 10 secondes = 6/min)
- ✅ Requêtes de chargement de page (vidéos, quiz, progression, stats)
- ✅ Requêtes asynchrones multiples (React, Redux)
- ✅ Utilisateurs avec plusieurs onglets

---

## ✅ Solution implémentée

### Nouvelle configuration avec limiters différenciés

#### 1. **Limiter général** (toutes les routes API)
- **Limite** : 500 requêtes / 15 minutes (au lieu de 100)
- **Fenêtre** : 15 minutes
- **Exception** : Route `/api/health` exclue du rate limiting

#### 2. **Limiter progression** (routes `/api/progress/*`)
- **Limite** : 1000 requêtes / 15 minutes
- **Raison** : Le tracking vidéo nécessite des requêtes fréquentes
  - Sauvegarde toutes les 10 secondes = ~6 requêtes/min
  - Sur 15 minutes = ~90 requêtes minimum
  - Marge de sécurité : 1000 requêtes pour gérer les pics
- **Identification** : Par utilisateur authentifié (userId) ou IP

#### 3. **Limiter authentification** (routes `/api/auth/*`)
- **Limite** : 50 tentatives / 15 minutes
- **Raison** : Protection supplémentaire (la protection brute force côté auth gère déjà cela)
- **Comportement** : Ne compte pas les requêtes réussies (`skipSuccessfulRequests`)

#### 4. **Limiter upload vidéos** (route `/api/videos/upload`)
- **Limite** : 10 uploads / heure par IP
- **Raison** : Opérations longues (transcodage), éviter les abus
- **Fenêtre** : 1 heure (plus longue pour ce type d'opération)

---

## 📝 Configuration

### Variables d'environnement

Ajouter ou mettre à jour dans `backend/.env` :

```env
# Security - Rate Limiting
# Limite générale pour toutes les routes API
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=500

# Limite spécifique pour les routes de progression (tracking vidéo fréquent)
RATE_LIMIT_PROGRESS_MAX=1000

# Limite pour l'authentification (protection brute force supplémentaire)
RATE_LIMIT_AUTH_MAX=50

# Limite pour l'upload de vidéos (opérations longues)
RATE_LIMIT_UPLOAD_MAX=10
```

### Ordre d'application des limiters

Les limiters sont appliqués dans cet ordre (important pour la priorité) :

```javascript
app.use('/api/progress', progressLimiter);     // 1. Routes de progression
app.use('/api/auth', authLimiter);             // 2. Routes d'authentification
app.use('/api/videos/upload', uploadLimiter);  // 3. Route d'upload spécifique
app.use('/api/', generalLimiter);              // 4. Limiter général (toutes autres routes)
```

---

## 🚀 Déploiement

### 1. Mettre à jour les variables d'environnement

Sur le serveur de production, mettre à jour `backend/.env` :

```bash
# SSH sur le serveur
cd /path/to/backend
nano .env  # ou vi .env

# Ajouter/modifier les variables :
RATE_LIMIT_MAX_REQUESTS=500
RATE_LIMIT_PROGRESS_MAX=1000
RATE_LIMIT_AUTH_MAX=50
RATE_LIMIT_UPLOAD_MAX=10
```

### 2. Redémarrer le service backend

```bash
# Si utilise PM2
pm2 restart video-platform-backend

# Ou si utilise systemd
sudo systemctl restart video-platform-backend

# Ou si utilise directement node
# Arrêter le processus et redémarrer
```

### 3. Vérifier les logs

Vérifier que le serveur démarre correctement et qu'il n'y a pas d'erreurs :

```bash
# Logs PM2
pm2 logs video-platform-backend

# Logs systemd
sudo journalctl -u video-platform-backend -f

# Logs manuels
tail -f backend/logs/access.log
```

---

## 📊 Comparaison avant/après

| Type de route | Avant | Après | Amélioration |
|---------------|-------|-------|--------------|
| **Routes générales** | 100 / 15min | 500 / 15min | **+400%** |
| **Routes progression** | 100 / 15min | 1000 / 15min | **+900%** |
| **Routes auth** | 100 / 15min | 50 / 15min | Stricte (sécurité) |
| **Upload vidéo** | 100 / 15min | 10 / heure | Adaptée (opérations longues) |

---

## 🔍 Monitoring

### Headers de réponse

Les headers suivants sont maintenant envoyés dans les réponses HTTP :

```
RateLimit-Limit: 500        # Limite maximale
RateLimit-Remaining: 450    # Requêtes restantes
RateLimit-Reset: 1701234567 # Timestamp de réinitialisation
```

### Vérification en production

Pour vérifier que le rate limiting fonctionne correctement :

```bash
# Test de la limite de progression
for i in {1..20}; do
  curl -H "Authorization: Bearer YOUR_TOKEN" \
    https://votre-domaine.com/api/progress
  echo "Requête $i"
done

# Vérifier les headers RateLimit-* dans la réponse
curl -I -H "Authorization: Bearer YOUR_TOKEN" \
  https://votre-domaine.com/api/progress
```

---

## 🎯 Impact attendu

### Avantages
- ✅ **Réduction drastique des erreurs 429** pour les utilisateurs normaux
- ✅ **Meilleure expérience utilisateur** : pas d'interruption pendant le visionnage
- ✅ **Protection maintenue** : les limiters stricts restent pour l'auth et l'upload
- ✅ **Flexibilité** : configuration via variables d'environnement

### Points d'attention
- ⚠️ **Surveillance recommandée** : monitorer les logs pour détecter d'éventuels abus
- ⚠️ **Ajustement possible** : adapter les limites selon l'usage réel observé
- ⚠️ **Proxies/Nginx** : Si utilise un proxy, vérifier que `X-Real-IP` est correctement transmis

---

## 🔄 Ajustements futurs

Si besoin d'ajuster davantage selon l'usage observé :

1. **Augmenter** `RATE_LIMIT_PROGRESS_MAX` si les utilisateurs ont toujours des 429 sur le tracking
2. **Diminuer** si on observe des abus
3. **Implémenter** un rate limiting basé sur l'utilisateur authentifié avec Redis (future version)

---

## 📚 Documentation associée

- `backend/server.js` : Configuration du rate limiting
- `backend/config/env.example` : Variables d'environnement
- `architecture.md` : Section sécurité (rate limiting)

---

**Status** : ✅ **Correction déployée**  
**Test** : À vérifier en production après déploiement
