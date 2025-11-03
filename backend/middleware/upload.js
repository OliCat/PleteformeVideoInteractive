const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configuration des formats et tailles autorisés
const ALLOWED_VIDEO_FORMATS = (process.env.ALLOWED_VIDEO_FORMATS || 'mp4,avi,mov,mkv,webm').split(',');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 500000000; // 500MB par défaut

// Configuration du stockage en mémoire pour le traitement
const storage = multer.memoryStorage();

// Filtre pour vérifier les types de fichiers
const fileFilter = (req, file, cb) => {
    // Vérifier l'extension du fichier
    const ext = path.extname(file.originalname).toLowerCase().substring(1);
    
    if (!ALLOWED_VIDEO_FORMATS.includes(ext)) {
        return cb(new Error(`Format de fichier non supporté. Formats autorisés: ${ALLOWED_VIDEO_FORMATS.join(', ')}`), false);
    }

    // Vérifier le type MIME
    if (!file.mimetype.startsWith('video/')) {
        return cb(new Error('Le fichier doit être une vidéo'), false);
    }

    cb(null, true);
};

// Configuration de Multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1, // Une seule vidéo à la fois
        fields: 10 // Limite pour les champs de formulaire
    }
});

// Middleware d'upload pour une seule vidéo
const uploadSingleVideo = upload.any();

// Middleware pour traiter les champs du formulaire
const processFormFields = (req, res, next) => {
    // Multer devrait déjà avoir traité les champs, mais on s'assure qu'ils sont bien présents
    console.log('📝 Form fields received:', req.body);
    next();
};

// Middleware d'upload pour plusieurs vidéos (optionnel)
const uploadMultipleVideos = upload.array('videos', 5); // Maximum 5 vidéos

// Middleware de gestion des erreurs d'upload
const handleUploadErrors = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: `Fichier trop volumineux. Taille maximale: ${MAX_FILE_SIZE / 1000000}MB`
            });
        }
        
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Trop de fichiers uploadés'
            });
        }

        return res.status(400).json({
            success: false,
            message: `Erreur d'upload: ${error.message}`
        });
    }

    if (error.message.includes('Format de fichier non supporté') || 
        error.message.includes('doit être une vidéo')) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    // Erreur générique
    return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'upload du fichier',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
};

// Middleware de validation des métadonnées de la vidéo
const validateVideoMetadata = (req, res, next) => {
    console.log('🔍 Validation - req.body:', req.body);
    console.log('🔍 Validation - req.files:', req.files ? 'Files present' : 'No files');
    console.log('🔍 Validation - req.files length:', req.files ? req.files.length : 0);
    
    if (req.files && req.files.length > 0) {
        console.log('🔍 Validation - req.files details:');
        req.files.forEach((file, index) => {
            console.log(`  [${index}] fieldname: ${file.fieldname}, originalname: ${file.originalname}`);
        });
    }
    
    // Extraire les valeurs des champs depuis req.body (où multer les place)
    const title = req.body.title;
    const description = req.body.description;
    const order = req.body.order;
    const isPublished = req.body.isPublished;
    
    console.log('🔍 Validation - extracted values:', { title, description, order, isPublished });

    if (!title || title.trim().length === 0) {
        console.log('❌ Validation failed - title missing or empty:', title);
        return res.status(400).json({
            success: false,
            message: 'Le titre de la vidéo est requis'
        });
    }

    if (title.trim().length < 3) {
        return res.status(400).json({
            success: false,
            message: 'Le titre doit contenir au moins 3 caractères'
        });
    }

    if (title.trim().length > 100) {
        return res.status(400).json({
            success: false,
            message: 'Le titre ne peut pas dépasser 100 caractères'
        });
    }

    if (description && description.trim().length > 500) {
        return res.status(400).json({
            success: false,
            message: 'La description ne peut pas dépasser 500 caractères'
        });
    }

    // Nettoyer et valider l'ordre
    if (req.body.order !== undefined) {
        const orderNum = parseInt(req.body.order);
        if (isNaN(orderNum) || orderNum < 0) {
            return res.status(400).json({
                success: false,
                message: 'L\'ordre doit être un nombre positif'
            });
        }
        req.body.order = orderNum;
    }

    next();
};

// Middleware de nettoyage des fichiers temporaires
const cleanupTempFiles = async (req, res, next) => {
    // Sauvegarder la fonction de nettoyage pour l'utiliser plus tard
    req.cleanupTempFiles = async () => {
        if (req.file) {
            try {
                // Les fichiers en mémoire sont automatiquement nettoyés par Node.js
                // Mais on peut ajouter une logique de nettoyage si nécessaire
                console.log('Fichiers temporaires nettoyés');
            } catch (error) {
                console.warn('Erreur lors du nettoyage des fichiers temporaires:', error.message);
            }
        }
    };

    next();
};

// Middleware de vérification de l'espace disque (optionnel)
const checkDiskSpace = async (req, res, next) => {
    try {
        // Vérifier l'espace disponible dans le dossier d'upload
        const uploadPath = process.env.UPLOAD_PATH || './uploads';
        
        // Cette vérification peut être implémentée selon les besoins
        // Pour l'instant, on passe au middleware suivant
        next();
    } catch (error) {
        console.warn('Impossible de vérifier l\'espace disque:', error.message);
        next(); // Continuer même si la vérification échoue
    }
};

// Configuration des options d'upload
const uploadOptions = {
    // Formats autorisés
    allowedFormats: ALLOWED_VIDEO_FORMATS,
    
    // Taille maximale
    maxFileSize: MAX_FILE_SIZE,
    
    // Taille maximale en MB (pour l'affichage)
    maxFileSizeMB: MAX_FILE_SIZE / 1000000,
    
    // Vérifier si un format est autorisé
    isFormatAllowed: (filename) => {
        const ext = path.extname(filename).toLowerCase().substring(1);
        return ALLOWED_VIDEO_FORMATS.includes(ext);
    },
    
    // Vérifier si une taille est valide
    isSizeValid: (size) => {
        return size <= MAX_FILE_SIZE;
    }
};

module.exports = {
    uploadSingleVideo,
    uploadMultipleVideos,
    handleUploadErrors,
    validateVideoMetadata,
    cleanupTempFiles,
    checkDiskSpace,
    processFormFields,
    uploadOptions
};
