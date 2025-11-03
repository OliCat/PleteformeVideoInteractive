const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware pour vérifier l'authentification JWT
const authenticateToken = async (req, res, next) => {
    try {
        // Récupérer le token depuis le header Authorization
        const authHeader = req.headers.authorization;
        console.log('🔐 Headers reçus:', req.headers);
        console.log('🔐 Auth header:', authHeader);
        
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        console.log('🔐 Token extrait:', token ? 'OUI' : 'NON');

        if (!token) {
            console.log('❌ Token manquant');
            return res.status(401).json({
                success: false,
                message: 'Token d\'authentification manquant'
            });
        }

        // Vérifier et décoder le token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        
        // Récupérer l'utilisateur depuis la base de données
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Vérifier si l'utilisateur est actif
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Compte désactivé'
            });
        }

        // Ajouter l'utilisateur à l'objet request
        req.user = user;
        next();
        
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token invalide'
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expiré'
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'authentification'
            });
        }
    }
};

// Middleware pour vérifier le rôle admin
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentification requise'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Accès administrateur requis'
        });
    }

    next();
};

// Middleware pour vérifier la propriété (utilisateur peut modifier son propre profil)
const requireOwnership = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentification requise'
        });
    }

    const resourceUserId = req.params.userId || req.params.id;
    
    // Les admins peuvent tout modifier
    if (req.user.role === 'admin') {
        return next();
    }

    // Les utilisateurs normaux ne peuvent modifier que leur propre profil
    if (req.user._id.toString() !== resourceUserId) {
        return res.status(403).json({
            success: false,
            message: 'Accès non autorisé à cette ressource'
        });
    }

    next();
};

// Middleware optionnel d'authentification (pour les routes qui peuvent être publiques ou privées)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
            const user = await User.findById(decoded.userId).select('-password');
            
            if (user && user.isActive) {
                req.user = user;
            }
        }
        
        next();
    } catch (error) {
        // En cas d'erreur, on continue sans authentification
        next();
    }
};

module.exports = {
    authenticateToken,
    requireAdmin,
    requireOwnership,
    optionalAuth
};
