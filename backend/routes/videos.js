const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// Import des contrôleurs
const videoController = require('../controllers/videoController');

// Import des middlewares
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { 
    uploadSingleVideo, 
    handleUploadErrors, 
    validateVideoMetadata,
    cleanupTempFiles,
    checkDiskSpace,
    processFormFields
} = require('../middleware/upload');
const { 
    checkVideoAccess, 
    checkVideoStreamingAccess, 
    checkVideoMetadataAccess 
} = require('../middleware/videoAccess');

// Validation de la mise à jour d'une vidéo
const videoUpdateValidation = [
    body('title')
        .optional()
        .isLength({ min: 3, max: 100 })
        .withMessage('Le titre doit contenir entre 3 et 100 caractères'),
    body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('La description ne peut pas dépasser 500 caractères'),
    body('order')
        .optional()
        .isInt({ min: 0 })
        .withMessage('L\'ordre doit être un nombre positif'),
    body('isPublished')
        .optional()
        .isBoolean()
        .withMessage('Le statut de publication doit être un booléen')
];

// Validation de la réorganisation des vidéos
const reorderValidation = [
    body('videoOrders')
        .isArray({ min: 1 })
        .withMessage('La liste des ordres de vidéos est requise'),
    body('videoOrders.*.videoId')
        .isMongoId()
        .withMessage('ID de vidéo invalide'),
    body('videoOrders.*.order')
        .isInt({ min: 0 })
        .withMessage('L\'ordre doit être un nombre positif')
];

// Routes publiques (avec authentification optionnelle)
router.get('/', videoController.getAllVideos);
router.get('/search', videoController.searchVideos);
router.get('/paginated', videoController.getVideosPaginated);

// Routes utilisateur (authentification requise)
router.get('/learning-path', authenticateToken, videoController.getLearningPath);
router.get('/accessible', authenticateToken, videoController.getAccessibleVideos);

// Routes avec contrôle d'accès
router.get('/:videoId', authenticateToken, checkVideoMetadataAccess, videoController.getVideoById);

// Routes protégées - Admin seulement
router.post('/upload', 
    authenticateToken, 
    requireAdmin,
    checkDiskSpace,
    uploadSingleVideo,
    processFormFields,
    validateVideoMetadata,
    cleanupTempFiles,
    videoController.uploadVideo
);

router.put('/:videoId', 
    authenticateToken, 
    requireAdmin,
    videoUpdateValidation,
    videoController.updateVideo
);

router.delete('/:videoId', 
    authenticateToken, 
    requireAdmin,
    videoController.deleteVideo
);

router.post('/reorder', 
    authenticateToken, 
    requireAdmin,
    reorderValidation,
    videoController.reorderVideos
);

router.get('/admin/stats', 
    authenticateToken, 
    requireAdmin,
    videoController.getVideoStats
);

// Middleware de gestion des erreurs d'upload (doit être après les routes d'upload)
router.use(handleUploadErrors);

module.exports = router; 