const { validationResult } = require('express-validator');
const videoService = require('../services/videoService');
const progressService = require('../services/progressService');
const Video = require('../models/Video');

// Upload et traitement d'une nouvelle vidéo
const uploadVideo = async (req, res) => {
    try {
        // Vérifier les erreurs de validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: errors.array()
            });
        }

        // Trouver le fichier vidéo dans req.files
        const videoFile = req.files?.find(file => file.fieldname === 'video');
        
        if (!videoFile) {
            return res.status(400).json({
                success: false,
                message: 'Aucun fichier vidéo fourni'
            });
        }

        // Extraire les champs du formulaire depuis req.body (où multer les place)
        let title = req.body.title;
        let description = req.body.description || '';
        let order = req.body.order ? parseInt(req.body.order) : null;
        let isPublished = req.body.isPublished === 'true' || req.body.isPublished === true;

        console.log('🔧 Controller - Reçu:', {
            title,
            description,
            order,
            isPublished,
            videoFile: videoFile.originalname
        });

        // Si l'ordre n'est pas spécifié, chercher le prochain ordre disponible
        if (!order || order < 1) {
            const lastVideo = await Video.findOne({}).sort({ order: -1 });
            order = lastVideo ? lastVideo.order + 1 : 1;
            console.log('🔧 Controller - Ordre calculé automatiquement:', order);
        } else {
            // Vérifier si l'ordre existe déjà
            const existingVideo = await Video.findOne({ order });
            if (existingVideo) {
                console.log('⚠️ Controller - Ordre déjà utilisé, recalcul automatique');
                const lastVideo = await Video.findOne({}).sort({ order: -1 });
                order = lastVideo ? lastVideo.order + 1 : 1;
                console.log('🔧 Controller - Ordre recalculé automatiquement:', order);
            }
        }

        // Traiter la vidéo uploadée
        const video = await videoService.processUploadedVideo(
            videoFile,
            title,
            description,
            order,
            req.user.id,
            isPublished
        );

        res.status(201).json({
            success: true,
            message: 'Vidéo uploadée et traitée avec succès',
            data: video
        });

    } catch (error) {
        console.error('Erreur lors de l\'upload de la vidéo:', error);
        
        if (error.message.includes('Format de fichier non supporté')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        if (error.message.includes('Fichier trop volumineux')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur lors du traitement de la vidéo',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Récupération de toutes les vidéos
const getAllVideos = async (req, res) => {
    try {
        const videos = await videoService.getAllVideos();

        res.status(200).json({
            success: true,
            count: videos.length,
            data: videos
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des vidéos:', error);
        
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des vidéos',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Récupération d'une vidéo par ID
const getVideoById = async (req, res) => {
    try {
        const { videoId } = req.params;
        const userId = req.user ? req.user.id : null;
        
        const video = await videoService.getVideoById(videoId);
        
        // Si l'utilisateur est connecté, vérifier l'accès
        let hasAccess = false;
        if (userId) {
            hasAccess = await progressService.checkVideoAccess(userId, videoId);
        }

        // Construire l'objet de réponse avec toutes les propriétés nécessaires
        const videoResponse = {
            ...video.toObject({ virtuals: true }),
            hasAccess
        };

        console.log(`📹 Video ${videoId} - quizId:`, videoResponse.quizId);

        res.status(200).json({
            success: true,
            data: videoResponse
        });

    } catch (error) {
        console.error('Erreur lors de la récupération de la vidéo:', error);
        
        if (error.message.includes('non trouvée')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération de la vidéo',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Mise à jour d'une vidéo
const updateVideo = async (req, res) => {
    try {
        // Vérifier les erreurs de validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: errors.array()
            });
        }

        const { videoId } = req.params;
        const updateData = req.body;

        // Mettre à jour la vidéo
        const updatedVideo = await videoService.updateVideo(videoId, updateData);

        res.status(200).json({
            success: true,
            message: 'Vidéo mise à jour avec succès',
            data: updatedVideo
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour de la vidéo:', error);
        
        if (error.message.includes('non trouvée')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour de la vidéo',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Suppression d'une vidéo
const deleteVideo = async (req, res) => {
    try {
        const { videoId } = req.params;

        // Supprimer la vidéo
        const result = await videoService.deleteVideo(videoId);

        res.status(200).json({
            success: true,
            message: result.message
        });

    } catch (error) {
        console.error('Erreur lors de la suppression de la vidéo:', error);
        
        if (error.message.includes('non trouvée')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression de la vidéo',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Réorganisation de l'ordre des vidéos
const reorderVideos = async (req, res) => {
    try {
        // Vérifier les erreurs de validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: errors.array()
            });
        }

        const { videoOrders } = req.body;

        if (!Array.isArray(videoOrders) || videoOrders.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'La liste des ordres de vidéos est requise'
            });
        }

        // Réorganiser les vidéos
        const result = await videoService.reorderVideos(videoOrders);

        res.status(200).json({
            success: true,
            message: result.message
        });

    } catch (error) {
        console.error('Erreur lors de la réorganisation des vidéos:', error);
        
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la réorganisation des vidéos',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Statistiques des vidéos
const getVideoStats = async (req, res) => {
    try {
        const stats = await videoService.getVideoStats();

        res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des statistiques',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Recherche de vidéos
const searchVideos = async (req, res) => {
    try {
        const { q, format, minDuration, maxDuration, sortBy = 'title', sortOrder = 'asc' } = req.query;

        // Construire la requête de recherche
        const searchQuery = {};

        if (q) {
            searchQuery.$or = [
                { title: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } }
            ];
        }

        if (format) {
            searchQuery['metadata.codec'] = format;
        }

        if (minDuration || maxDuration) {
            searchQuery.duration = {};
            if (minDuration) searchQuery.duration.$gte = parseInt(minDuration);
            if (maxDuration) searchQuery.duration.$lte = parseInt(maxDuration);
        }

        // Construire l'ordre de tri
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const videos = await Video.find(searchQuery)
            .sort(sortOptions)
            .limit(parseInt(req.query.limit) || 50);

        res.status(200).json({
            success: true,
            count: videos.length,
            data: videos
        });

    } catch (error) {
        console.error('Erreur lors de la recherche de vidéos:', error);
        
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la recherche de vidéos',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Récupération des vidéos par page (pagination)
const getVideosPaginated = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [videos, total] = await Promise.all([
            Video.find({})
                .sort({ order: 1, createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Video.countDocuments({})
        ]);

        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            data: videos,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: total,
                itemsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération paginée des vidéos:', error);
        
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des vidéos',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Obtenir les vidéos accessibles selon la progression de l'utilisateur
const getAccessibleVideos = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const accessibleVideos = await progressService.getAccessibleVideos(userId);

        res.status(200).json({
            success: true,
            data: accessibleVideos
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des vidéos accessibles:', error);
        
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des vidéos accessibles',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Obtenir le parcours d'apprentissage complet avec statuts
const getLearningPath = async (req, res) => {
    try {
        const userId = req.user.id;

        // Récupérer toutes les vidéos publiées
        const allVideos = await Video.find({ isPublished: true }).sort({ order: 1 });

        // Vérifier si l'utilisateur est admin
        const User = require('../models/User');
        const user = await User.findById(userId);
        const isAdmin = user && user.role === 'admin';

        // Les administrateurs voient toutes les vidéos comme débloquées
        if (isAdmin) {
            const learningPath = allVideos.map(video => ({
                ...video.toObject({ virtuals: true }),
                hasAccess: true,
                isCompleted: false,
                watchProgress: null,
                status: 'unlocked'
            }));

            return res.status(200).json({
                success: true,
                data: {
                    videos: learningPath,
                    userProgress: {
                        currentPosition: 1,
                        completedVideos: 0,
                        totalVideos: allVideos.length,
                        completionPercentage: 0
                    }
                }
            });
        }

        // Récupérer la progression de l'utilisateur normal
        const progress = await progressService.getUserProgress(userId);

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

        // Enrichir chaque vidéo avec les informations de progression
        const learningPath = allVideos.map(video => {
            let hasAccess = false;
            const videoIdStr = video._id.toString();

            // La première vidéo est toujours accessible
            if (video.order === 1) {
                hasAccess = true;
            } else {
                // Pour les autres vidéos, vérifier si la précédente est complétée
                const previousVideo = allVideos.find(prev => prev.order === video.order - 1);
                if (previousVideo) {
                    const previousVideoIdStr = previousVideo._id.toString();
                    hasAccess = completedVideoIdsSet.has(previousVideoIdStr);
                }
            }

            const isCompleted = completedVideoIdsSet.has(videoIdStr);

            const videoProgress = progress.videoWatchTimes.find(
                vw => vw.videoId.toString() === video._id.toString()
            );

            return {
                ...video.toObject({ virtuals: true }),
                hasAccess,
                isCompleted,
                watchProgress: videoProgress ? {
                    completionPercentage: videoProgress.completionPercentage,
                    totalWatchTime: videoProgress.totalWatchTime,
                    lastWatchedPosition: videoProgress.lastWatchedPosition
                } : null,
                status: isCompleted ? 'completed' : (hasAccess ? 'unlocked' : 'locked')
            };
        });

        res.status(200).json({
            success: true,
            data: {
                videos: learningPath,
                userProgress: {
                    currentPosition: progress.currentPosition,
                    completedVideos: progress.completedVideos.length,
                    totalVideos: allVideos.length,
                    completionPercentage: allVideos.length > 0 
                        ? Math.round((progress.completedVideos.length / allVideos.length) * 100)
                        : 0
                }
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération du parcours d\'apprentissage:', error);
        
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du parcours d\'apprentissage',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

module.exports = {
    uploadVideo,
    getAllVideos,
    getVideoById,
    updateVideo,
    deleteVideo,
    reorderVideos,
    getVideoStats,
    searchVideos,
    getVideosPaginated,
    getAccessibleVideos,
    getLearningPath
};
