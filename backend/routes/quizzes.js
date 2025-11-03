const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

// Import des contrôleurs
const quizController = require('../controllers/quizController');

// Import des middlewares
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Validation pour la création d'un quiz
const createQuizValidation = [
    body('title')
        .isLength({ min: 3, max: 100 })
        .withMessage('Le titre doit contenir entre 3 et 100 caractères')
        .trim(),
    body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('La description ne peut pas dépasser 500 caractères')
        .trim(),
    body('videoId')
        .isMongoId()
        .withMessage('ID de vidéo invalide'),
    body('difficulty')
        .optional()
        .isIn(['facile', 'intermédiaire', 'difficile'])
        .withMessage('La difficulté doit être facile, intermédiaire ou difficile'),
    body('passingScore')
        .isInt({ min: 1, max: 100 })
        .withMessage('Le score de passage doit être entre 1 et 100'),
    body('timeLimit')
        .optional()
        .isInt({ min: 0, max: 3600 })
        .withMessage('La limite de temps doit être entre 0 et 3600 secondes'),
    body('isRandomized')
        .optional()
        .isBoolean()
        .withMessage('isRandomized doit être un booléen'),
    body('allowRetake')
        .optional()
        .isBoolean()
        .withMessage('allowRetake doit être un booléen'),
    body('maxAttempts')
        .optional()
        .isInt({ min: 1, max: 10 })
        .withMessage('Le nombre maximum de tentatives doit être entre 1 et 10'),
    body('tags')
        .optional()
        .isArray()
        .withMessage('Les tags doivent être un tableau'),
    body('tags.*')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Chaque tag ne peut pas dépasser 50 caractères'),
    body('questions')
        .isArray({ min: 1 })
        .withMessage('Le quiz doit contenir au moins une question'),
    body('questions.*.question')
        .isLength({ min: 5, max: 500 })
        .withMessage('Chaque question doit contenir entre 5 et 500 caractères')
        .trim(),
    body('questions.*.type')
        .isIn(['multiple-choice', 'true-false', 'text-input'])
        .withMessage('Le type de question doit être multiple-choice, true-false ou text-input'),
    body('questions.*.points')
        .optional()
        .isInt({ min: 1, max: 10 })
        .withMessage('Les points par question doivent être entre 1 et 10'),
    body('questions.*.timeLimit')
        .optional()
        .isInt({ min: 5, max: 300 })
        .withMessage('La limite de temps par question doit être entre 5 et 300 secondes'),
    body('questions.*.order')
        .isInt({ min: 1 })
        .withMessage('L\'ordre de chaque question doit être au moins 1'),
    body('questions.*.options')
        .if(body('questions.*.type').equals('multiple-choice'))
        .isArray({ min: 2 })
        .withMessage('Les questions à choix multiples doivent avoir au moins 2 options'),
    body('questions.*.options.*.text')
        .if(body('questions.*.type').equals('multiple-choice'))
        .isLength({ min: 1, max: 200 })
        .withMessage('Le texte de chaque option doit contenir entre 1 et 200 caractères')
        .trim(),
    body('questions.*.options.*.isCorrect')
        .if(body('questions.*.type').equals('multiple-choice'))
        .isBoolean()
        .withMessage('isCorrect doit être un booléen'),
    body('questions.*.correctAnswer')
        .if(body('questions.*.type').equals('true-false'))
        .isBoolean()
        .withMessage('La réponse correcte pour true-false doit être un booléen'),
    body('questions.*.correctAnswer')
        .if(body('questions.*.type').equals('text-input'))
        .isLength({ min: 1, max: 200 })
        .withMessage('La réponse correcte pour text-input doit contenir entre 1 et 200 caractères')
        .trim()
];

// Validation pour la mise à jour d'un quiz
const updateQuizValidation = [
    param('quizId')
        .isMongoId()
        .withMessage('ID de quiz invalide'),
    body('title')
        .optional()
        .isLength({ min: 3, max: 100 })
        .withMessage('Le titre doit contenir entre 3 et 100 caractères')
        .trim(),
    body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('La description ne peut pas dépasser 500 caractères')
        .trim(),
    body('difficulty')
        .optional()
        .isIn(['facile', 'intermédiaire', 'difficile'])
        .withMessage('La difficulté doit être facile, intermédiaire ou difficile'),
    body('passingScore')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Le score de passage doit être entre 1 et 100'),
    body('timeLimit')
        .optional()
        .isInt({ min: 0, max: 3600 })
        .withMessage('La limite de temps doit être entre 0 et 3600 secondes'),
    body('isRandomized')
        .optional()
        .isBoolean()
        .withMessage('isRandomized doit être un booléen'),
    body('allowRetake')
        .optional()
        .isBoolean()
        .withMessage('allowRetake doit être un booléen'),
    body('maxAttempts')
        .optional()
        .isInt({ min: 1, max: 10 })
        .withMessage('Le nombre maximum de tentatives doit être entre 1 et 10'),
    body('tags')
        .optional()
        .isArray()
        .withMessage('Les tags doivent être un tableau'),
    body('tags.*')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Chaque tag ne peut pas dépasser 50 caractères')
];

// Validation pour l'évaluation d'un quiz
const evaluateQuizValidation = [
    param('quizId')
        .isMongoId()
        .withMessage('ID de quiz invalide'),
    body('answers')
        .isObject()
        .withMessage('Les réponses doivent être un objet'),
    body('answers.*')
        .notEmpty()
        .withMessage('Chaque réponse ne peut pas être vide')
];

// Validation des paramètres
const quizIdValidation = [
    param('quizId')
        .isMongoId()
        .withMessage('ID de quiz invalide')
];

const videoIdValidation = [
    param('videoId')
        .isMongoId()
        .withMessage('ID de vidéo invalide')
];

// Routes publiques (pour les utilisateurs connectés)
router.get('/', authenticateToken, quizController.getAllQuizzes);
router.get('/video/:videoId', videoIdValidation, authenticateToken, quizController.getQuizByVideoId);
router.get('/:quizId', quizIdValidation, authenticateToken, quizController.getQuizById);
router.post('/:quizId/evaluate', evaluateQuizValidation, authenticateToken, quizController.evaluateQuiz);
router.get('/:quizId/stats', quizIdValidation, authenticateToken, quizController.getQuizStats);

// Routes protégées (admin seulement)
router.post('/', createQuizValidation, authenticateToken, requireAdmin, quizController.createQuiz);
router.put('/:quizId', updateQuizValidation, authenticateToken, requireAdmin, quizController.updateQuiz);
router.delete('/:quizId', quizIdValidation, authenticateToken, requireAdmin, quizController.deleteQuiz);
router.patch('/:quizId/toggle-status', quizIdValidation, authenticateToken, requireAdmin, quizController.toggleQuizStatus);

module.exports = router; 