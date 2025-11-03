const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
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
} = require('../controllers/progressController');

// Routes utilisateur (authentification requise)
router.get('/', authenticateToken, getUserProgress);
router.get('/stats', authenticateToken, getProgressStats);
router.get('/next-video', authenticateToken, getNextAvailableVideo);
router.get('/accessible-videos', authenticateToken, getAccessibleVideos);
router.get('/quiz-history', authenticateToken, getQuizHistory);
router.get('/video/:videoId/stats', authenticateToken, validateVideoId, getVideoWatchStats);
router.get('/video/:videoId/access', authenticateToken, validateVideoId, checkVideoAccess);

router.post('/watch-session', authenticateToken, validateWatchSession, recordWatchSession);

// Routes admin (authentification + rôle admin requis)
router.get('/all', authenticateToken, requireAdmin, getAllUsersProgress);
router.get('/global-stats', authenticateToken, requireAdmin, getGlobalStats);
router.get('/user/:userId', authenticateToken, requireAdmin, validateUserId, getUserProgressById);
router.delete('/user/:userId', authenticateToken, requireAdmin, validateUserId, resetUserProgress);

module.exports = router; 