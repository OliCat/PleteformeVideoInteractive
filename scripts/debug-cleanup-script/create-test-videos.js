const mongoose = require('mongoose');
const Video = require('./models/Video');
require('dotenv').config();

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plateforme_video');

const createTestVideos = async () => {
    try {
        console.log('🎬 Création des vidéos de test...');
        
        // Supprimer les anciennes vidéos de test
        await Video.deleteMany({ title: { $regex: /^Vidéo de test/ } });
        console.log('🗑️  Anciennes vidéos de test supprimées');
        
        // Créer des vidéos de test
        const testVideos = [
            {
                title: 'Vidéo de test 1',
                description: 'Première vidéo de test pour les quiz',
                filePath: '/uploads/videos/test-video-1.mp4',
                originalFileName: 'test-video-1.mp4',
                mimeType: 'video/mp4',
                fileSize: 1024 * 1024 * 10, // 10MB
                duration: 120, // 2 minutes
                thumbnailPath: '/uploads/thumbnails/thumbnail-1.jpg',
                order: 1,
                processingStatus: 'completed',
                isPublished: true,
                createdBy: '68b84225829878e620b2b214' // ID de l'admin existant
            },
            {
                title: 'Vidéo de test 2',
                description: 'Deuxième vidéo de test pour les quiz',
                filePath: '/uploads/videos/test-video-2.mp4',
                originalFileName: 'test-video-2.mp4',
                mimeType: 'video/mp4',
                fileSize: 1024 * 1024 * 15, // 15MB
                duration: 180, // 3 minutes
                thumbnailPath: '/uploads/thumbnails/thumbnail-2.jpg',
                order: 2,
                processingStatus: 'completed',
                isPublished: true,
                createdBy: '68b84225829878e620b2b214' // ID de l'admin existant
            }
        ];
        
        const createdVideos = await Video.insertMany(testVideos);
        console.log('✅ Vidéos de test créées avec succès :');
        
        createdVideos.forEach(video => {
            console.log(`   📹 ${video.title} - ID: ${video._id}`);
        });
        
        console.log('\n🎯 Vous pouvez maintenant utiliser ces IDs dans vos quiz !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la création des vidéos de test:', error);
    } finally {
        mongoose.connection.close();
        console.log('🔌 Connexion MongoDB fermée');
    }
};

// Exécuter le script
createTestVideos();
