const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// Import des contrôleurs
const userController = require('../controllers/userController');

// Import des middlewares
const { authenticateToken, requireAdmin, requireOwnership } = require('../middleware/auth');

// Validation de la création d'un utilisateur (admin)
const userCreateValidation = [
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
        .withMessage('Le nom ne peut pas dépasser 50 caractères'),
    body('role')
        .optional()
        .isIn(['user', 'admin'])
        .withMessage('Le rôle doit être "user" ou "admin"'),
    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('Le statut actif doit être un booléen')
];

// Validation de la mise à jour d'un utilisateur
const userUpdateValidation = [
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
        .withMessage('Le nom ne peut pas dépasser 50 caractères'),
    body('role')
        .optional()
        .isIn(['user', 'admin'])
        .withMessage('Le rôle doit être "user" ou "admin"'),
    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('Le statut actif doit être un booléen'),
    body('password')
        .optional()
        .isLength({ min: 6 })
        .withMessage('Le mot de passe doit contenir au moins 6 caractères')
];

// Routes protégées - Admin seulement
router.get('/', authenticateToken, requireAdmin, userController.getAllUsers);
router.get('/stats', authenticateToken, requireAdmin, userController.getUserStats);
router.post('/', authenticateToken, requireAdmin, userCreateValidation, userController.createUser);
router.get('/:userId', authenticateToken, requireAdmin, userController.getUserById);
router.put('/:userId', authenticateToken, requireAdmin, userUpdateValidation, userController.updateUser);
router.patch('/:userId/toggle-status', authenticateToken, requireAdmin, userController.toggleUserStatus);
router.delete('/:userId', authenticateToken, requireAdmin, userController.deleteUser);

module.exports = router; 