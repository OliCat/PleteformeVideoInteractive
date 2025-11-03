const fs = require('fs').promises;
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');
const Video = require('../models/Video');

// Configuration des chemins
const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';
const VIDEO_PATH = process.env.VIDEO_PATH || './videos';
const THUMBNAIL_PATH = process.env.THUMBNAIL_PATH || './thumbnails';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 500000000; // 500MB par défaut
const ALLOWED_FORMATS = (process.env.ALLOWED_VIDEO_FORMATS || 'mp4,avi,mov,mkv,webm').split(',');
const QUALITY_LEVELS = (process.env.VIDEO_QUALITY_LEVELS || '480p,720p,1080p').split(',');

// Créer les dossiers nécessaires
const ensureDirectories = async () => {
    const dirs = [UPLOAD_PATH, VIDEO_PATH, THUMBNAIL_PATH];
    for (const dir of dirs) {
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
        }
    }
};

// Vérifier le format de fichier
const isValidVideoFormat = (filename) => {
    const ext = path.extname(filename).toLowerCase().substring(1);
    return ALLOWED_FORMATS.includes(ext);
};

// Vérifier la taille du fichier
const isValidFileSize = (size) => {
    return size <= MAX_FILE_SIZE;
};

// Générer un nom de fichier unique
const generateUniqueFilename = (originalName) => {
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const uniqueId = uuidv4().substring(0, 8);
    return `${baseName}_${uniqueId}${ext}`;
};

// Extraire les métadonnées de la vidéo
const extractVideoMetadata = (filePath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                reject(new Error(`Erreur lors de l'extraction des métadonnées: ${err.message}`));
                return;
            }

            const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
            if (!videoStream) {
                reject(new Error('Aucun flux vidéo trouvé dans le fichier'));
                return;
            }

            resolve({
                duration: metadata.format.duration,
                size: metadata.format.size,
                bitrate: metadata.format.bit_rate,
                width: videoStream.width,
                height: videoStream.height,
                codec: videoStream.codec_name,
                fps: eval(videoStream.r_frame_rate)
            });
        });
    });
};

// Générer une thumbnail
const generateThumbnail = (inputPath, outputPath, time = '00:00:05') => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .screenshots({
                timestamps: [time],
                filename: path.basename(outputPath),
                folder: path.dirname(outputPath),
                size: '320x240'
            })
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(new Error(`Erreur lors de la génération de la thumbnail: ${err.message}`)));
    });
};

// Transcoder la vidéo en plusieurs qualités
const transcodeVideo = (inputPath, outputDir, filename, qualities = QUALITY_LEVELS) => {
    const promises = qualities.map(quality => {
        return new Promise((resolve, reject) => {
            const outputPath = path.join(outputDir, `${filename}_${quality}.mp4`);
            
            let ffmpegCommand = ffmpeg(inputPath);
            
            // Configuration selon la qualité
            switch (quality) {
                case '480p':
                    ffmpegCommand = ffmpegCommand
                        .size('854x480')
                        .videoBitrate('800k')
                        .audioBitrate('128k');
                    break;
                case '720p':
                    ffmpegCommand = ffmpegCommand
                        .size('1280x720')
                        .videoBitrate('1500k')
                        .audioBitrate('192k');
                    break;
                case '1080p':
                    ffmpegCommand = ffmpegCommand
                        .size('1920x1080')
                        .videoBitrate('3000k')
                        .audioBitrate('256k');
                    break;
                default:
                    ffmpegCommand = ffmpegCommand
                        .size('1280x720')
                        .videoBitrate('1500k')
                        .audioBitrate('192k');
            }

            ffmpegCommand
                .outputOptions([
                    '-c:v libx264',
                    '-preset medium',
                    '-crf 23',
                    '-c:a aac',
                    '-movflags +faststart'
                ])
                .output(outputPath)
                .on('end', () => resolve({ quality, path: outputPath }))
                .on('error', (err) => reject(new Error(`Erreur lors du transcodage ${quality}: ${err.message}`)))
                .run();
        });
    });

    return Promise.all(promises);
};

// Traitement complet d'une vidéo uploadée
const processUploadedVideo = async (file, title, description, order, userId, isPublished = false) => {
    try {
        // Vérifications préliminaires
        if (!isValidVideoFormat(file.originalname)) {
            throw new Error(`Format de fichier non supporté. Formats autorisés: ${ALLOWED_FORMATS.join(', ')}`);
        }

        if (!isValidFileSize(file.size)) {
            throw new Error(`Fichier trop volumineux. Taille maximale: ${MAX_FILE_SIZE / 1000000}MB`);
        }

        // Créer les dossiers
        await ensureDirectories();

        // Générer un nom de fichier unique
        const uniqueFilename = generateUniqueFilename(file.originalname);
        const videoDir = path.join(VIDEO_PATH, uniqueFilename.replace(path.extname(uniqueFilename), ''));
        const thumbnailDir = path.join(THUMBNAIL_PATH, uniqueFilename.replace(path.extname(uniqueFilename), ''));

        // Créer les dossiers spécifiques à cette vidéo
        await fs.mkdir(videoDir, { recursive: true });
        await fs.mkdir(thumbnailDir, { recursive: true });

        // Déplacer le fichier original
        const originalPath = path.join(videoDir, 'original' + path.extname(file.originalname));
        await fs.writeFile(originalPath, file.buffer);

        // Extraire les métadonnées
        const metadata = await extractVideoMetadata(originalPath);

        // Générer la thumbnail
        const thumbnailPath = path.join(thumbnailDir, 'thumbnail.jpg');
        await generateThumbnail(originalPath, thumbnailPath);

        // Transcoder en plusieurs qualités
        const transcodedFiles = await transcodeVideo(originalPath, videoDir, 'video', QUALITY_LEVELS);

        // Créer l'entrée en base de données
        console.log('🔧 Service - Création de la vidéo avec les champs:', {
            title,
            description,
            filePath: videoDir,
            originalFileName: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
            createdBy: userId,
            isPublished,
        });

        const videoData = {
            title,
            description,
            filePath: videoDir,
            originalFileName: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
            createdBy: userId,
            duration: Math.round(metadata.duration),
            thumbnailPath: thumbnailPath,
            order: order || 0,
            isPublished,
            metadata: {
                width: metadata.width,
                height: metadata.height,
                codec: metadata.codec,
                fps: metadata.fps,
                bitrate: metadata.bitrate,
                size: metadata.size
            },
            qualities: transcodedFiles.map(file => ({
                quality: file.quality,
                path: file.path
            }))
        };

        // Si la vidéo est publiée, définir publishedAt
        if (isPublished) {
            videoData.publishedAt = new Date();
        }

        const video = new Video(videoData);

        console.log('💾 Sauvegarde de la vidéo en base de données...');
        await video.save();
        console.log('✅ Vidéo sauvegardée avec succès:', video._id);

        // Nettoyer le fichier original temporaire
        console.log('🧹 Nettoyage du fichier original...');
        await fs.unlink(originalPath);
        console.log('✅ Fichier original supprimé');

        console.log('🎉 Traitement de la vidéo terminé avec succès !');
        return video;

    } catch (error) {
        // Nettoyer en cas d'erreur
        console.error('Erreur lors du traitement de la vidéo:', error);
        throw error;
    }
};

// Récupérer toutes les vidéos
const getAllVideos = async () => {
    try {
        const videos = await Video.find({}).sort({ order: 1, createdAt: -1 });
        return videos;
    } catch (error) {
        throw new Error(`Erreur lors de la récupération des vidéos: ${error.message}`);
    }
};

// Récupérer une vidéo par ID
const getVideoById = async (videoId) => {
    try {
        const video = await Video.findById(videoId);
        if (!video) {
            throw new Error('Vidéo non trouvée');
        }
        return video;
    } catch (error) {
        throw new Error(`Erreur lors de la récupération de la vidéo: ${error.message}`);
    }
};

// Mettre à jour une vidéo
const updateVideo = async (videoId, updateData) => {
    try {
        const video = await Video.findByIdAndUpdate(
            videoId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!video) {
            throw new Error('Vidéo non trouvée');
        }

        return video;
    } catch (error) {
        throw new Error(`Erreur lors de la mise à jour de la vidéo: ${error.message}`);
    }
};

// Supprimer une vidéo
const deleteVideo = async (videoId) => {
    try {
        const video = await Video.findById(videoId);
        if (!video) {
            throw new Error('Vidéo non trouvée');
        }

        // Supprimer les fichiers
        try {
            await fs.rm(video.filePath, { recursive: true, force: true });
            await fs.rm(path.dirname(video.thumbnailPath), { recursive: true, force: true });
        } catch (fsError) {
            console.warn('Erreur lors de la suppression des fichiers:', fsError.message);
        }

        // Supprimer de la base de données
        await Video.findByIdAndDelete(videoId);

        return { message: 'Vidéo supprimée avec succès' };
    } catch (error) {
        throw new Error(`Erreur lors de la suppression de la vidéo: ${error.message}`);
    }
};

// Réorganiser l'ordre des vidéos
const reorderVideos = async (videoOrders) => {
    try {
        const updates = videoOrders.map(({ videoId, order }) => ({
            updateOne: {
                filter: { _id: videoId },
                update: { order }
            }
        }));

        await Video.bulkWrite(updates);

        return { message: 'Ordre des vidéos mis à jour avec succès' };
    } catch (error) {
        throw new Error(`Erreur lors de la réorganisation des vidéos: ${error.message}`);
    }
};

// Obtenir les statistiques des vidéos
const getVideoStats = async () => {
    try {
        const totalVideos = await Video.countDocuments();
        const totalDuration = await Video.aggregate([
            { $group: { _id: null, total: { $sum: '$duration' } } }
        ]);

        const formatStats = await Video.aggregate([
            { $group: { _id: '$metadata.codec', count: { $sum: 1 } } }
        ]);

        const qualityStats = await Video.aggregate([
            { $unwind: '$qualities' },
            { $group: { _id: '$qualities.quality', count: { $sum: 1 } } }
        ]);

        return {
            total: totalVideos,
            totalDuration: totalDuration[0]?.total || 0,
            formats: formatStats,
            qualities: qualityStats
        };
    } catch (error) {
        throw new Error(`Erreur lors de la récupération des statistiques: ${error.message}`);
    }
};

module.exports = {
    processUploadedVideo,
    getAllVideos,
    getVideoById,
    updateVideo,
    deleteVideo,
    reorderVideos,
    getVideoStats,
    isValidVideoFormat,
    isValidFileSize,
    generateUniqueFilename
};
