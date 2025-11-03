# 🔐 Documentation Authentification et Inscription

## 📋 Vue d'ensemble

Ce document explique le fonctionnement du middleware d'authentification, le processus d'inscription des utilisateurs et la configuration nécessaire côté serveur LXC.

---

## 🔑 Fonctionnement du Middleware d'Authentification

### 1. Middleware `authenticateToken`

**Fichier:** `backend/middleware/auth.js`

Le middleware `authenticateToken` protège les routes nécessitant une authentification :

#### Étapes de fonctionnement :

1. **Extraction du token JWT**
   - Lit le header `Authorization: Bearer <token>`
   - Extrait le token après "Bearer "

2. **Vérification de la présence du token**
   - Si absent → `401 Unauthorized` avec message "Token d'authentification manquant"

3. **Vérification et décodage du token**
   - Utilise `jwt.verify()` avec `JWT_SECRET` depuis `.env`
   - Si invalide → `401 Unauthorized` avec message "Token invalide"
   - Si expiré → `401 Unauthorized` avec message "Token expiré"

4. **Récupération de l'utilisateur**
   - Cherche l'utilisateur dans MongoDB avec l'ID extrait du token
   - Si non trouvé → `401 Unauthorized`

5. **Vérification du statut utilisateur**
   - Vérifie que `isActive === true`
   - Si désactivé → `403 Forbidden` avec message "Compte désactivé"

6. **Ajout à la requête**
   - Ajoute `req.user` contenant les données utilisateur (sans le mot de passe)
   - Passe au middleware suivant avec `next()`

#### Utilisation dans les routes :

```javascript
// Route protégée nécessitant authentification
router.get('/profile', authenticateToken, authController.getProfile);

// Route admin nécessitant authentification + rôle admin
router.get('/admin/users', authenticateToken, requireAdmin, adminController.getUsers);
```

### 2. Middleware `requireAdmin`

Vérifie que l'utilisateur authentifié a le rôle `admin` :
- Si pas authentifié → `401 Unauthorized`
- Si pas admin → `403 Forbidden` avec message "Accès administrateur requis"

### 3. Middleware `requireOwnership`

Permet à un utilisateur de modifier uniquement son propre profil :
- Les admins peuvent tout modifier
- Les utilisateurs normaux ne peuvent modifier que leur propre profil (`req.user._id === resourceUserId`)

### 4. Middleware `optionalAuth`

Authentification optionnelle pour les routes publiques/privées :
- Si un token est présent et valide → ajoute `req.user`
- Sinon → continue sans authentification
- Utile pour des routes qui affichent plus de contenu si l'utilisateur est connecté

---

## 📝 Procédure de Création de Compte (Inscription)

### Frontend : Page d'Inscription

**Route:** `/register`  
**Fichier:** `frontend/src/pages/auth/Register.jsx`

### Processus côté client :

1. **Accès à la page**
   - Depuis la page de login : lien "Pas encore de compte ? S'inscrire"
   - URL directe : `https://<DOMAIN>/register`

2. **Formulaire d'inscription**
   Les champs requis :
   - **Username** (nom d'utilisateur) : 3-50 caractères, lettres/chiffres/`_`/`-` uniquement
   - **Email** : format email valide
   - **Password** (mot de passe) : minimum 6 caractères
   - **Confirm Password** (confirmation) : doit correspondre au mot de passe
   - **First Name** (prénom) : optionnel, max 50 caractères
   - **Last Name** (nom) : optionnel, max 50 caractères

3. **Validation côté client**
   - Vérification des formats (email, username)
   - Vérification de la longueur des champs
   - Vérification que les mots de passe correspondent

4. **Envoi de la requête**
   ```javascript
   POST /api/auth/register
   Content-Type: application/json
   
   {
     "username": "john_doe",
     "email": "john@example.com",
     "password": "motdepasse123",
     "firstName": "John",
     "lastName": "Doe"
   }
   ```

5. **Traitement de la réponse**
   - Succès → message "Inscription réussie !", redirection vers `/login` après 2 secondes
   - Erreur → affichage du message d'erreur (ex: "Un utilisateur avec cet email ou nom d'utilisateur existe déjà")

### Backend : Route d'Inscription

**Route:** `POST /api/auth/register`  
**Fichier:** `backend/routes/auth.js` → `backend/controllers/authController.js` → `backend/services/authService.js`

### Processus côté serveur :

1. **Validation des données** (`registerValidation`)
   - Format username : `^[a-zA-Z0-9_-]+$`, longueur 3-50
   - Format email : validation email standard
   - Longueur mot de passe : minimum 6 caractères
   - Prénom/Nom : optionnels, max 50 caractères

2. **Vérification de l'unicité**
   ```javascript
   // Cherche si email OU username existe déjà
   const existingUser = await User.findOne({
     $or: [
       { email: userData.email },
       { username: userData.username }
     ]
   });
   ```
   - Si trouvé → `409 Conflict` avec message "Un utilisateur avec cet email ou nom d'utilisateur existe déjà"

3. **Création de l'utilisateur**
   ```javascript
   const newUser = new User({
     username: userData.username,
     email: userData.email,
     password: userData.password,  // Hashé automatiquement par le middleware pre-save
     firstName: userData.firstName,
     lastName: userData.lastName,
     role: 'user'  // Par défaut, tous les nouveaux utilisateurs sont 'user'
   });
   ```

4. **Hashage automatique du mot de passe**
   - Le modèle `User` utilise un middleware `pre('save')`
   - Hashage avec `bcryptjs` et salt de 12 rounds
   - Le mot de passe est hashé automatiquement avant la sauvegarde en base

5. **Sauvegarde en MongoDB**
   - Insertion dans la collection `users`
   - Retourne l'utilisateur créé (sans le mot de passe)

6. **Réponse au client**
   ```json
   {
     "success": true,
     "message": "Utilisateur inscrit avec succès",
     "data": {
       "username": "john_doe",
       "email": "john@example.com",
       "role": "user",
       "isActive": true,
       "_id": "...",
       "createdAt": "2025-11-03T00:15:18.208Z"
     }
   }
   ```

---

## ⚙️ Configuration Côté Serveur LXC

### ✅ Aucune configuration supplémentaire nécessaire !

L'inscription est **ouverte par défaut** et fonctionne automatiquement. Voici ce qui est déjà configuré :

#### 1. Route publique accessible

La route `POST /api/auth/register` est **publique** (pas de middleware `authenticateToken`) :
```javascript
// backend/routes/auth.js
router.post('/register', registerValidation, authController.register);  // ✅ Publique
router.post('/login', loginValidation, authController.login);            // ✅ Publique
```

#### 2. Configuration MongoDB

✅ **Déjà configurée** :
- Base de données `video-platform` créée
- Utilisateur MongoDB `videoapp` avec permissions `readWrite`
- Connexion configurée dans `.env` : `MONGODB_URI=mongodb://videoapp:PASSWORD@localhost:27017/video-platform`
- Authentification MongoDB activée

**Vérification :**
```bash
ssh -J root@<PUBLIC_SERVER_IP> root@<LXC_IP>
mongosh mongodb://videoapp:VOTRE_MOT_DE_PASSE@localhost:27017/video-platform
> db.users.countDocuments()
```

#### 3. Variables d'environnement requises

Dans `/opt/video-platform/app/backend/.env`, ces variables sont nécessaires :

```bash
# MongoDB (déjà configuré)
MONGODB_URI=mongodb://videoapp:PASSWORD@localhost:27017/video-platform

# JWT (déjà configuré)
JWT_SECRET=votre-secret-jwt-securise
JWT_EXPIRE=30d

# Pas besoin de variable ALLOW_REGISTRATION - l'inscription est toujours ouverte
```

**Vérification :**
```bash
ssh -J root@<PUBLIC_SERVER_IP> root@<LXC_IP>
cat /opt/video-platform/app/backend/.env | grep -E "JWT_SECRET|MONGODB_URI"
```

#### 4. Test de l'inscription

Test manuel depuis le serveur :
```bash
# Sur le LXC
ssh -J root@<PUBLIC_SERVER_IP> root@<LXC_IP>

# Test local
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user",
    "email": "test@example.com",
    "password": "test123456",
    "firstName": "Test",
    "lastName": "User"
  }'
```

**Résultat attendu :**
```json
{
  "success": true,
  "message": "Utilisateur inscrit avec succès",
  "data": {
    "username": "test_user",
    "email": "test@example.com",
    "role": "user",
    "isActive": true,
    "_id": "...",
    "createdAt": "..."
  }
}
```

#### 5. Vérification dans MongoDB

Vérifier qu'un utilisateur a été créé :
```bash
mongosh mongodb://videoapp:PASSWORD@localhost:27017/video-platform

> db.users.findOne({ email: "test@example.com" })
> db.users.find().pretty()
```

---

## 🔒 Sécurité et Limitations

### Protection contre les attaques

1. **Rate Limiting**
   - Configuré dans `server.js` : 100 requêtes / 15 minutes en production
   - Protège contre les attaques par force brute

2. **Verrouillage de compte**
   - Après 5 tentatives de connexion échouées → compte verrouillé pendant 2 heures
   - Implémenté dans le modèle `User` (`incLoginAttempts`)

3. **Validation stricte**
   - Format username : uniquement lettres, chiffres, `_`, `-`
   - Email : validation format standard
   - Mot de passe : minimum 6 caractères (hashé avec bcrypt salt 12)

4. **Authentification JWT**
   - Token JWT avec expiration (30 jours par défaut)
   - Secret stocké dans `.env` (ne JAMAIS commiter dans Git)

### Rôles utilisateurs

- **`user`** (par défaut) : Accès aux vidéos, quizzes, profil
- **`admin`** : Accès admin + gestion utilisateurs, vidéos, quizzes

L'inscription crée toujours des utilisateurs avec le rôle `user`. Seul un admin peut promouvoir un utilisateur en admin.

---

## 📊 Flux Complet d'Inscription

```
┌─────────────────┐
│  Utilisateur    │
│  sur /register  │
└────────┬────────┘
         │
         │ 1. Remplit le formulaire
         ▼
┌─────────────────┐
│  Validation     │
│  Frontend       │
└────────┬────────┘
         │
         │ 2. POST /api/auth/register
         ▼
┌─────────────────┐
│  Nginx          │
│  Proxy           │
└────────┬────────┘
         │
         │ 3. Proxy vers LXC:5000
         ▼
┌─────────────────┐
│  Backend        │
│  Express        │
└────────┬────────┘
         │
         │ 4. Validation express-validator
         ▼
┌─────────────────┐
│  authService    │
│  registerUser()  │
└────────┬────────┘
         │
         │ 5. Vérification unicité
         │    (email/username)
         ▼
┌─────────────────┐
│  User Model     │
│  save()          │
└────────┬────────┘
         │
         │ 6. Pre-save middleware
         │    hash password
         ▼
┌─────────────────┐
│  MongoDB        │
│  Insertion       │
└────────┬────────┘
         │
         │ 7. Réponse 201 Created
         ▼
┌─────────────────┐
│  Frontend       │
│  Succès          │
└─────────────────┘
         │
         │ 8. Redirection /login
         ▼
```

---

## ✅ Checklist de Configuration

- [x] Route `/api/auth/register` publique et accessible
- [x] MongoDB configuré avec authentification
- [x] Variables d'environnement `MONGODB_URI` et `JWT_SECRET` définies
- [x] Service backend `video-platform` actif
- [x] Nginx proxy configuré pour `/api/*`
- [x] Frontend avec page `/register` accessible
- [x] Rate limiting activé (protection brute force)

---

## 🐛 Dépannage

### Erreur : "Un utilisateur avec cet email ou nom d'utilisateur existe déjà"
- **Solution** : Utiliser un email ou username différent

### Erreur : "MongoNetworkError: connect ECONNREFUSED"
- **Solution** : Vérifier que MongoDB est actif : `systemctl status mongod`
- **Solution** : Vérifier `MONGODB_URI` dans `.env`

### Erreur : "Token d'authentification manquant"
- **Normal** : L'inscription est publique, pas besoin de token
- Cette erreur n'apparaît que pour les routes protégées

### Erreur : Rate limit "Trop de requêtes"
- **Solution** : Attendre 15 minutes ou vérifier le rate limiting dans `server.js`

---

## 📚 Ressources

- **Modèle User** : `backend/models/User.js`
- **Service Auth** : `backend/services/authService.js`
- **Controller Auth** : `backend/controllers/authController.js`
- **Routes Auth** : `backend/routes/auth.js`
- **Middleware Auth** : `backend/middleware/auth.js`
- **Page Register** : `frontend/src/pages/auth/Register.jsx`
- **Page Login** : `frontend/src/pages/auth/Login.jsx`

