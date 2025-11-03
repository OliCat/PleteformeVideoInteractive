/**
 * Script de nettoyage des associations quiz-vidéo orphelines
 * 
 * Ce script :
 * 1. Supprime les quiz qui référencent des vidéos inexistantes
 * 2. Nettoie les quizId dans les vidéos qui pointent vers des quiz inexistants
 * 3. Identifie les associations incohérentes
 * 4. Supprime les quiz inactifs orphelins
 */

const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const Video = require('../models/Video');
require('dotenv').config();

const cleanupQuizVideoAssociations = async () => {
    try {
        // Connexion à MongoDB
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/video-platform';
        await mongoose.connect(mongoUri);
        console.log('✅ Connecté à MongoDB');

        let cleaned = 0;
        let issues = [];

        // 1. Trouver les quiz qui référencent des vidéos inexistantes
        console.log('\n🔍 Recherche des quiz avec vidéos inexistantes...');
        const allQuizzes = await Quiz.find({});
        for (const quiz of allQuizzes) {
            const video = await Video.findById(quiz.videoId);
            if (!video) {
                console.log(`❌ Quiz ${quiz._id} référence une vidéo inexistante: ${quiz.videoId}`);
                issues.push({
                    type: 'quiz_with_missing_video',
                    quizId: quiz._id,
                    videoId: quiz.videoId
                });
                // Supprimer le quiz orphelin
                await Quiz.findByIdAndDelete(quiz._id);
                cleaned++;
                console.log(`✅ Quiz orphelin supprimé: ${quiz._id}`);
            }
        }

        // 2. Trouver les vidéos avec quizId qui pointent vers des quiz inexistants
        console.log('\n🔍 Recherche des vidéos avec quizId invalide...');
        const allVideos = await Video.find({ quizId: { $exists: true, $ne: null } });
        for (const video of allVideos) {
            const quiz = await Quiz.findById(video.quizId);
            if (!quiz) {
                console.log(`❌ Vidéo ${video._id} référence un quiz inexistant: ${video.quizId}`);
                issues.push({
                    type: 'video_with_missing_quiz',
                    videoId: video._id,
                    quizId: video.quizId
                });
                // Nettoyer la référence quizId dans la vidéo
                await Video.findByIdAndUpdate(video._id, { $unset: { quizId: "" } });
                cleaned++;
                console.log(`✅ Référence quizId nettoyée dans la vidéo: ${video._id}`);
            }
        }

        // 3. Identifier les associations incohérentes (quiz.videoId ≠ video.quizId)
        console.log('\n🔍 Recherche des associations incohérentes...');
        const quizzesWithVideos = await Quiz.find({}).populate('videoId');
        for (const quiz of quizzesWithVideos) {
            if (quiz.videoId && quiz.videoId.quizId) {
                const videoQuizId = quiz.videoId.quizId.toString();
                const quizId = quiz._id.toString();
                if (videoQuizId !== quizId) {
                    console.log(`⚠️ Association incohérente détectée:`);
                    console.log(`   - Quiz ${quiz._id} référence la vidéo ${quiz.videoId._id}`);
                    console.log(`   - Mais la vidéo référence le quiz ${quiz.videoId.quizId}`);
                    issues.push({
                        type: 'inconsistent_association',
                        quizId: quiz._id,
                        videoId: quiz.videoId._id,
                        videoQuizId: quiz.videoId.quizId
                    });
                    
                    // Corriger en mettant à jour la vidéo avec le bon quizId
                    await Video.findByIdAndUpdate(quiz.videoId._id, { quizId: quiz._id });
                    cleaned++;
                    console.log(`✅ Association corrigée pour la vidéo ${quiz.videoId._id}`);
                }
            } else if (quiz.videoId && !quiz.videoId.quizId) {
                // Quiz existe mais la vidéo n'a pas de quizId, corriger
                console.log(`⚠️ Vidéo ${quiz.videoId._id} n'a pas de quizId mais un quiz existe`);
                await Video.findByIdAndUpdate(quiz.videoId._id, { quizId: quiz._id });
                cleaned++;
                console.log(`✅ Référence quizId ajoutée à la vidéo ${quiz.videoId._id}`);
            }
        }

        // 4. Trouver les quiz inactifs orphelins (qui n'ont pas de vidéo publiée associée)
        console.log('\n🔍 Recherche des quiz inactifs orphelins...');
        const inactiveQuizzes = await Quiz.find({ isActive: false });
        for (const quiz of inactiveQuizzes) {
            const video = await Video.findById(quiz.videoId);
            if (!video || !video.isPublished) {
                console.log(`⚠️ Quiz inactif orphelin détecté: ${quiz._id}`);
                // Nettoyer la référence dans la vidéo si elle existe
                if (video && video.quizId && video.quizId.toString() === quiz._id.toString()) {
                    await Video.findByIdAndUpdate(quiz.videoId, { $unset: { quizId: "" } });
                }
                await Quiz.findByIdAndDelete(quiz._id);
                cleaned++;
                console.log(`✅ Quiz inactif orphelin supprimé: ${quiz._id}`);
            }
        }

        // 5. Statistiques finales
        console.log('\n📊 Statistiques de nettoyage:');
        console.log(`   - Éléments nettoyés: ${cleaned}`);
        console.log(`   - Problèmes détectés: ${issues.length}`);
        
        if (issues.length > 0) {
            console.log('\n📋 Détails des problèmes:');
            issues.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue.type}:`, issue);
            });
        }

        // 6. Vérification finale de cohérence
        console.log('\n✅ Vérification finale de cohérence...');
        const finalQuizzes = await Quiz.find({});
        const finalVideos = await Video.find({ isPublished: true });
        
        console.log(`   - Quiz actifs: ${finalQuizzes.filter(q => q.isActive).length}`);
        console.log(`   - Vidéos publiées: ${finalVideos.length}`);
        console.log(`   - Vidéos avec quiz: ${finalVideos.filter(v => v.quizId).length}`);
        
        // Vérifier que chaque vidéo publiée a au plus un quiz actif
        for (const video of finalVideos) {
            if (video.quizId) {
                const quiz = await Quiz.findById(video.quizId);
                if (!quiz || !quiz.isActive) {
                    console.log(`⚠️ Vidéo ${video._id} a un quizId mais le quiz n'existe pas ou est inactif`);
                }
            }
            
            // Vérifier qu'il n'y a qu'un seul quiz actif par vidéo
            const activeQuizzesForVideo = await Quiz.find({ videoId: video._id, isActive: true });
            if (activeQuizzesForVideo.length > 1) {
                console.log(`⚠️ Vidéo ${video._id} a plusieurs quiz actifs: ${activeQuizzesForVideo.map(q => q._id).join(', ')}`);
            }
        }

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
    cleanupQuizVideoAssociations()
        .then(() => {
            console.log('✅ Script terminé avec succès');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Erreur lors de l\'exécution du script:', error);
            process.exit(1);
        });
}

module.exports = cleanupQuizVideoAssociations;

