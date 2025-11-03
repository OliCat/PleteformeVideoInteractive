// Script d'initialisation MongoDB pour la plateforme vidéo
db = db.getSiblingDB('video-platform');

// Créer un utilisateur pour l'application
db.createUser({
  user: 'videoapp',
  pwd: 'videoapp123',
  roles: [
    {
      role: 'readWrite',
      db: 'video-platform'
    }
  ]
});

// Créer les collections avec validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['username', 'email', 'password'],
      properties: {
        username: {
          bsonType: 'string',
          minLength: 3,
          maxLength: 50
        },
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        },
        password: {
          bsonType: 'string',
          minLength: 60,
          maxLength: 60
        },
        role: {
          bsonType: 'string',
          enum: ['admin', 'user']
        }
      }
    }
  }
});

db.createCollection('videos', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['title', 'filePath', 'order'],
      properties: {
        title: {
          bsonType: 'string',
          minLength: 1,
          maxLength: 200
        },
        order: {
          bsonType: 'number',
          minimum: 1
        }
      }
    }
  }
});

db.createCollection('quizzes');
db.createCollection('userprogresses');

// Créer les index pour optimiser les performances
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.videos.createIndex({ order: 1 }, { unique: true });
db.quizzes.createIndex({ videoId: 1 });
db.userprogresses.createIndex({ userId: 1 }, { unique: true });

print('Base de données video-platform initialisée avec succès!'); 