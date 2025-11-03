const mongoose = require('mongoose');
const UserProgress = require('../models/UserProgress');
const User = require('../models/User');

// Script pour vérifier l'état de la base de données
async function checkDatabase() {
    try {
        console.log('🔍 Vérification de la base de données...');
        
        // Connexion à MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plateforme-video-interactive');
        console.log('✅ Connecté à MongoDB');

        // Vérifier les utilisateurs
        const userCount = await User.countDocuments();
        console.log(`👥 Nombre d'utilisateurs: ${userCount}`);
        
        if (userCount > 0) {
            const users = await User.find({}).select('_id firstName lastName email role');
            console.log('👥 Utilisateurs:');
            users.forEach(user => {
                console.log(`   - ${user._id}: ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`);
            });
        }

        // Vérifier les progressions
        const progressCount = await UserProgress.countDocuments();
        console.log(`\n📊 Nombre de progressions: ${progressCount}`);
        
        if (progressCount > 0) {
            const progressions = await UserProgress.find({}).select('userId completedVideos currentPosition totalVideosWatched createdAt');
            console.log('📊 Progressions:');
            progressions.forEach(progress => {
                console.log(`   - User: ${progress.userId}`);
                console.log(`     - Vidéos terminées: ${progress.completedVideos.length}`);
                console.log(`     - Position actuelle: ${progress.currentPosition}`);
                console.log(`     - Total regardées: ${progress.totalVideosWatched}`);
                console.log(`     - Créée: ${progress.createdAt}`);
            });
        }

        // Vérifier les doublons
        const duplicates = await UserProgress.aggregate([
            {
                $group: {
                    _id: '$userId',
                    count: { $sum: 1 },
                    progressIds: { $push: '$_id' }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]);

        console.log(`\n🔍 Doublons trouvés: ${duplicates.length}`);
        if (duplicates.length > 0) {
            duplicates.forEach(dup => {
                console.log(`   - User ${dup._id}: ${dup.count} progressions (${dup.progressIds.join(', ')})`);
            });
        }

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Déconnecté de MongoDB');
    }
}

// Exécuter le script
checkDatabase();
