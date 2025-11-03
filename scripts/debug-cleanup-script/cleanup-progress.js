const mongoose = require('mongoose');
const UserProgress = require('../models/UserProgress');

// Script de nettoyage des doublons de progression
async function cleanupProgress() {
    try {
        console.log('🧹 Début du nettoyage de la base de données...');
        
        // Connexion à MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plateforme-video-interactive');
        console.log('✅ Connecté à MongoDB');

        // 1. Trouver tous les utilisateurs avec des progressions multiples
        const duplicateUsers = await UserProgress.aggregate([
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

        console.log(`🔍 Trouvé ${duplicateUsers.length} utilisateurs avec des progressions multiples`);

        for (const duplicate of duplicateUsers) {
            console.log(`\n👤 Utilisateur ${duplicate._id}:`);
            console.log(`   - ${duplicate.count} progressions trouvées`);
            
            // Trier par date de création (garder la plus récente)
            const sortedProgress = duplicate.progressDocs.sort((a, b) => 
                new Date(b.createdAt) - new Date(a.createdAt)
            );
            
            const keepProgress = sortedProgress[0]; // La plus récente
            const deleteProgress = sortedProgress.slice(1); // Les autres
            
            console.log(`   - Garde: ${keepProgress._id} (créée: ${keepProgress.createdAt})`);
            console.log(`   - Supprime: ${deleteProgress.length} autres`);
            
            // Supprimer les doublons
            const deleteIds = deleteProgress.map(p => p._id);
            await UserProgress.deleteMany({ _id: { $in: deleteIds } });
            
            console.log(`   ✅ ${deleteIds.length} progressions supprimées`);
        }

        // 2. Nettoyer les completedVideos en doublons dans chaque progression
        console.log('\n🧹 Nettoyage des vidéos en doublons...');
        
        const allProgress = await UserProgress.find({});
        let cleanedCount = 0;
        
        for (const progress of allProgress) {
            const originalLength = progress.completedVideos.length;
            
            // Supprimer les doublons en gardant l'ordre
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
        
        console.log(`\n📊 Résumé du nettoyage:`);
        console.log(`   - Utilisateurs avec doublons: ${duplicateUsers.length}`);
        console.log(`   - Progressions nettoyées: ${cleanedCount}`);
        
        // 3. Vérifier la cohérence finale
        console.log('\n🔍 Vérification de la cohérence...');
        
        const finalStats = await UserProgress.aggregate([
            {
                $group: {
                    _id: null,
                    totalProgress: { $sum: 1 },
                    totalUsers: { $addToSet: '$userId' }
                }
            }
        ]);
        
        console.log(`   - Total progressions: ${finalStats[0]?.totalProgress || 0}`);
        console.log(`   - Utilisateurs uniques: ${finalStats[0]?.totalUsers.length || 0}`);
        
        // Vérifier qu'il n'y a plus de doublons
        const remainingDuplicates = await UserProgress.aggregate([
            {
                $group: {
                    _id: '$userId',
                    count: { $sum: 1 }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]);
        
        if (remainingDuplicates.length === 0) {
            console.log('   ✅ Aucun doublon restant');
        } else {
            console.log(`   ❌ ${remainingDuplicates.length} doublons restants`);
        }
        
        console.log('\n🎉 Nettoyage terminé avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Déconnecté de MongoDB');
    }
}

// Exécuter le script
cleanupProgress();
