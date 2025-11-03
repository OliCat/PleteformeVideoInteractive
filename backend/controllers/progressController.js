const { body, param, query, validationResult } = require('express-validator');
const progressService = require('../services/progressService');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * Contrôleur de gestion de la progression des utilisateurs
 * Gère les routes pour le suivi du parcours vidéo et les statistiques
 */

/**
 * Récupérer la progression de l'utilisateur connecté
 * GET /api/progress
 */
const getUserProgress = asyncHandler(async (req, res) => {
    const userId = req.user._id || req.user.id;
    
    console.log('📈 getUserProgress - userId:', userId);
    
    const progress = await progressService.getUserProgress(userId);
    
    console.log('📈 Progress retourné:', {
        completedVideos: progress.completedVideos?.length || 0,
        currentPosition: progress.currentPosition,
        totalVideosWatched: progress.totalVideosWatched
    });
    
    res.status(200).json({
        success: true,
        data: progress
    });
});

/**
 * Enregistrer une session de visionnage
 * POST /api/progress/watch-session
 */
const recordWatchSession = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Données invalides',
            errors: errors.array()
        });
    }

    const userId = req.user.id;
    const { videoId, startTime, endTime, duration } = req.body;

    const progress = await progressService.recordWatchSession(
        userId, 
        videoId, 
        startTime, 
        endTime, 
        duration
    );

    res.status(200).json({
        success: true,
        message: 'Session de visionnage enregistrée',
        data: progress
    });
});

/**
 * Obtenir les statistiques de progression de l'utilisateur connecté
 * GET /api/progress/stats
 */
const getProgressStats = asyncHandler(async (req, res) => {
    const userId = req.user._id || req.user.id;
    
    console.log('📊 getProgressStats - userId:', userId);
    console.log('📊 req.user:', req.user);
    
    const stats = await progressService.getProgressStats(userId);
    
    console.log('📊 Stats retournées:', stats);
    
    res.status(200).json({
        success: true,
        data: stats
    });
});

/**
 * Vérifier l'accès à une vidéo spécifique
 * GET /api/progress/video/:videoId/access
 */
const checkVideoAccess = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'ID vidéo invalide',
            errors: errors.array()
        });
    }

    const userId = req.user.id;
    const { videoId } = req.params;

    const hasAccess = await progressService.checkVideoAccess(userId, videoId);
    
    res.status(200).json({
        success: true,
        data: {
            hasAccess,
            videoId
        }
    });
});

/**
 * Obtenir la prochaine vidéo accessible
 * GET /api/progress/next-video
 */
const getNextAvailableVideo = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    const nextVideo = await progressService.getNextAvailableVideo(userId);
    
    res.status(200).json({
        success: true,
        data: nextVideo
    });
});

/**
 * Obtenir toutes les vidéos accessibles avec leurs statuts
 * GET /api/progress/accessible-videos
 */
const getAccessibleVideos = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    const videos = await progressService.getAccessibleVideos(userId);
    
    res.status(200).json({
        success: true,
        data: videos
    });
});

/**
 * Obtenir la progression de tous les utilisateurs (admin)
 * GET /api/progress/all
 */
const getAllUsersProgress = asyncHandler(async (req, res) => {
    const filters = {
        isCompleted: req.query.isCompleted === 'true' ? true : 
                    req.query.isCompleted === 'false' ? false : undefined,
        minProgress: req.query.minProgress ? parseInt(req.query.minProgress) : undefined
    };

    const progressList = await progressService.getAllUsersProgress(filters);
    
    res.status(200).json({
        success: true,
        data: progressList
    });
});

/**
 * Obtenir la progression d'un utilisateur spécifique (admin)
 * GET /api/progress/user/:userId
 */
const getUserProgressById = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'ID utilisateur invalide',
            errors: errors.array()
        });
    }

    const { userId } = req.params;
    
    const progress = await progressService.getUserProgress(userId);
    
    res.status(200).json({
        success: true,
        data: progress
    });
});

/**
 * Réinitialiser la progression d'un utilisateur (admin)
 * DELETE /api/progress/user/:userId
 */
const resetUserProgress = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'ID utilisateur invalide',
            errors: errors.array()
        });
    }

    const { userId } = req.params;
    
    const progress = await progressService.resetUserProgress(userId);
    
    res.status(200).json({
        success: true,
        message: 'Progression réinitialisée avec succès',
        data: progress
    });
});

/**
 * Obtenir les statistiques globales de la plateforme (admin)
 * GET /api/progress/global-stats
 */
const getGlobalStats = asyncHandler(async (req, res) => {
    const stats = await progressService.getGlobalStats();
    
    res.status(200).json({
        success: true,
        data: stats
    });
});

/**
 * Obtenir l'historique des tentatives de quiz d'un utilisateur
 * GET /api/progress/quiz-history
 */
const getQuizHistory = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const progress = await progressService.getUserProgress(userId);
    
    const quizHistory = progress.quizAttempts.map(attempt => ({
        quizId: attempt.quizId,
        attemptNumber: attempt.attemptNumber,
        score: attempt.score,
        percentage: attempt.percentage,
        passed: attempt.passed,
        completedAt: attempt.completedAt
    }));

    res.status(200).json({
        success: true,
        data: quizHistory
    });
});

/**
 * Obtenir les statistiques de visionnage d'une vidéo spécifique
 * GET /api/progress/video/:videoId/stats
 */
const getVideoWatchStats = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'ID vidéo invalide',
            errors: errors.array()
        });
    }

    const userId = req.user.id;
    const { videoId } = req.params;
    
    const progress = await progressService.getUserProgress(userId);
    const videoProgress = progress.videoWatchTimes.find(
        vw => vw.videoId.toString() === videoId
    );

    if (!videoProgress) {
        return res.status(404).json({
            success: false,
            message: 'Aucune donnée de visionnage trouvée pour cette vidéo'
        });
    }

    res.status(200).json({
        success: true,
        data: videoProgress
    });
});

// Validation rules
const validateWatchSession = [
    body('videoId')
        .isMongoId()
        .withMessage('ID vidéo invalide'),
    body('startTime')
        .isNumeric()
        .isFloat({ min: 0 })
        .withMessage('Temps de début invalide'),
    body('endTime')
        .isNumeric()
        .isFloat({ min: 0 })
        .withMessage('Temps de fin invalide'),
    body('duration')
        .isNumeric()
        .isFloat({ min: 0 })
        .withMessage('Durée invalide')
];

const validateVideoId = [
    param('videoId')
        .isMongoId()
        .withMessage('ID vidéo invalide')
];

const validateUserId = [
    param('userId')
        .isMongoId()
        .withMessage('ID utilisateur invalide')
];

module.exports = {
    getUserProgress,
    recordWatchSession,
    getProgressStats,
    checkVideoAccess,
    getNextAvailableVideo,
    getAccessibleVideos,
    getAllUsersProgress,
    getUserProgressById,
    resetUserProgress,
    getGlobalStats,
    getQuizHistory,
    getVideoWatchStats,
    validateWatchSession,
    validateVideoId,
    validateUserId
};
