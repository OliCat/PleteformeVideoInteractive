const mongoose = require('mongoose');
const UserProgress = require('../models/UserProgress');
const Video = require('../models/Video');
const Quiz = require('../models/Quiz');

/**
 * Service de gestion de la progression des utilisateurs
 * Gère le suivi du parcours vidéo, les sessions de visionnage et le déblocage séquentiel
 */

/**
 * Récupérer ou créer la progression d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Object} Progression de l'utilisateur
 */
const getUserProgress = async (userId) => {
    try {
        // S'assurer que userId est correctement formaté
        const userIdStr = userId.toString ? userId.toString() : userId;
        console.log('🔍 getUserProgress - userId (string):', userIdStr);
        console.log('🔍 getUserProgress - userId (type):', typeof userId);
        
        // Convertir en ObjectId si nécessaire pour la recherche
        let userIdQuery;
        try {
            userIdQuery = mongoose.Types.ObjectId.isValid(userIdStr) 
                ? new mongoose.Types.ObjectId(userIdStr)
                : userIdStr;
        } catch (e) {
            userIdQuery = userIdStr;
        }
        
        console.log('🔍 Recherche avec userIdQuery:', userIdQuery);
        
        // Chercher d'abord si une progression existe (avec conversion de type pour MongoDB)
        let progress = await UserProgress.findOne({ 
            userId: userIdQuery 
        });
        
        console.log('🔍 Progression existante trouvée:', progress ? 'OUI' : 'NON');
        
        if (progress) {
            console.log('📊 Données de progression existante:', {
                completedVideos: progress.completedVideos?.length || 0,
                currentPosition: progress.currentPosition,
                totalVideosWatched: progress.totalVideosWatched,
                userId: progress.userId.toString()
            });
            
            // Nettoyer les IDs invalides avant de retourner
            const Video = require('../models/Video');
            const validCompletedVideos = [];
            for (const videoId of progress.completedVideos || []) {
                const videoExists = await Video.exists({ _id: videoId });
                if (videoExists) {
                    validCompletedVideos.push(videoId);
                }
            }
            
            // Mettre à jour si des IDs ont été supprimés
            if (validCompletedVideos.length !== progress.completedVideos.length) {
                progress.completedVideos = validCompletedVideos;
                progress.totalVideosWatched = validCompletedVideos.length;
                await progress.save();
                console.log('🧹 IDs invalides nettoyés dans la progression');
            }
            
            // Si une progression existe, la retourner directement avec les populate
            return await UserProgress.findById(progress._id)
                .populate('completedVideos', 'title order')
                .populate('videoWatchTimes.videoId', 'title order duration')
                .populate('quizAttempts.quizId', 'title videoId');
        }
        
        // Si aucune progression n'existe, en créer une nouvelle
        console.log('📝 Création d\'une nouvelle progression pour userId:', userIdStr);
        
        progress = await UserProgress.findOneAndUpdate(
            { userId: userIdQuery },
            {
                $setOnInsert: {
                    userId: userIdQuery,
                    currentPosition: 1,
                    completedVideos: [],
                    videoWatchTimes: [],
                    quizAttempts: [],
                    totalVideosWatched: 0,
                    totalQuizzesPassed: 0,
                    totalTimeSpent: 0,
                    startedAt: new Date(),
                    lastActivityAt: new Date()
                }
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        )
        .populate('completedVideos', 'title order')
        .populate('videoWatchTimes.videoId', 'title order duration')
        .populate('quizAttempts.quizId', 'title videoId');

        console.log('📊 Progression retournée:', {
            completedVideos: progress.completedVideos?.length || 0,
            currentPosition: progress.currentPosition,
            totalVideosWatched: progress.totalVideosWatched
        });

        return progress;
    } catch (error) {
        console.error('Erreur lors de la récupération de la progression:', error);
        throw new Error(`Impossible de récupérer la progression: ${error.message}`);
    }
};

/**
 * Enregistrer une session de visionnage
 * @param {string} userId - ID de l'utilisateur
 * @param {string} videoId - ID de la vidéo
 * @param {number} startTime - Temps de début en secondes
 * @param {number} endTime - Temps de fin en secondes
 * @param {number} duration - Durée totale de la vidéo en secondes
 * @returns {Object} Progression mise à jour
 */
const recordWatchSession = async (userId, videoId, startTime, endTime, duration) => {
    try {
        const progress = await getUserProgress(userId);
        
        // Vérifier que l'utilisateur a accès à cette vidéo
        const hasAccess = await checkVideoAccess(userId, videoId);
        if (!hasAccess) {
            throw new Error('Accès refusé à cette vidéo');
        }

        // Enregistrer la session de visionnage
        await progress.recordWatchSession(videoId, startTime, endTime, duration);
        
        return progress;
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement de la session:', error);
        throw new Error(`Impossible d'enregistrer la session: ${error.message}`);
    }
};

/**
 * Marquer une vidéo comme terminée après quiz réussi
 * @param {string} userId - ID de l'utilisateur
 * @param {string} videoId - ID de la vidéo
 * @param {Object} quizResult - Résultat du quiz
 * @returns {Object} Progression mise à jour
 */
const completeVideoWithQuiz = async (userId, videoId, quizResult) => {
    try {
        console.log(`🎯 Début de completeVideoWithQuiz pour utilisateur ${userId}, vidéo ${videoId}`);
        console.log(`📊 Résultat du quiz:`, {
            passed: quizResult.passed,
            percentage: quizResult.percentage,
            totalScore: quizResult.totalScore,
            totalPoints: quizResult.totalPoints,
            quizId: quizResult.quizId
        });
        
        // Vérifier que la vidéo existe
        const Video = require('../models/Video');
        const video = await Video.findById(videoId);
        if (!video) {
            console.error(`❌ Vidéo ${videoId} non trouvée dans la base de données`);
            throw new Error(`Vidéo ${videoId} non trouvée`);
        }
        console.log(`✅ Vidéo trouvée: ${video.title} (ordre: ${video.order})`);
        
        const progress = await getUserProgress(userId);
        console.log(`📈 Progression avant mise à jour:`, {
            completedVideos: progress.completedVideos.length,
            currentPosition: progress.currentPosition,
            totalVideosWatched: progress.totalVideosWatched
        });
        
        // Vérifier que le quiz a été réussi (≥80%)
        if (!quizResult.passed) {
            throw new Error('Le quiz doit être réussi pour débloquer la vidéo suivante');
        }

        // Enregistrer la tentative de quiz
        console.log(`📝 Enregistrement de la tentative de quiz...`);
        await progress.recordQuizAttempt(quizResult.quizId, quizResult, quizResult.timeSpent || 0);
        console.log(`✅ Tentative de quiz enregistrée`);
        
        // Recharger la progression pour avoir les dernières données (après recordQuizAttempt)
        console.log(`🔄 Rechargement de la progression après recordQuizAttempt...`);
        const UserProgress = require('../models/UserProgress');
        const updatedProgress = await UserProgress.findOne({ userId: progress.userId });
        if (!updatedProgress) {
            throw new Error('Progression non trouvée après recordQuizAttempt');
        }
        console.log(`✅ Progression rechargée:`, {
            completedVideos: updatedProgress.completedVideos.length,
            currentPosition: updatedProgress.currentPosition
        });
        
        // Marquer la vidéo comme terminée
        console.log(`📝 Marquage de la vidéo ${videoId} comme terminée...`);
        try {
            await updatedProgress.completeVideo(videoId);
            console.log(`✅ Vidéo ${videoId} marquée comme terminée`);
        } catch (completeError) {
            console.error(`❌ Erreur lors du marquage de la vidéo comme terminée:`, completeError);
            throw completeError;
        }
        
        // Recharger une dernière fois pour vérifier
        console.log(`🔄 Rechargement final de la progression...`);
        const finalProgress = await UserProgress.findOne({ userId: progress.userId })
            .populate('completedVideos', 'title order');
        
        if (!finalProgress) {
            throw new Error('Progression non trouvée après completeVideo');
        }
        
        const completedVideoIds = finalProgress.completedVideos.map(v => {
            if (typeof v === 'object' && v._id) {
                return v._id.toString();
            }
            return v.toString();
        });
        
        console.log(`📈 Progression finale:`, {
            completedVideos: finalProgress.completedVideos.length,
            currentPosition: finalProgress.currentPosition,
            totalVideosWatched: finalProgress.totalVideosWatched,
            completedVideoIds: completedVideoIds
        });
        
        return finalProgress;
    } catch (error) {
        console.error('Erreur lors de la completion de la vidéo:', error);
        throw new Error(`Impossible de terminer la vidéo: ${error.message}`);
    }
};

/**
 * Obtenir les statistiques de progression d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Object} Statistiques de progression
 */
const getProgressStats = async (userId) => {
    try {
        const progress = await getUserProgress(userId);
        const stats = await progress.getProgressStats();
        
        return {
            ...stats,
            userProgress: progress
        };
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        throw new Error(`Impossible de récupérer les statistiques: ${error.message}`);
    }
};

/**
 * Vérifier si un utilisateur a accès à une vidéo (déblocage strict)
 * @param {string} userId - ID de l'utilisateur
 * @param {string} videoId - ID de la vidéo
 * @returns {boolean} True si l'utilisateur a accès
 */
const checkVideoAccess = async (userId, videoId) => {
    try {
        const video = await Video.findById(videoId);
        if (!video) {
            return false;
        }

        // Les administrateurs ont accès à toutes les vidéos
        const User = require('../models/User');
        const user = await User.findById(userId);
        if (user && user.role === 'admin') {
            return true;
        }

        const progress = await getUserProgress(userId);

        // La première vidéo est toujours accessible
        if (video.order === 1) {
            return true;
        }

        // Vérifier si l'utilisateur a complété la vidéo précédente
        const previousVideo = await video.getPreviousVideo();
        if (!previousVideo) {
            // Si c'est la première vidéo, elle devrait être accessible
            return true;
        }

        // Créer un Set des IDs des vidéos complétées pour une recherche efficace
        // Gérer les cas où completedVideos peut contenir des doublons ou des IDs non populés
        const completedVideoIdsSet = new Set();
        for (const completedId of progress.completedVideos) {
            let idStr;
            if (typeof completedId === 'object' && completedId !== null) {
                if (completedId._id) {
                    idStr = completedId._id.toString();
                } else if (completedId.toString) {
                    idStr = completedId.toString();
                }
            } else if (typeof completedId === 'string') {
                idStr = completedId;
            }
            if (idStr) {
                completedVideoIdsSet.add(idStr);
            }
        }

        // Vérifier si la vidéo précédente est complétée
        const previousVideoIdStr = previousVideo._id.toString();
        const isPreviousCompleted = completedVideoIdsSet.has(previousVideoIdStr);

        return isPreviousCompleted;
    } catch (error) {
        console.error('Erreur lors de la vérification d\'accès:', error);
        return false;
    }
};

/**
 * Obtenir la prochaine vidéo accessible pour un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Object|null} Prochaine vidéo accessible ou null
 */
const getNextAvailableVideo = async (userId) => {
    try {
        const progress = await getUserProgress(userId);
        
        // Si aucune vidéo complétée, retourner la première
        if (progress.completedVideos.length === 0) {
            return await Video.findOne({ order: 1, isPublished: true });
        }

        // Trouver la dernière vidéo complétée
        const lastCompletedVideo = await Video.findById(
            progress.completedVideos[progress.completedVideos.length - 1]
        );

        if (!lastCompletedVideo) {
            return await Video.findOne({ order: 1, isPublished: true });
        }

        // Retourner la vidéo suivante
        return await Video.findOne({
            order: { $gt: lastCompletedVideo.order },
            isPublished: true
        }).sort({ order: 1 });
    } catch (error) {
        console.error('Erreur lors de la récupération de la prochaine vidéo:', error);
        return null;
    }
};

/**
 * Obtenir toutes les vidéos accessibles à un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Array} Liste des vidéos accessibles avec statuts
 */
const getAccessibleVideos = async (userId) => {
    try {
        const progress = await getUserProgress(userId);
        const allVideos = await Video.find({ isPublished: true }).sort({ order: 1 });

        const accessibleVideos = [];

        // Vérifier si l'utilisateur est admin
        const User = require('../models/User');
        const user = await User.findById(userId);
        const isAdmin = user && user.role === 'admin';

        // Créer un Set des IDs des vidéos complétées pour une recherche rapide
        // Gérer le cas où completedVideos peut contenir des doublons ou des IDs non populés
        const completedVideoIdsSet = new Set();
        for (const completedId of progress.completedVideos) {
            // Gérer les cas où completedId peut être un ObjectId, un string, ou un objet avec _id
            let idStr;
            if (typeof completedId === 'object' && completedId !== null) {
                if (completedId._id) {
                    idStr = completedId._id.toString();
                } else if (completedId.toString) {
                    idStr = completedId.toString();
                }
            } else if (typeof completedId === 'string') {
                idStr = completedId;
            }
            if (idStr) {
                completedVideoIdsSet.add(idStr);
            }
        }

        // Retourner TOUTES les vidéos avec leur statut (même les verrouillées)
        // Cela permet à l'utilisateur de voir tout le parcours d'apprentissage
        for (const video of allVideos) {
            const hasAccess = await checkVideoAccess(userId, video._id);
            
            // Vérifier si la vidéo est complétée en utilisant le Set
            const videoIdStr = video._id.toString();
            const isCompleted = completedVideoIdsSet.has(videoIdStr);

            // Trouver les informations de progression pour cette vidéo
            const videoProgress = progress.videoWatchTimes.find(
                vw => vw.videoId.toString() === videoIdStr
            );

            accessibleVideos.push({
                ...video.toObject({ virtuals: true }),
                hasAccess,
                isCompleted,
                watchProgress: videoProgress ? {
                    completionPercentage: videoProgress.completionPercentage,
                    totalWatchTime: videoProgress.totalWatchTime,
                    lastWatchedPosition: videoProgress.lastWatchedPosition
                } : null,
                status: isAdmin ? 'unlocked' : (isCompleted ? 'completed' : (hasAccess ? 'unlocked' : 'locked'))
            });

            // Ne plus s'arrêter à la première vidéo verrouillée
            // L'utilisateur doit voir toutes les vidéos pour comprendre le parcours complet
        }

        return accessibleVideos;
    } catch (error) {
        console.error('Erreur lors de la récupération des vidéos accessibles:', error);
        throw new Error(`Impossible de récupérer les vidéos accessibles: ${error.message}`);
    }
};

/**
 * Obtenir la progression de tous les utilisateurs (admin)
 * @param {Object} filters - Filtres optionnels
 * @returns {Array} Liste des progressions utilisateurs
 */
const getAllUsersProgress = async (filters = {}) => {
    try {
        const query = {};
        
        // Appliquer les filtres
        if (filters.isCompleted !== undefined) {
            query.completedAt = filters.isCompleted ? { $exists: true } : { $exists: false };
        }
        
        if (filters.minProgress) {
            // Cette logique nécessiterait un calcul plus complexe
            // Pour l'instant, on retourne tous les utilisateurs
        }

        const progressList = await UserProgress.find(query)
            .populate('userId', 'firstName lastName email role')
            .populate('completedVideos', 'title order')
            .sort({ lastActivityAt: -1 });

        return progressList;
    } catch (error) {
        console.error('Erreur lors de la récupération de toutes les progressions:', error);
        throw new Error(`Impossible de récupérer les progressions: ${error.message}`);
    }
};

/**
 * Réinitialiser la progression d'un utilisateur (admin)
 * @param {string} userId - ID de l'utilisateur
 * @returns {Object} Progression réinitialisée
 */
const resetUserProgress = async (userId) => {
    try {
        const progress = await UserProgress.findOne({ userId });
        
        if (!progress) {
            throw new Error('Progression non trouvée');
        }

        // Réinitialiser tous les champs
        progress.completedVideos = [];
        progress.currentPosition = 1;
        progress.videoWatchTimes = [];
        progress.quizAttempts = [];
        progress.totalVideosWatched = 0;
        progress.totalQuizzesPassed = 0;
        progress.totalTimeSpent = 0;
        progress.completedAt = undefined;
        progress.lastActivityAt = new Date();

        await progress.save();
        return progress;
    } catch (error) {
        console.error('Erreur lors de la réinitialisation:', error);
        throw new Error(`Impossible de réinitialiser la progression: ${error.message}`);
    }
};

/**
 * Obtenir les statistiques globales de la plateforme (admin)
 * @returns {Object} Statistiques globales
 */
const getGlobalStats = async () => {
    try {
        const User = require('../models/User');
        
        // Compter uniquement les utilisateurs qui existent réellement dans la collection User
        const totalUsers = await User.countDocuments();
        
        // Récupérer tous les IDs d'utilisateurs valides
        const validUserIds = await User.find({}, '_id').then(users => users.map(u => u._id));
        
        // Compter les UserProgress qui correspondent à des utilisateurs valides
        const validProgressCount = await UserProgress.countDocuments({ 
            userId: { $in: validUserIds } 
        });
        
        // Compter les parcours complétés (uniquement pour les utilisateurs valides)
        const completedUsers = await UserProgress.countDocuments({ 
            completedAt: { $exists: true },
            userId: { $in: validUserIds }
        });
        
        const totalVideos = await Video.countDocuments({ isPublished: true });
        const Quiz = require('../models/Quiz');
        const totalQuizzes = await Quiz.countDocuments({ isActive: true });
        
        // Calculer la progression moyenne et les statistiques globales (uniquement pour les utilisateurs valides)
        const allProgress = await UserProgress.find(
            { userId: { $in: validUserIds } }, 
            'completedVideos totalQuizzesPassed quizAttempts totalTimeSpent'
        );
        
        let totalCompletedVideos = 0;
        let totalQuizAttempts = 0;
        let totalQuizzesPassed = 0;
        let totalTimeSpent = 0;
        
        for (const progress of allProgress) {
            totalCompletedVideos += progress.completedVideos.length;
            totalQuizzesPassed += progress.totalQuizzesPassed || 0;
            totalTimeSpent += progress.totalTimeSpent || 0;
            
            // Compter les tentatives de quiz
            if (progress.quizAttempts && Array.isArray(progress.quizAttempts)) {
                totalQuizAttempts += progress.quizAttempts.length;
            }
        }
        
        const avgProgress = allProgress.length > 0 && totalVideos > 0
            ? Math.round((totalCompletedVideos / (allProgress.length * totalVideos)) * 100) || 0
            : 0;
        
        const avgQuizzesPassed = allProgress.length > 0
            ? Math.round((totalQuizzesPassed / allProgress.length) * 10) / 10 || 0
            : 0;
        
        const avgTimeSpent = allProgress.length > 0
            ? Math.round(totalTimeSpent / allProgress.length)
            : 0;
        
        const completionRate = validProgressCount > 0 ? Math.round((completedUsers / validProgressCount) * 100) : 0;
        
        return {
            totalUsers,
            completedUsers,
            totalVideos,
            totalQuizzes,
            averageProgress: avgProgress,
            completionRate,
            totalQuizAttempts,
            totalQuizzesPassed,
            avgQuizzesPassed,
            avgTimeSpent,
            totalTimeSpent
        };
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques globales:', error);
        throw new Error(`Impossible de récupérer les statistiques globales: ${error.message}`);
    }
};

module.exports = {
    getUserProgress,
    recordWatchSession,
    completeVideoWithQuiz,
    getProgressStats,
    checkVideoAccess,
    getNextAvailableVideo,
    getAccessibleVideos,
    getAllUsersProgress,
    resetUserProgress,
    getGlobalStats
};
