const { validationResult } = require('express-validator');
const quizService = require('../services/quizService');
const progressService = require('../services/progressService');

// Créer un nouveau quiz
const createQuiz = async (req, res) => {
    try {
        // Vérifier les erreurs de validation
        console.log('📝 Données reçues pour création de quiz:', JSON.stringify(req.body, null, 2));
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ Erreurs de validation:', errors.array());
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: errors.array()
            });
        }

        const userId = req.user._id;
        const quizData = req.body;

        // Créer le quiz
        const newQuiz = await quizService.createQuiz(quizData, userId);

        res.status(201).json({
            success: true,
            message: 'Quiz créé avec succès',
            data: newQuiz
        });

    } catch (error) {
        console.error('Erreur lors de la création du quiz:', error);
        
        if (error.message.includes('Vidéo introuvable')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        
        if (error.message.includes('existe déjà')) {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création du quiz',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Récupérer tous les quiz
const getAllQuizzes = async (req, res) => {
    try {
        const { videoId, difficulty, isActive, tags, search } = req.query;
        const filters = {};

        if (videoId) filters.videoId = videoId;
        if (difficulty) filters.difficulty = difficulty;
        if (isActive !== undefined) filters.isActive = isActive === 'true';
        if (tags) filters.tags = tags.split(',');

        // Les admins peuvent voir les quiz inactifs, les utilisateurs normaux non
        const User = require('../models/User');
        const user = await User.findById(req.user._id);
        const includeInactive = user && user.role === 'admin';

        let quizzes;
        if (search) {
            quizzes = await quizService.searchQuizzes(search, filters, includeInactive);
        } else {
            quizzes = await quizService.getAllQuizzes(filters, includeInactive);
        }

        res.status(200).json({
            success: true,
            data: quizzes
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des quiz:', error);
        
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des quiz',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Récupérer un quiz par ID
const getQuizById = async (req, res) => {
    try {
        const { quizId } = req.params;
        const { includeAnswers } = req.query;
        
        const includeAnswersBool = includeAnswers === 'true';
        const quiz = await quizService.getQuizById(quizId, includeAnswersBool);

        res.status(200).json({
            success: true,
            data: quiz
        });

    } catch (error) {
        console.error('Erreur lors de la récupération du quiz:', error);
        
        if (error.message.includes('introuvable')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du quiz',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Récupérer un quiz par ID de vidéo
const getQuizByVideoId = async (req, res) => {
    try {
        const { videoId } = req.params;
        const { includeAnswers } = req.query;
        
        const includeAnswersBool = includeAnswers === 'true';
        const quiz = await quizService.getQuizByVideoId(videoId, includeAnswersBool);

        res.status(200).json({
            success: true,
            data: quiz
        });

    } catch (error) {
        console.error('Erreur lors de la récupération du quiz par vidéo:', error);
        
        if (error.message.includes('Aucun quiz trouvé')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du quiz',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Mettre à jour un quiz
const updateQuiz = async (req, res) => {
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

        const { quizId } = req.params;
        const userId = req.user._id;
        const updateData = req.body;

        // Mettre à jour le quiz
        const updatedQuiz = await quizService.updateQuiz(quizId, updateData, userId);

        res.status(200).json({
            success: true,
            message: 'Quiz mis à jour avec succès',
            data: updatedQuiz
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour du quiz:', error);
        
        if (error.message.includes('introuvable')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        
        if (error.message.includes('pas autorisé')) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour du quiz',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Supprimer un quiz
const deleteQuiz = async (req, res) => {
    try {
        const { quizId } = req.params;
        const userId = req.user._id;

        // Supprimer le quiz
        const result = await quizService.deleteQuiz(quizId, userId);

        res.status(200).json({
            success: true,
            message: result.message
        });

    } catch (error) {
        console.error('Erreur lors de la suppression du quiz:', error);
        
        if (error.message.includes('introuvable')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        
        if (error.message.includes('pas autorisé')) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression du quiz',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Évaluer un quiz
const evaluateQuiz = async (req, res) => {
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

        const { quizId } = req.params;
        const userId = req.user._id;
        const { answers } = req.body;

        if (!answers || typeof answers !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Les réponses sont requises'
            });
        }

        // Évaluer le quiz
        console.log(`\n📝 ÉVALUATION DU QUIZ - Début`);
        console.log(`   - quizId: ${quizId}`);
        console.log(`   - userId: ${userId}`);
        console.log(`   - Nombre de réponses: ${Object.keys(answers || {}).length}`);
        
        const result = await quizService.evaluateQuiz(quizId, answers, userId);
        
        console.log(`\n📊 RÉSULTAT DU QUIZ:`);
        console.log(`   - passed: ${result.passed}`);
        console.log(`   - percentage: ${result.percentage}%`);
        console.log(`   - totalScore: ${result.totalScore}/${result.totalPoints}`);
        console.log(`   - quizId dans result: ${result.quizId}`);

        // Si le quiz est réussi (≥80%), débloquer la vidéo suivante
        if (result.passed) {
            console.log(`\n✅ LE QUIZ EST RÉUSSI ! Entrée dans le bloc if (result.passed)`);
            try {
                console.log(`\n🎯 Quiz réussi ! Début du processus de déblocage...`);
                
                // Récupérer le quiz pour obtenir l'ID de la vidéo
                const quiz = await quizService.getQuizById(quizId, false);
                console.log(`🔍 Quiz récupéré:`, {
                    quizId: quiz?._id?.toString(),
                    hasVideoId: !!quiz?.videoId,
                    videoId: quiz?.videoId
                });
                
                if (!quiz) {
                    console.error('❌ Quiz non trouvé');
                } else if (!quiz.videoId) {
                    console.error('❌ Le quiz n\'a pas de vidéo associée');
                } else {
                    console.log(`🔍 quiz.videoId:`, quiz.videoId);
                    console.log(`🔍 Type de quiz.videoId:`, typeof quiz.videoId);
                    if (quiz.videoId._id) {
                        console.log(`🔍 quiz.videoId._id:`, quiz.videoId._id);
                    }
                    
                    // S'assurer que videoId est une string valide
                    let videoId;
                    if (typeof quiz.videoId === 'object' && quiz.videoId._id) {
                        videoId = quiz.videoId._id.toString();
                    } else if (typeof quiz.videoId === 'string') {
                        videoId = quiz.videoId;
                    } else {
                        videoId = quiz.videoId.toString();
                    }
                    
                    console.log(`🎯 ID de vidéo à débloquer: ${videoId} (type: ${typeof videoId})`);
                    console.log(`🎯 userId: ${userId} (type: ${typeof userId})`);
                    console.log(`🎯 result.passed: ${result.passed}, result.percentage: ${result.percentage}%`);
                    
                    // Ajouter quizId au result si pas présent
                    if (!result.quizId) {
                        result.quizId = quizId;
                    }
                    
                    // Marquer la vidéo comme terminée dans la progression
                    console.log(`📞 Appel de completeVideoWithQuiz...`);
                    await progressService.completeVideoWithQuiz(userId, videoId, result);
                    console.log(`✅ Vidéo ${videoId} débloquée pour l'utilisateur ${userId} après quiz réussi`);
                }
            } catch (progressError) {
                console.error('❌ Erreur lors du déblocage de la vidéo:', progressError);
                console.error('❌ Stack trace:', progressError.stack);
                // Ne pas faire échouer l'évaluation du quiz si le déblocage échoue
            }
        } else {
            console.log(`⚠️ Quiz non réussi (${result.percentage}% < ${result.passingScore || 80}%)`);
        }

        console.log('📤 Réponse envoyée au frontend:');
        console.log(JSON.stringify({
            success: true,
            message: 'Quiz évalué avec succès',
            data: result
        }, null, 2));

        res.status(200).json({
            success: true,
            message: 'Quiz évalué avec succès',
            data: result
        });

    } catch (error) {
        console.error('Erreur lors de l\'évaluation du quiz:', error);
        
        if (error.message.includes('introuvable')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        
        if (error.message.includes('plus actif')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'évaluation du quiz',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Récupérer les statistiques d'un quiz
const getQuizStats = async (req, res) => {
    try {
        const { quizId } = req.params;
        
        const stats = await quizService.getQuizStats(quizId);

        res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        
        if (error.message.includes('introuvable')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des statistiques',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Activer/désactiver un quiz
const toggleQuizStatus = async (req, res) => {
    try {
        const { quizId } = req.params;
        const userId = req.user._id;

        // Basculer le statut du quiz
        const result = await quizService.toggleQuizStatus(quizId, userId);

        res.status(200).json({
            success: true,
            message: result.message,
            data: { isActive: result.isActive }
        });

    } catch (error) {
        console.error('Erreur lors du changement de statut du quiz:', error);
        
        if (error.message.includes('introuvable')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        
        if (error.message.includes('pas autorisé')) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur lors du changement de statut du quiz',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

module.exports = {
    createQuiz,
    getAllQuizzes,
    getQuizById,
    getQuizByVideoId,
    updateQuiz,
    deleteQuiz,
    evaluateQuiz,
    getQuizStats,
    toggleQuizStatus
};
