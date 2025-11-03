const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const UserProgress = require('../models/UserProgress');
const Video = require('../models/Video');

/**
 * Script de nettoyage des données de progression orphelines
 * Supprime les UserProgress qui ne correspondent à aucun utilisateur existant
 */
async function cleanupOrphanedProgress() {
    try {
        // Connexion à MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plateforme-video');
        console.log('✅ Connexion à MongoDB réussie');

        // Récupérer tous les IDs d'utilisateurs valides
        const validUsers = await User.find({}, '_id');
        const validUserIds = validUsers.map(u => u._id);
        
        console.log(`📊 Utilisateurs valides trouvés: ${validUserIds.length}`);
        validUsers.forEach(user => {
            console.log(`   - ${user._id}`);
        });

        // Trouver tous les UserProgress
        const allProgress = await UserProgress.find({}, 'userId');
        console.log(`\n📈 Total de UserProgress dans la base: ${allProgress.length}`);

        // Identifier les UserProgress orphelins
        const orphanedProgress = [];
        const validProgress = [];

        for (const progress of allProgress) {
            const userId = progress.userId;
            const isValid = validUserIds.some(validId => validId.toString() === userId.toString());
            
            if (isValid) {
                validProgress.push(progress);
            } else {
                orphanedProgress.push(progress);
                console.log(`   ⚠️  UserProgress orphelin trouvé: userId=${userId} (ID: ${progress._id})`);
            }
        }

        console.log(`\n✅ UserProgress valides: ${validProgress.length}`);
        console.log(`❌ UserProgress orphelins: ${orphanedProgress.length}`);

        if (orphanedProgress.length > 0) {
            console.log('\n🧹 Suppression des UserProgress orphelins...');
            
            const orphanedIds = orphanedProgress.map(p => p._id);
            const result = await UserProgress.deleteMany({ _id: { $in: orphanedIds } });
            
            console.log(`\n✅ Suppression réussie: ${result.deletedCount} UserProgress orphelin(s) supprimé(s)`);
            
            // Afficher les détails des suppressions
            orphanedProgress.forEach(progress => {
                console.log(`   - Supprimé: UserProgress ID ${progress._id} (userId: ${progress.userId})`);
            });
        } else {
            console.log('\n✨ Aucun UserProgress orphelin trouvé. La base de données est propre !');
        }

        // Vérification finale
        const remainingProgress = await UserProgress.countDocuments();
        console.log(`\n📊 UserProgress restants après nettoyage: ${remainingProgress}`);
        console.log(`📊 Utilisateurs valides: ${validUserIds.length}`);
        
        if (remainingProgress === validUserIds.length) {
            console.log('✅ Cohérence parfaite: chaque utilisateur a exactement un UserProgress');
        } else if (remainingProgress > validUserIds.length) {
            console.log(`⚠️  Attention: ${remainingProgress - validUserIds.length} UserProgress en plus (certains utilisateurs ont plusieurs progressions ?)`);
        } else {
            console.log(`ℹ️  ${validUserIds.length - remainingProgress} utilisateur(s) n'ont pas encore de UserProgress (normal pour les nouveaux utilisateurs)`);
        }

        // Nettoyage des completedAt incorrects
        console.log('\n🔍 Vérification des parcours complétés...');
        
        const totalPublishedVideos = await Video.countDocuments({ isPublished: true });
        console.log(`📹 Nombre total de vidéos publiées: ${totalPublishedVideos}`);
        
        // Récupérer tous les UserProgress avec completedAt
        const progressWithCompletedAt = await UserProgress.find({
            completedAt: { $exists: true },
            userId: { $in: validUserIds }
        }).populate('completedVideos', '_id');
        
        console.log(`📊 UserProgress avec completedAt: ${progressWithCompletedAt.length}`);
        
        // Récupérer toutes les vidéos publiées
        const allPublishedVideos = await Video.find({ isPublished: true }, '_id');
        const allPublishedVideoIds = new Set(allPublishedVideos.map(v => v._id.toString()));
        
        let correctedCount = 0;
        const progressToFix = [];
        
        for (const progress of progressWithCompletedAt) {
            // Créer un Set des IDs de vidéos complétées (valides et uniques)
            const completedVideoIdsSet = new Set();
            for (const completedId of progress.completedVideos) {
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
            
            // Vérifier si toutes les vidéos publiées sont complétées
            const allVideosCompleted = Array.from(allPublishedVideoIds).every(videoId => 
                completedVideoIdsSet.has(videoId)
            );
            
            if (!allVideosCompleted) {
                progressToFix.push({
                    progress,
                    completedCount: completedVideoIdsSet.size,
                    totalNeeded: totalPublishedVideos
                });
                console.log(`   ⚠️  UserProgress orphelin (userId: ${progress.userId}): ${completedVideoIdsSet.size}/${totalPublishedVideos} vidéos complétées mais marked comme complété`);
            }
        }
        
        if (progressToFix.length > 0) {
            console.log(`\n🧹 Correction de ${progressToFix.length} UserProgress avec completedAt incorrect...`);
            
            for (const { progress } of progressToFix) {
                progress.completedAt = undefined;
                await progress.save();
                correctedCount++;
            }
            
            console.log(`✅ ${correctedCount} UserProgress corrigé(s) (completedAt supprimé)`);
        } else {
            console.log('✅ Tous les parcours complétés sont valides !');
        }

        console.log('\n✨ Nettoyage terminé avec succès !');
        process.exit(0);

    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
        process.exit(1);
    }
}

// Exécuter le script
cleanupOrphanedProgress();

