const mongoose = require('mongoose');
const User = require('../models/User');
const Video = require('../models/Video');
const Quiz = require('../models/Quiz');
const UserProgress = require('../models/UserProgress');
const bcrypt = require('bcryptjs');

// Script pour créer des données de test
async function createTestData() {
    try {
        console.log('🔍 Création des données de test...');
        
        // Connexion à MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/plateforme-video-interactive';
        console.log(`🔌 Connexion à: ${mongoUri}`);
        
        await mongoose.connect(mongoUri);
        console.log('✅ Connecté à MongoDB');

        // Vider les collections existantes
        await User.deleteMany({});
        await Video.deleteMany({});
        await Quiz.deleteMany({});
        await UserProgress.deleteMany({});
        console.log('🧹 Collections vidées');

        // 1. Créer un utilisateur de test
        const hashedPassword = await bcrypt.hash('password123', 10);
        const testUser = new User({
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            password: hashedPassword,
            role: 'user',
            isActive: true
        });
        await testUser.save();
        console.log('👤 Utilisateur de test créé:', testUser._id);

        // 2. Créer une vidéo de test
        const testVideo = new Video({
            title: 'Vidéo de test',
            description: 'Description de la vidéo de test',
            videoUrl: '/uploads/test-video.mp4',
            thumbnailUrl: '/uploads/test-thumbnail.jpg',
            duration: 300, // 5 minutes
            order: 1,
            isPublished: true
        });
        await testVideo.save();
        console.log('🎥 Vidéo de test créée:', testVideo._id);

        // 3. Créer un quiz de test
        const testQuiz = new Quiz({
            title: 'Quiz de test',
            description: 'Quiz associé à la vidéo de test',
            videoId: testVideo._id,
            passingScore: 50,
            questions: [
                {
                    _id: new mongoose.Types.ObjectId().toString(),
                    question: 'Quelle est la bonne réponse ?',
                    type: 'multiple-choice',
                    options: ['Option A', 'Option B', 'Option C', 'Option D'],
                    correctAnswer: 'Option B',
                    points: 1
                }
            ]
        });
        await testQuiz.save();
        console.log('❓ Quiz de test créé:', testQuiz._id);

        // 4. Créer une progression de test (vidéo terminée)
        const testProgress = new UserProgress({
            userId: testUser._id,
            currentPosition: 2, // Position suivante
            completedVideos: [testVideo._id],
            totalVideosWatched: 1,
            totalQuizzesPassed: 1,
            quizAttempts: [{
                quizId: testQuiz._id,
                videoId: testVideo._id,
                score: 1,
                totalPoints: 1,
                percentage: 100,
                passed: true,
                answers: [{
                    questionId: testQuiz.questions[0]._id,
                    userAnswer: 'Option B',
                    isCorrect: true,
                    points: 1
                }],
                completedAt: new Date()
            }],
            startedAt: new Date(),
            lastActivityAt: new Date()
        });
        await testProgress.save();
        console.log('📊 Progression de test créée:', testProgress._id);

        // 5. Vérifier les données créées
        console.log('\n📋 Résumé des données créées:');
        console.log(`   - Utilisateurs: ${await User.countDocuments()}`);
        console.log(`   - Vidéos: ${await Video.countDocuments()}`);
        console.log(`   - Quiz: ${await Quiz.countDocuments()}`);
        console.log(`   - Progressions: ${await UserProgress.countDocuments()}`);

        console.log('\n🎉 Données de test créées avec succès !');
        console.log('\n📝 Informations de connexion:');
        console.log(`   - Email: test@example.com`);
        console.log(`   - Mot de passe: password123`);

    } catch (error) {
        console.error('❌ Erreur lors de la création des données:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Déconnecté de MongoDB');
    }
}

// Exécuter le script
createTestData();
