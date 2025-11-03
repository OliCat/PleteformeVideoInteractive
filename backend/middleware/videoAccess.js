const progressService = require('../services/progressService');
const Video = require('../models/Video');

/**
 * Middleware de contrôle d'accès aux vidéos
 * Vérifie que l'utilisateur a le droit d'accéder à une vidéo selon sa progression
 */

/**
 * Vérifier l'accès à une vidéo spécifique
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next
 */
const checkVideoAccess = async (req, res, next) => {
    try {
        // Récupérer l'ID de la vidéo depuis les paramètres
        const videoId = req.params.videoId || req.params.id;
        
        if (!videoId) {
            return res.status(400).json({
                success: false,
                message: 'ID vidéo requis'
            });
        }

        // Vérifier que l'utilisateur est authentifié
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Authentification requise'
            });
        }

        const userId = req.user.id;

        // Les administrateurs ont accès à toutes les vidéos sans restriction
        if (req.user.role === 'admin') {
            req.videoAccess = {
                hasAccess: true,
                videoId,
                userId,
                isAdmin: true
            };
            return next();
        }

        // Vérifier l'accès à la vidéo pour les utilisateurs normaux
        const hasAccess = await progressService.checkVideoAccess(userId, videoId);

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé à cette vidéo. Vous devez compléter la vidéo précédente et réussir son quiz.',
                code: 'VIDEO_ACCESS_DENIED'
            });
        }

        // Ajouter l'information d'accès à la requête pour utilisation ultérieure
        req.videoAccess = {
            hasAccess: true,
            videoId,
            userId,
            isAdmin: false
        };

        next();
    } catch (error) {
        console.error('Erreur dans le middleware de contrôle d\'accès vidéo:', error);
        
        return res.status(500).json({
            success: false,
            message: 'Erreur lors de la vérification d\'accès à la vidéo',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

/**
 * Vérifier l'accès à une vidéo pour le streaming
 * Version spécialisée pour les routes de streaming
 */
const checkVideoStreamingAccess = async (req, res, next) => {
    try {
        const videoId = req.params.videoId || req.params.id;
        
        if (!videoId) {
            return res.status(400).json({
                success: false,
                message: 'ID vidéo requis'
            });
        }

        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Authentification requise pour le streaming'
            });
        }

        const userId = req.user.id;

        // Vérifier l'accès à la vidéo
        const hasAccess = await progressService.checkVideoAccess(userId, videoId);

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé au streaming de cette vidéo',
                code: 'STREAMING_ACCESS_DENIED'
            });
        }

        // Vérifier que la vidéo existe et est publiée
        const video = await Video.findById(videoId);
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Vidéo non trouvée'
            });
        }

        if (!video.isPublished) {
            return res.status(403).json({
                success: false,
                message: 'Cette vidéo n\'est pas encore publiée'
            });
        }

        // Ajouter les informations vidéo à la requête
        req.videoAccess = {
            hasAccess: true,
            videoId,
            userId,
            video
        };

        next();
    } catch (error) {
        console.error('Erreur dans le middleware de contrôle d\'accès streaming:', error);
        
        return res.status(500).json({
            success: false,
            message: 'Erreur lors de la vérification d\'accès au streaming',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

/**
 * Middleware optionnel pour vérifier l'accès (ne bloque pas si échec)
 * Utile pour les routes qui peuvent fonctionner avec ou sans accès
 */
const checkVideoAccessOptional = async (req, res, next) => {
    try {
        const videoId = req.params.videoId || req.params.id;
        
        if (!videoId || !req.user || !req.user.id) {
            req.videoAccess = { hasAccess: false };
            return next();
        }

        const userId = req.user.id;
        const hasAccess = await progressService.checkVideoAccess(userId, videoId);

        req.videoAccess = {
            hasAccess,
            videoId,
            userId
        };

        next();
    } catch (error) {
        console.error('Erreur dans le middleware de contrôle d\'accès optionnel:', error);
        req.videoAccess = { hasAccess: false };
        next();
    }
};

/**
 * Middleware pour vérifier l'accès aux métadonnées vidéo
 * Permet l'accès aux métadonnées même si la vidéo n'est pas débloquée
 * Mais bloque l'accès au contenu vidéo
 */
const checkVideoMetadataAccess = async (req, res, next) => {
    try {
        const videoId = req.params.videoId || req.params.id;
        
        if (!videoId) {
            return res.status(400).json({
                success: false,
                message: 'ID vidéo requis'
            });
        }

        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Authentification requise'
            });
        }

        const userId = req.user.id;

        // Vérifier que la vidéo existe
        const video = await Video.findById(videoId);
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Vidéo non trouvée'
            });
        }

        // Les administrateurs peuvent accéder à toutes les vidéos
        if (req.user.role === 'admin') {
            req.videoAccess = {
                hasAccess: true,
                isAdmin: true,
                video: video
            };
            return next();
        }

        // Pour les utilisateurs normaux, vérifier que la vidéo est publiée
        if (!video.isPublished) {
            return res.status(403).json({
                success: false,
                message: 'Cette vidéo n\'est pas encore publiée'
            });
        }

        // Vérifier l'accès pour le contenu vidéo
        const hasContentAccess = await progressService.checkVideoAccess(userId, videoId);

        req.videoAccess = {
            hasAccess: hasContentAccess,
            videoId,
            userId,
            video,
            hasMetadataAccess: true
        };

        next();
    } catch (error) {
        console.error('Erreur dans le middleware de contrôle d\'accès métadonnées:', error);
        
        return res.status(500).json({
            success: false,
            message: 'Erreur lors de la vérification d\'accès aux métadonnées',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

module.exports = {
    checkVideoAccess,
    checkVideoStreamingAccess,
    checkVideoAccessOptional,
    checkVideoMetadataAccess
};
