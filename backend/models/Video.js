const mongoose = require('mongoose');
const path = require('path');

const videoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Le titre est requis'],
        trim: true,
        minlength: [1, 'Le titre ne peut pas être vide'],
        maxlength: [200, 'Le titre ne peut pas dépasser 200 caractères']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'La description ne peut pas dépasser 1000 caractères']
    },
    filePath: {
        type: String,
        required: [true, 'Le chemin du fichier est requis']
    },
    originalFileName: {
        type: String,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    },
    duration: {
        type: Number, // en secondes
        default: 0
    },
    thumbnailPath: {
        type: String
    },
    // Configuration HLS
    hlsPath: {
        type: String // Chemin vers le fichier m3u8
    },
    qualities: [{
        quality: {
            type: String,
            enum: ['480p', '720p', '1080p']
        },
        path: String,
        bitrate: Number,
        fileSize: Number
    }],
    // Ordre dans le parcours
    order: {
        type: Number,
        required: [true, 'L\'ordre est requis'],
        unique: true,
        min: [1, 'L\'ordre doit être au moins 1']
    },
    // Référence au quiz associé
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz'
    },
    // Statut de traitement
    processingStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    processingError: {
        type: String
    },
    // Métadonnées vidéo
    metadata: {
        width: Number,
        height: Number,
        frameRate: Number,
        bitrate: Number,
        codec: String
    },
    // Statistiques
    viewCount: {
        type: Number,
        default: 0
    },
    // Gestion de la visibilité
    isPublished: {
        type: Boolean,
        default: false
    },
    publishedAt: {
        type: Date
    },
    // Créateur/Administrateur
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Index pour optimiser les recherches
videoSchema.index({ isPublished: 1, order: 1 });
videoSchema.index({ createdAt: -1 });
videoSchema.index({ processingStatus: 1 });

// Virtual pour obtenir l'URL de streaming
videoSchema.virtual('streamUrl').get(function() {
    if (this.hlsPath) {
        return `/videos/${path.basename(this.hlsPath)}`;
    }
    return null;
});

// Virtual pour obtenir l'URL du thumbnail
videoSchema.virtual('thumbnailUrl').get(function() {
    if (this.thumbnailPath) {
        // Extraire le chemin relatif par rapport au dossier thumbnails
        let relativePath = this.thumbnailPath;
        
        // Normaliser les séparateurs de chemin
        relativePath = relativePath.replace(/\\/g, '/');
        
        // Trouver la partie après "thumbnails/"
        const thumbnailsIndex = relativePath.indexOf('thumbnails/');
        if (thumbnailsIndex !== -1) {
            // Extraire tout ce qui suit "thumbnails/"
            relativePath = relativePath.substring(thumbnailsIndex + 'thumbnails/'.length);
        } else {
            // Si "thumbnails/" n'est pas dans le chemin, utiliser juste le nom du fichier
            // mais c'est probablement un chemin relatif qui commence par le dossier
            // Nettoyer le chemin : enlever ./ au début
            relativePath = relativePath.replace(/^\.\//, '');
            
            // Si c'est un chemin absolu, extraire juste la partie après le dernier "thumbnails"
            const parts = relativePath.split('/');
            const thumbnailsPos = parts.lastIndexOf('thumbnails');
            if (thumbnailsPos !== -1 && thumbnailsPos < parts.length - 1) {
                relativePath = parts.slice(thumbnailsPos + 1).join('/');
            } else {
                // Fallback : utiliser juste le nom du fichier
                relativePath = path.basename(relativePath);
            }
        }
        
        // Retourner le chemin relatif depuis /thumbnails/
        return `/thumbnails/${relativePath}`;
    }
    return null;
});

// Méthode pour obtenir la prochaine vidéo dans l'ordre
videoSchema.methods.getNextVideo = async function() {
    return await this.constructor.findOne({
        order: { $gt: this.order },
        isPublished: true
    }).sort({ order: 1 });
};

// Méthode pour obtenir la vidéo précédente dans l'ordre
videoSchema.methods.getPreviousVideo = async function() {
    return await this.constructor.findOne({
        order: { $lt: this.order },
        isPublished: true
    }).sort({ order: -1 });
};

// Méthode pour incrémenter le compteur de vues
videoSchema.methods.incrementViewCount = function() {
    return this.updateOne({ $inc: { viewCount: 1 } });
};

// Méthode pour vérifier si la vidéo est accessible à un utilisateur
videoSchema.methods.isAccessibleToUser = async function(userId) {
    // Si c'est la première vidéo, elle est toujours accessible
    if (this.order === 1) {
        return true;
    }
    
    // Vérifier la progression de l'utilisateur
    const UserProgress = mongoose.model('UserProgress');
    const progress = await UserProgress.findOne({ userId });
    
    if (!progress) {
        return false;
    }
    
    // Vérifier si l'utilisateur a complété la vidéo précédente
    const previousVideo = await this.getPreviousVideo();
    return previousVideo ? progress.completedVideos.includes(previousVideo._id) : true;
};

// Méthode statique pour obtenir toutes les vidéos accessibles à un utilisateur
videoSchema.statics.getAccessibleVideos = async function(userId) {
    const UserProgress = mongoose.model('UserProgress');
    const progress = await UserProgress.findOne({ userId });
    
    const videos = await this.find({ isPublished: true }).sort({ order: 1 });
    const accessibleVideos = [];
    
    for (const video of videos) {
        if (await video.isAccessibleToUser(userId)) {
            accessibleVideos.push(video);
        } else {
            // Une fois qu'on trouve une vidéo non accessible, on s'arrête
            break;
        }
    }
    
    return accessibleVideos;
};

// Méthode statique pour obtenir la prochaine vidéo disponible pour un utilisateur
videoSchema.statics.getNextAvailableVideo = async function(userId) {
    const UserProgress = mongoose.model('UserProgress');
    const progress = await UserProgress.findOne({ userId });
    
    if (!progress || progress.completedVideos.length === 0) {
        // Première vidéo
        return await this.findOne({ order: 1, isPublished: true });
    }
    
    // Trouver la prochaine vidéo après la dernière complétée
    const lastCompletedVideo = await this.findById(
        progress.completedVideos[progress.completedVideos.length - 1]
    );
    
    if (!lastCompletedVideo) {
        return await this.findOne({ order: 1, isPublished: true });
    }
    
    return await this.findOne({
        order: { $gt: lastCompletedVideo.order },
        isPublished: true
    }).sort({ order: 1 });
};

// Middleware pour vérifier l'unicité de l'ordre avant sauvegarde
videoSchema.pre('save', async function(next) {
    if (this.isModified('order')) {
        const existingVideo = await this.constructor.findOne({
            order: this.order,
            _id: { $ne: this._id }
        });
        
        if (existingVideo) {
            const error = new Error(`Une vidéo avec l'ordre ${this.order} existe déjà`);
            error.code = 'DUPLICATE_ORDER';
            return next(error);
        }
    }
    
    // Mettre à jour publishedAt selon le statut de publication
    if (this.isModified('isPublished')) {
        if (this.isPublished && !this.publishedAt) {
            // Première publication - définir publishedAt
            this.publishedAt = new Date();
        } else if (!this.isPublished) {
            // Dépublication - supprimer publishedAt
            this.publishedAt = undefined;
        }
    }
    
    next();
});

// Middleware pour nettoyer les fichiers avant suppression
videoSchema.pre('remove', async function(next) {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
        // Supprimer le fichier vidéo original
        if (this.filePath) {
            try {
                await fs.unlink(this.filePath);
            } catch (err) {
                console.warn(`Impossible de supprimer le fichier vidéo: ${this.filePath}`);
            }
        }
        
        // Supprimer le thumbnail
        if (this.thumbnailPath) {
            try {
                await fs.unlink(this.thumbnailPath);
            } catch (err) {
                console.warn(`Impossible de supprimer le thumbnail: ${this.thumbnailPath}`);
            }
        }
        
        // Supprimer les fichiers HLS
        if (this.hlsPath) {
            try {
                const hlsDir = path.dirname(this.hlsPath);
                await fs.rmdir(hlsDir, { recursive: true });
            } catch (err) {
                console.warn(`Impossible de supprimer les fichiers HLS: ${this.hlsPath}`);
            }
        }
        
        // Supprimer les références dans UserProgress
        const UserProgress = mongoose.model('UserProgress');
        await UserProgress.updateMany(
            { completedVideos: this._id },
            { $pull: { completedVideos: this._id } }
        );
        
        next();
    } catch (error) {
        next(error);
    }
});

// Transformer la sortie JSON pour inclure les URLs virtuelles
videoSchema.methods.toJSON = function() {
    const videoObject = this.toObject({ virtuals: true });
    delete videoObject.filePath; // Ne pas exposer le chemin physique
    return videoObject;
};

module.exports = mongoose.model('Video', videoSchema); 