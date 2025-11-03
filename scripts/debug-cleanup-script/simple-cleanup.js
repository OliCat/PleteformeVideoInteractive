const mongoose = require('mongoose');
const UserProgress = require('../models/UserProgress');

// Script simple de nettoyage des doublons
async function simpleCleanup() {
    try {
        console.log('🧹 Nettoyage simple de la base de données...');
        
        // Connexion à MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plateforme-video-interactive');
        console.log('✅ Connecté à MongoDB');

        // Vérifier l'état actuel
        const totalProgress = await UserProgress.countDocuments();
        console.log(`📊 Total progressions: ${totalProgress}`);

        if (totalProgress === 0) {
            console.log('ℹ️  Aucune progression à nettoyer');
            return;
        }

        // Trouver les doublons
        const duplicates = await UserProgress.aggregate([
            {
                $group: {
                    _id: '$userId',
                    count: { $sum: 1 },
                    progressIds: { $push: '$_id' },
                    progressDocs: { $push: '$$ROOT' }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]);

        console.log(`🔍 Doublons trouvés: ${duplicates.length}`);

        if (duplicates.length === 0) {
            console.log('✅ Aucun doublon à nettoyer');
        } else {
            // Nettoyer les doublons
            for (const duplicate of duplicates) {
                console.log(`\n👤 Utilisateur ${duplicate._id}:`);
                console.log(`   - ${duplicate.count} progressions trouvées`);
                
                // Garder la plus récente
                const sortedProgress = duplicate.progressDocs.sort((a, b) => 
                    new Date(b.lastActivityAt || b.createdAt) - new Date(a.lastActivityAt || a.createdAt)
                );
                
                const keepProgress = sortedProgress[0];
                const deleteProgress = sortedProgress.slice(1);
                
                console.log(`   - Garde: ${keepProgress._id}`);
                console.log(`   - Supprime: ${deleteProgress.length} autres`);
                
                // Supprimer les doublons
                const deleteIds = deleteProgress.map(p => p._id);
                await UserProgress.deleteMany({ _id: { $in: deleteIds } });
                
                console.log(`   ✅ ${deleteIds.length} progressions supprimées`);
            }
        }

        // Nettoyer les completedVideos en doublons
        console.log('\n🧹 Nettoyage des vidéos en doublons...');
        
        const allProgress = await UserProgress.find({});
        let cleanedCount = 0;
        
        for (const progress of allProgress) {
            const originalLength = progress.completedVideos.length;
            
            // Supprimer les doublons
            const uniqueVideos = [];
            const seen = new Set();
            
            for (const videoId of progress.completedVideos) {
                const videoIdStr = videoId.toString();
                if (!seen.has(videoIdStr)) {
                    seen.add(videoIdStr);
                    uniqueVideos.push(videoId);
                }
            }
            
            if (uniqueVideos.length !== originalLength) {
                progress.completedVideos = uniqueVideos;
                progress.totalVideosWatched = uniqueVideos.length;
                await progress.save();
                cleanedCount++;
                console.log(`   ✅ Progression ${progress._id}: ${originalLength} → ${uniqueVideos.length} vidéos`);
            }
        }
        
        console.log(`\n📊 Résumé:`);
        console.log(`   - Doublons supprimés: ${duplicates.length}`);
        console.log(`   - Progressions nettoyées: ${cleanedCount}`);
        console.log(`   - Total final: ${await UserProgress.countDocuments()}`);
        
        console.log('\n🎉 Nettoyage terminé !');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Déconnecté de MongoDB');
    }
}

// Exécuter le script
simpleCleanup();
