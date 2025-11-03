const mongoose = require('mongoose');

// Schéma pour une tentative de quiz
const quizAttemptSchema = new mongoose.Schema({
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true
    },
    attemptNumber: {
        type: Number,
        required: true,
        min: 1
    },
    answers: [{
        questionId: {
            type: String,
            required: true
        },
        userAnswer: mongoose.Schema.Types.Mixed,
        isCorrect: {
            type: Boolean,
            required: true
        },
        points: {
            type: Number,
            required: true,
            min: 0
        },
        timeSpent: {
            type: Number, // en secondes
            min: 0
        }
    }],
    score: {
        type: Number,
        required: true,
        min: 0
    },
    totalPoints: {
        type: Number,
        required: true,
        min: 0
    },
    percentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    passed: {
        type: Boolean,
        required: true
    },
    timeSpent: {
        type: Number, // temps total en secondes
        min: 0
    },
    startedAt: {
        type: Date,
        required: true
    },
    completedAt: {
        type: Date,
        required: true
    }
}, {
    _id: true,
    timestamps: false
});

// Schéma pour suivre le temps passé sur une vidéo
const videoWatchTimeSchema = new mongoose.Schema({
    videoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
        required: true
    },
    totalWatchTime: {
        type: Number, // en secondes
        default: 0,
        min: 0
    },
    watchSessions: [{
        startTime: {
            type: Number, // position dans la vidéo en secondes
            required: true,
            min: 0
        },
        endTime: {
            type: Number, // position dans la vidéo en secondes
            required: true,
            min: 0
        },
        sessionDuration: {
            type: Number, // durée de la session en secondes
            required: true,
            min: 0
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    completionPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    lastWatchedPosition: {
        type: Number, // dernière position regardée en secondes
        default: 0,
        min: 0
    }
}, {
    _id: true
});

const userProgressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
        // unique: true retiré car déjà défini dans l'index explicite ligne 179
    },
    // Vidéos complètement terminées (vidéo + quiz réussi)
    completedVideos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video'
    }],
    // Position actuelle dans le parcours
    currentPosition: {
        type: Number,
        default: 1,
        min: 1
    },
    // Détail du temps de visionnage par vidéo
    videoWatchTimes: [videoWatchTimeSchema],
    // Historique des tentatives de quiz
    quizAttempts: [quizAttemptSchema],
    // Statistiques globales
    totalVideosWatched: {
        type: Number,
        default: 0,
        min: 0
    },
    totalQuizzesPassed: {
        type: Number,
        default: 0,
        min: 0
    },
    totalTimeSpent: {
        type: Number, // en secondes
        default: 0,
        min: 0
    },
    // Dates importantes
    startedAt: {
        type: Date,
        default: Date.now
    },
    lastActivityAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date // Date de fin du parcours complet
    }
}, {
    timestamps: true
});

// Index pour optimiser les recherches
userProgressSchema.index({ userId: 1 }, { unique: true });
userProgressSchema.index({ lastActivityAt: -1 });
userProgressSchema.index({ currentPosition: 1 });

// Virtual pour calculer le pourcentage de progression globale
userProgressSchema.virtual('overallProgress').get(async function() {
    const Video = mongoose.model('Video');
    const totalVideos = await Video.countDocuments({ isPublished: true });
    
    if (totalVideos === 0) return 100;
    
    return Math.round((this.completedVideos.length / totalVideos) * 100);
});

// Méthode pour enregistrer une session de visionnage
userProgressSchema.methods.recordWatchSession = function(videoId, startTime, endTime, videoDuration) {
    let videoProgress = this.videoWatchTimes.find(vw => 
        vw.videoId.toString() === videoId.toString()
    );
    
    if (!videoProgress) {
        videoProgress = {
            videoId,
            totalWatchTime: 0,
            watchSessions: [],
            completionPercentage: 0,
            isCompleted: false,
            lastWatchedPosition: 0
        };
        this.videoWatchTimes.push(videoProgress);
    }
    
    // Calculer la durée de la session
    const sessionDuration = Math.max(0, endTime - startTime);
    
    // Ajouter la session
    videoProgress.watchSessions.push({
        startTime,
        endTime,
        sessionDuration,
        timestamp: new Date()
    });
    
    // Mettre à jour le temps total et la dernière position
    videoProgress.totalWatchTime += sessionDuration;
    videoProgress.lastWatchedPosition = Math.max(videoProgress.lastWatchedPosition, endTime);
    
    // Calculer le pourcentage de completion
    if (videoDuration && videoDuration > 0) {
        videoProgress.completionPercentage = Math.min(100, 
            Math.round((videoProgress.lastWatchedPosition / videoDuration) * 100)
        );
        
        // Marquer comme complété si > 90% regardé
        videoProgress.isCompleted = videoProgress.completionPercentage >= 90;
    }
    
    // Mettre à jour les statistiques globales
    this.totalTimeSpent += sessionDuration;
    this.lastActivityAt = new Date();
    
    return this.save();
};

// Méthode pour enregistrer une tentative de quiz
userProgressSchema.methods.recordQuizAttempt = function(quizId, quizResult, timeSpent = 0) {
    console.log(`📝 recordQuizAttempt appelé avec:`, {
        quizId: quizId?.toString(),
        hasResults: !!quizResult?.results,
        resultsLength: quizResult?.results?.length,
        passed: quizResult?.passed,
        percentage: quizResult?.percentage
    });
    
    // Nettoyer les tentatives avec quizId null avant de compter
    this.quizAttempts = this.quizAttempts.filter(attempt => {
        if (!attempt.quizId) {
            console.log(`⚠️ Tentative avec quizId null trouvée et supprimée`);
            return false;
        }
        return true;
    });
    
    // Compter le nombre de tentatives précédentes pour ce quiz
    // Gérer le cas où quizId ou attempt.quizId peuvent être null
    const previousAttempts = this.quizAttempts.filter(attempt => {
        if (!attempt.quizId || !quizId) {
            return false;
        }
        try {
            return attempt.quizId.toString() === quizId.toString();
        } catch (error) {
            console.error(`⚠️ Erreur lors de la comparaison des quizIds:`, error);
            return false;
        }
    });
    
    const attemptNumber = previousAttempts.length + 1;
    
    // Créer la nouvelle tentative - gérer le cas où results peut être undefined
    const answers = quizResult.results ? quizResult.results.map(result => ({
        questionId: result.questionId,
        userAnswer: result.userAnswer,
        isCorrect: result.isCorrect,
        points: result.points,
        timeSpent: result.timeSpent || 0
    })) : [];
    
    const newAttempt = {
        quizId,
        attemptNumber,
        answers,
        score: quizResult.totalScore || 0,
        totalPoints: quizResult.totalPoints || 0,
        percentage: quizResult.percentage || 0,
        passed: quizResult.passed || false,
        timeSpent,
        startedAt: new Date(Date.now() - (timeSpent * 1000)),
        completedAt: new Date()
    };
    
    console.log(`📝 Nouvelle tentative créée:`, {
        quizId: newAttempt.quizId?.toString(),
        attemptNumber: newAttempt.attemptNumber,
        score: newAttempt.score,
        percentage: newAttempt.percentage,
        passed: newAttempt.passed
    });
    
    this.quizAttempts.push(newAttempt);
    
    // Mettre à jour les statistiques globales
    if (quizResult.passed) {
        this.totalQuizzesPassed++;
    }
    
    this.totalTimeSpent += timeSpent;
    this.lastActivityAt = new Date();
    
    console.log(`📝 Sauvegarde de la progression avec ${this.quizAttempts.length} tentatives`);
    return this.save();
};

// Méthode pour marquer une vidéo comme terminée
userProgressSchema.methods.completeVideo = async function(videoId) {
    const Video = mongoose.model('Video');
    const video = await Video.findById(videoId);
    
    if (!video) {
        throw new Error('Vidéo non trouvée');
    }
    
    // Normaliser l'ID de la vidéo
    const videoIdObj = typeof videoId === 'string' ? new mongoose.Types.ObjectId(videoId) : videoId;
    const videoIdStr = videoIdObj.toString();
    
    // Nettoyer les doublons ET les IDs invalides avant de vérifier
    const uniqueVideoIds = [];
    const seenIds = new Set();
    
    for (const vid of this.completedVideos) {
        const vidStr = vid.toString();
        
        // Vérifier que la vidéo existe toujours dans la base de données
        const videoExists = await Video.exists({ _id: vid });
        if (!videoExists) {
            // Supprimer les IDs de vidéos qui n'existent plus
            continue;
        }
        
        // Supprimer les doublons
        if (!seenIds.has(vidStr)) {
            seenIds.add(vidStr);
            uniqueVideoIds.push(vid);
        }
    }
    
    // Remplacer completedVideos par la version nettoyée
    this.completedVideos = uniqueVideoIds;
    
    console.log(`📝 completeVideo - Avant ajout:`, {
        videoId: videoIdStr,
        completedVideosCount: this.completedVideos.length,
        currentPosition: this.currentPosition,
        videoOrder: video.order
    });
    
    // Vérifier si la vidéo est déjà dans la liste (après nettoyage)
    const alreadyCompleted = seenIds.has(videoIdStr);
    
    if (!alreadyCompleted) {
        console.log(`📝 Ajout de la vidéo ${videoIdStr} (ordre ${video.order}) à completedVideos`);
        this.completedVideos.push(videoIdObj);
        this.totalVideosWatched = this.completedVideos.length;
        console.log(`✅ Vidéo ajoutée. Total: ${this.totalVideosWatched}`);
    } else {
        console.log(`⚠️ La vidéo ${videoIdStr} est déjà dans completedVideos`);
        // Mettre à jour le compteur pour refléter le nombre réel de vidéos uniques
        this.totalVideosWatched = this.completedVideos.length;
    }
    
    // Mettre à jour la position actuelle
    const newPosition = Math.max(this.currentPosition, video.order + 1);
    console.log(`📝 Mise à jour de currentPosition: ${this.currentPosition} -> ${newPosition}`);
    this.currentPosition = newPosition;
    
    this.lastActivityAt = new Date();
    
    // Vérifier si le parcours est terminé
    // Ne marquer comme complété que si TOUTES les vidéos publiées sont réellement complétées
    const totalVideos = await Video.countDocuments({ isPublished: true });
    
    // Créer un Set des IDs de vidéos complétées (valides et uniques)
    const completedVideoIdsSet = new Set();
    for (const completedId of this.completedVideos) {
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
    
    // Vérifier que toutes les vidéos publiées sont complétées
    const allPublishedVideos = await Video.find({ isPublished: true }, '_id');
    const allPublishedVideoIds = new Set(allPublishedVideos.map(v => v._id.toString()));
    
    // Vérifier que toutes les vidéos publiées sont dans les vidéos complétées
    const allVideosCompleted = Array.from(allPublishedVideoIds).every(videoId => 
        completedVideoIdsSet.has(videoId)
    );
    
    if (allVideosCompleted && totalVideos > 0) {
        this.completedAt = new Date();
        console.log(`✅ Parcours complété ! Toutes les ${totalVideos} vidéos sont terminées.`);
    } else if (this.completedAt && !allVideosCompleted) {
        // Si completedAt existe mais que le parcours n'est pas réellement complété, le supprimer
        console.log(`⚠️  Parcours marqué comme complété mais pas toutes les vidéos sont terminées. Suppression de completedAt.`);
        this.completedAt = undefined;
    }
    
    console.log(`📝 Sauvegarde de la progression...`);
    const savedProgress = await this.save();
    console.log(`✅ Progression sauvegardée:`, {
        completedVideos: savedProgress.completedVideos.length,
        currentPosition: savedProgress.currentPosition,
        totalVideosWatched: savedProgress.totalVideosWatched
    });
    
    return savedProgress;
};

// Méthode pour obtenir le meilleur score pour un quiz
userProgressSchema.methods.getBestQuizScore = function(quizId) {
    const attempts = this.quizAttempts.filter(attempt => 
        attempt.quizId.toString() === quizId.toString()
    );
    
    if (attempts.length === 0) {
        return null;
    }
    
    return attempts.reduce((best, current) => 
        current.percentage > best.percentage ? current : best
    );
};

// Méthode pour obtenir le nombre de tentatives pour un quiz
userProgressSchema.methods.getQuizAttemptCount = function(quizId) {
    return this.quizAttempts.filter(attempt => 
        attempt.quizId.toString() === quizId.toString()
    ).length;
};

// Méthode pour vérifier si un quiz a été réussi
userProgressSchema.methods.hasPassedQuiz = function(quizId) {
    const bestScore = this.getBestQuizScore(quizId);
    return bestScore ? bestScore.passed : false;
};

// Méthode pour obtenir les statistiques de progression
userProgressSchema.methods.getProgressStats = async function() {
    const Video = mongoose.model('Video');
    const totalVideos = await Video.countDocuments({ isPublished: true });
    
    // Compter les vidéos UNIQUES complétées (éviter les doublons)
    const uniqueCompletedVideos = new Set(
        this.completedVideos.map(vid => vid.toString())
    );
    const uniqueCompletedCount = uniqueCompletedVideos.size;
    
    // Calculer le pourcentage et limiter à 100%
    const completionPercentage = totalVideos > 0 
        ? Math.min(100, Math.round((uniqueCompletedCount / totalVideos) * 100))
        : 0;
    
    // Calculer le temps moyen par vidéo
    const avgTimePerVideo = this.totalVideosWatched > 0 
        ? Math.round(this.totalTimeSpent / this.totalVideosWatched)
        : 0;
    
    // Calculer le taux de réussite des quiz
    const totalQuizAttempts = this.quizAttempts.length;
    const passedQuizzes = this.quizAttempts.filter(attempt => attempt.passed).length;
    const quizSuccessRate = totalQuizAttempts > 0 
        ? Math.round((passedQuizzes / totalQuizAttempts) * 100)
        : 0;
    
    return {
        totalVideos,
        completedVideos: uniqueCompletedCount,
        completionPercentage,
        currentPosition: this.currentPosition,
        totalTimeSpent: this.totalTimeSpent,
        avgTimePerVideo,
        totalQuizAttempts,
        passedQuizzes,
        quizSuccessRate,
        isCompleted: !!this.completedAt,
        startedAt: this.startedAt,
        lastActivityAt: this.lastActivityAt,
        completedAt: this.completedAt
    };
};

// Middleware pour mettre à jour lastActivityAt avant chaque sauvegarde
userProgressSchema.pre('save', function(next) {
    this.lastActivityAt = new Date();
    next();
});

module.exports = mongoose.model('UserProgress', userProgressSchema); 