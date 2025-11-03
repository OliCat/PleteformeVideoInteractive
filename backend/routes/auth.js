const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// Import des contrôleurs
const authController = require('../controllers/authController');

// Import des middlewares
const { authenticateToken } = require('../middleware/auth');

// Validation des données d'inscription
const registerValidation = [
    body('username')
        .isLength({ min: 3, max: 50 })
        .withMessage('Le nom d\'utilisateur doit contenir entre 3 et 50 caractères')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, _ et -'),
    body('email')
        .isEmail()
        .withMessage('Veuillez fournir un email valide')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Le mot de passe doit contenir au moins 6 caractères'),
    body('firstName')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Le prénom ne peut pas dépasser 50 caractères'),
    body('lastName')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Le nom ne peut pas dépasser 50 caractères')
];

// Validation des données de connexion
// Accepte email ou username pour l'identifiant
const loginValidation = [
    body('email')
        .notEmpty()
        .withMessage('L\'email ou le nom d\'utilisateur est requis')
        .custom((value) => {
            // Accepter soit un email valide, soit un username (lettres, chiffres, _, -)
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            const isUsername = /^[a-zA-Z0-9_-]+$/.test(value);
            if (!isEmail && !isUsername) {
                throw new Error('Veuillez fournir un email valide ou un nom d\'utilisateur');
            }
            return true;
        }),
    body('password')
        .notEmpty()
        .withMessage('Le mot de passe est requis')
];

// Validation de la mise à jour du profil
const profileUpdateValidation = [
    body('username')
        .optional()
        .isLength({ min: 3, max: 50 })
        .withMessage('Le nom d\'utilisateur doit contenir entre 3 et 50 caractères')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, _ et -'),
    body('firstName')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Le prénom ne peut pas dépasser 50 caractères'),
    body('lastName')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Le nom ne peut pas dépasser 50 caractères')
];

// Validation du changement de mot de passe
const changePasswordValidation = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Le mot de passe actuel est requis'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères')
];

// Routes publiques
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);

// Routes protégées
router.get('/me', authenticateToken, authController.checkAuth);
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, profileUpdateValidation, authController.updateProfile);
router.put('/change-password', authenticateToken, changePasswordValidation, authController.changePassword);

// Déconnexion (pas besoin d'authentification car on déconnecte)
router.post('/logout', authController.logout);

module.exports = router; 