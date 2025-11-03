const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Charger les variables d'environnement
dotenv.config();

// Imports des routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const videoRoutes = require('./routes/videos');
const quizRoutes = require('./routes/quizzes');
const progressRoutes = require('./routes/progress');
const adminRoutes = require('./routes/admin');

// Imports des middlewares
const { errorHandler } = require('./middleware/errorHandler');
const { createAdminUser } = require('./services/authService');

const app = express();
const PORT = process.env.PORT || 5000;

// Configuration des dossiers de logs
const logDir = process.env.LOG_PATH || './logs';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Configuration de sécurité
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "blob:", "http://localhost:5000", "https://localhost:5000"],
            mediaSrc: ["'self'", "blob:", "http://localhost:5000", "https://localhost:5000", "http://localhost:3000"],
            connectSrc: ["'self'", "http://localhost:5000", "https://localhost:5000", "http://localhost:3000"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Configuration CORS
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Middleware de compression
app.use(compression());

// Rate limiting - Configuration différenciée par type de route

// Limiter général pour toutes les routes API (plus permissif)
const generalLimiter = rateLimit({
    windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes par défaut
    // En développement: 2000 requêtes / 15 min, en production: 500 / 15 min (augmenté pour l'usage réel)
    max: process.env.RATE_LIMIT_MAX_REQUESTS || (process.env.NODE_ENV === 'production' ? 500 : 2000),
    message: {
        error: 'Trop de requêtes depuis cette adresse IP, veuillez réessayer plus tard.'
    },
    standardHeaders: true, // Envoie les headers RateLimit-* dans la réponse
    legacyHeaders: false,
    // Skip rate limiting pour les health checks
    skip: (req) => req.path === '/api/health',
});

// Limiter plus permissif pour les routes de progression (tracking vidéo fréquent)
const progressLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    // Limite très élevée pour le tracking vidéo (sauvegarde toutes les 10 secondes)
    // 1000 requêtes / 15 min = ~66 requêtes/min = 1 requête toutes les ~0.9 secondes
    max: parseInt(process.env.RATE_LIMIT_PROGRESS_MAX) || 1000,
    message: {
        error: 'Trop de requêtes de progression, veuillez patienter quelques instants.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Identifier l'utilisateur si authentifié pour un meilleur rate limiting
    keyGenerator: (req) => {
        // Utiliser l'ID utilisateur si authentifié, sinon l'IP
        return req.user?.id || req.ip;
    },
});

// Limiter strict pour l'authentification (protection brute force déjà gérée, mais sécurité supplémentaire)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 50, // 50 tentatives / 15 min pour auth
    message: {
        error: 'Trop de tentatives d\'authentification, veuillez réessayer plus tard.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Ne pas compter les requêtes réussies
});

// Limiter pour l'upload de vidéos (longues opérations)
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX) || 10, // 10 uploads / heure par IP
    message: {
        error: 'Trop d\'uploads de vidéos. Veuillez attendre avant d\'en uploader une autre.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Application des limiters selon les routes
app.use('/api/progress', progressLimiter); // Routes de progression en premier (priorité)
app.use('/api/auth', authLimiter); // Routes d'authentification
app.use('/api/videos/upload', uploadLimiter); // Route d'upload spécifique
app.use('/api/', generalLimiter); // Limiter général pour toutes les autres routes API

// Logging
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined', {
        stream: fs.createWriteStream(path.join(logDir, 'access.log'), { flags: 'a' })
    }));
} else {
    app.use(morgan('dev'));
}

// Parsing des données
app.use(express.json({ limit: '50mb' }));

// Middleware conditionnel pour URL-encoded (sauf pour les uploads)
app.use((req, res, next) => {
    if (req.path.includes('/upload')) {
        return next(); // Skip URL-encoded parsing for upload routes
    }
    express.urlencoded({ extended: true, limit: '50mb' })(req, res, next);
});

// Middleware pour les fichiers vidéo avec CORS et Range support
app.use('/videos', (req, res, next) => {
    // Headers CORS pour les vidéos
    res.header('Access-Control-Allow-Origin', corsOptions.origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');
    res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Support pour les requêtes Range (streaming vidéo)
    res.header('Accept-Ranges', 'bytes');
    
    // Type MIME pour les fichiers MP4
    if (req.path.endsWith('.mp4')) {
        res.setHeader('Content-Type', 'video/mp4');
    }
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    next();
}, express.static(process.env.VIDEO_PATH || './videos'));

// Servir les thumbnails avec CORS
app.use('/thumbnails', cors(corsOptions), express.static(process.env.THUMBNAIL_PATH || './thumbnails'));

// Route de santé
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Video Platform API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: '1.0.0'
    });
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/admin', adminRoutes);

// Middleware de gestion d'erreurs
app.use(errorHandler);

// Gestion des routes non trouvées
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route non trouvée'
    });
});

// Connexion à MongoDB
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/video-platform';
        
        await mongoose.connect(mongoURI, {
        });
        
        console.log('✅ MongoDB connecté avec succès');
        
        // Créer l'utilisateur admin par défaut
        await createAdminUser();
        
    } catch (error) {
        console.error('❌ Erreur de connexion MongoDB:', error.message);
        process.exit(1);
    }
};

// Gestion gracieuse de l'arrêt
process.on('SIGTERM', async () => {
    console.log('🔄 Signal SIGTERM reçu, fermeture gracieuse...');
    try {
        await mongoose.connection.close();
        console.log('📦 Connexion MongoDB fermée');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur lors de la fermeture de MongoDB:', error);
        process.exit(1);
    }
});

process.on('SIGINT', async () => {
    console.log('🔄 Signal SIGINT reçu, fermeture gracieuse...');
    try {
        await mongoose.connection.close();
        console.log('📦 Connexion MongoDB fermée');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur lors de la fermeture de MongoDB:', error);
        process.exit(1);
    }
});

// Démarrage du serveur
const startServer = async () => {
    await connectDB();
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Serveur démarré sur 0.0.0.0:${PORT}`);
        console.log(`📍 Environnement: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🌐 API Health: http://0.0.0.0:${PORT}/api/health`);
    });
};

// Gestion des erreurs non gérées
process.on('uncaughtException', (err) => {
    console.error('💥 Erreur non gérée:', err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error('💥 Promesse rejetée non gérée:', err);
    process.exit(1);
});

startServer(); 