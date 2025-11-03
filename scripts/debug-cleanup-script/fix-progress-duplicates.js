/**
 * Script pour nettoyer les doublons dans la progression utilisateur
 * 
 * Ce script :
 * 1. Nettoie les doublons dans completedVideos
 * 2. Corrige totalVideosWatched pour qu'il corresponde au nombre réel de vidéos uniques
 * 3. Corrige currentPosition si nécessaire
 */

const mongoose = require('mongoose');
const UserProgress = require('../models/UserProgress');
require('dotenv').config();

const fixProgressDuplicates = async () => {
    try {
        // Connexion à MongoDB
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/video-platform';
        await mongoose.connect(mongoUri);
        console.log('✅ Connecté à MongoDB');

        let fixed = 0;

        // Récupérer toutes les progressions
        const allProgress = await UserProgress.find({});
        console.log(`\n🔍 Trouvé ${allProgress.length} progression(s)`);

        for (const progress of allProgress) {
            const beforeCount = progress.completedVideos.length;
            
            // Nettoyer les doublons
            const uniqueVideoIds = [];
            const seenIds = new Set();
            
            for (const vid of progress.completedVideos) {
                const vidStr = vid.toString();
                if (!seenIds.has(vidStr)) {
                    seenIds.add(vidStr);
                    uniqueVideoIds.push(vid);
                }
            }
            
            const afterCount = uniqueVideoIds.length;
            
            if (beforeCount !== afterCount) {
                console.log(`\n🔧 Progression de l'utilisateur ${progress.userId}:`);
                console.log(`   - Avant: ${beforeCount} entrées (avec doublons)`);
                console.log(`   - Après: ${afterCount} vidéos uniques`);
                
                // Mettre à jour la progression
                progress.completedVideos = uniqueVideoIds;
                progress.totalVideosWatched = uniqueVideoIds.length;
                
                // Corriger currentPosition si nécessaire
                if (progress.currentPosition <= uniqueVideoIds.length) {
                    progress.currentPosition = uniqueVideoIds.length + 1;
                }
                
                await progress.save();
                fixed++;
                console.log(`   ✅ Progression corrigée`);
            }
        }

        console.log(`\n📊 Résumé:`);
        console.log(`   - Progressions corrigées: ${fixed}`);
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
    fixProgressDuplicates()
        .then(() => {
            console.log('✅ Script terminé avec succès');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Erreur lors de l\'exécution du script:', error);
            process.exit(1);
        });
}

module.exports = fixProgressDuplicates;

