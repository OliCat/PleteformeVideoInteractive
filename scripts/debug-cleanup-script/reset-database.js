const mongoose = require('mongoose');

// Script pour réinitialiser complètement la base de données
async function resetDatabase() {
    try {
        console.log('🔄 Réinitialisation de la base de données...');
        
        // Connexion à MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/plateforme-video-interactive';
        console.log(`🔌 Connexion à: ${mongoUri}`);
        
        await mongoose.connect(mongoUri);
        console.log('✅ Connecté à MongoDB');

        // Lister toutes les collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`📋 Collections trouvées: ${collections.length}`);
        
        if (collections.length > 0) {
            console.log('🗑️  Suppression de toutes les collections...');
            
            for (const collection of collections) {
                await mongoose.connection.db.dropCollection(collection.name);
                console.log(`   ✅ ${collection.name} supprimée`);
            }
        } else {
            console.log('ℹ️  Aucune collection à supprimer');
        }

        // Vérifier que tout est vide
        const finalCollections = await mongoose.connection.db.listCollections().toArray();
        console.log(`\n📊 Collections restantes: ${finalCollections.length}`);
        
        if (finalCollections.length === 0) {
            console.log('✅ Base de données complètement vidée');
        } else {
            console.log('⚠️  Certaines collections persistent');
        }

        console.log('\n🎉 Réinitialisation terminée !');
        console.log('💡 Tu peux maintenant redémarrer l\'application pour créer une base de données propre');

    } catch (error) {
        console.error('❌ Erreur lors de la réinitialisation:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Déconnecté de MongoDB');
    }
}

// Exécuter le script
resetDatabase();
