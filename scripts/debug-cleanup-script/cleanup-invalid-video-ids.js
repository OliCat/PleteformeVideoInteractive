/**
 * Script pour nettoyer les IDs de vidéos invalides dans la progression utilisateur
 * 
 * Ce script :
 * 1. Supprime les IDs de vidéos qui n'existent plus dans la base de données
 * 2. Corrige totalVideosWatched et currentPosition si nécessaire
 */

const mongoose = require('mongoose');
const UserProgress = require('../models/UserProgress');
const Video = require('../models/Video');
require('dotenv').config();

const cleanupInvalidVideoIds = async () => {
    try {
        // Connexion à MongoDB
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/video-platform';
        await mongoose.connect(mongoUri);
        console.log('✅ Connecté à MongoDB');

        let fixed = 0;
        let removedIds = 0;

        // Récupérer toutes les progressions
        const allProgress = await UserProgress.find({});
        console.log(`\n🔍 Trouvé ${allProgress.length} progression(s)`);

        // Récupérer tous les IDs de vidéos valides
        const allVideos = await Video.find({});
        const validVideoIds = new Set(allVideos.map(v => v._id.toString()));
        console.log(`📹 Vidéos valides dans la base: ${validVideoIds.size}`);

        for (const progress of allProgress) {
            const beforeCount = progress.completedVideos.length;
            
            // Filtrer les IDs invalides
            const validCompletedVideos = [];
            
            for (const videoId of progress.completedVideos) {
                const videoIdStr = videoId.toString();
                if (validVideoIds.has(videoIdStr)) {
                    validCompletedVideos.push(videoId);
                } else {
                    removedIds++;
                    console.log(`   ⚠️  ID invalide trouvé: ${videoIdStr}`);
                }
            }
            
            // Supprimer les doublons
            const uniqueVideoIds = [];
            const seenIds = new Set();
            
            for (const vid of validCompletedVideos) {
                const vidStr = vid.toString();
                if (!seenIds.has(vidStr)) {
                    seenIds.add(vidStr);
                    uniqueVideoIds.push(vid);
                }
            }
            
            const afterCount = uniqueVideoIds.length;
            
            if (beforeCount !== afterCount || removedIds > 0) {
                console.log(`\n🔧 Progression de l'utilisateur ${progress.userId}:`);
                console.log(`   - Avant: ${beforeCount} vidéos complétées`);
                console.log(`   - Après: ${afterCount} vidéos valides`);
                console.log(`   - IDs supprimés: ${beforeCount - afterCount}`);
                
                // Mettre à jour la progression
                progress.completedVideos = uniqueVideoIds;
                progress.totalVideosWatched = uniqueVideoIds.length;
                
                // Corriger currentPosition si nécessaire
                if (uniqueVideoIds.length > 0) {
                    // Trouver l'ordre maximum des vidéos complétées
                    const completedVideoOrders = [];
                    for (const videoId of uniqueVideoIds) {
                        const video = await Video.findById(videoId);
                        if (video) {
                            completedVideoOrders.push(video.order);
                        }
                    }
                    const maxOrder = Math.max(...completedVideoOrders);
                    progress.currentPosition = maxOrder + 1;
                    console.log(`   - Position corrigée: ${progress.currentPosition}`);
                } else {
                    progress.currentPosition = 1;
                }
                
                await progress.save();
                fixed++;
                console.log(`   ✅ Progression corrigée`);
            }
        }

        console.log(`\n📊 Résumé:`);
        console.log(`   - Progressions corrigées: ${fixed}`);
        console.log(`   - IDs invalides supprimés: ${removedIds}`);
        console.log(`   - Progressions sans problème: ${allProgress.length - fixed}`);

        console.log('\n✅ Nettoyage terminé avec succès!');
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('✅ Déconnecté de MongoDB');
    }
};

// Exécuter le script
if (require.main === module) {
    cleanupInvalidVideoIds()
        .then(() => {
            console.log('✅ Script terminé avec succès');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Erreur lors de l\'exécution du script:', error);
            process.exit(1);
        });
}

module.exports = cleanupInvalidVideoIds;

