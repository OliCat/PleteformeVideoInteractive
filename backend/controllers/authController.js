const { validationResult } = require('express-validator');
const authService = require('../services/authService');

// Inscription d'un nouvel utilisateur
const register = async (req, res) => {
    try {
        // Vérifier les erreurs de validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: errors.array()
            });
        }

        const { username, email, password, firstName, lastName } = req.body;

        // Inscrire l'utilisateur
        const newUser = await authService.registerUser({
            username,
            email,
            password,
            firstName,
            lastName
        });

        res.status(201).json({
            success: true,
            message: 'Utilisateur inscrit avec succès',
            data: newUser
        });

    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        
        if (error.message.includes('existe déjà')) {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'inscription',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Connexion d'un utilisateur
const login = async (req, res) => {
    try {
        // Vérifier les erreurs de validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Connecter l'utilisateur
        const result = await authService.loginUser(email, password);

        res.status(200).json({
            success: true,
            message: 'Connexion réussie',
            data: result
        });

    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        
        if (error.message.includes('incorrect') || error.message.includes('verrouillé')) {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur lors de la connexion',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Récupération du profil utilisateur connecté
const getProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const userProfile = await authService.getUserProfile(userId);

        res.status(200).json({
            success: true,
            data: userProfile
        });

    } catch (error) {
        console.error('Erreur lors de la récupération du profil:', error);
        
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du profil',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Mise à jour du profil utilisateur
const updateProfile = async (req, res) => {
    try {
        // Vérifier les erreurs de validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: errors.array()
            });
        }

        const userId = req.user._id;
        const updateData = req.body;

        // Mettre à jour le profil
        const updatedUser = await authService.updateUserProfile(userId, updateData);

        res.status(200).json({
            success: true,
            message: 'Profil mis à jour avec succès',
            data: updatedUser
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour du profil:', error);
        
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour du profil',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Changement de mot de passe
const changePassword = async (req, res) => {
    try {
        // Vérifier les erreurs de validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: errors.array()
            });
        }

        const userId = req.user._id;
        const { currentPassword, newPassword } = req.body;

        // Changer le mot de passe
        const result = await authService.changePassword(userId, currentPassword, newPassword);

        res.status(200).json({
            success: true,
            message: result.message
        });

    } catch (error) {
        console.error('Erreur lors du changement de mot de passe:', error);
        
        if (error.message.includes('incorrect')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur lors du changement de mot de passe',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Vérification de l'état de l'authentification
const checkAuth = async (req, res) => {
    try {
        // L'utilisateur est déjà authentifié grâce au middleware
        res.status(200).json({
            success: true,
            message: 'Utilisateur authentifié',
            data: {
                user: req.user
            }
        });

    } catch (error) {
        console.error('Erreur lors de la vérification de l\'authentification:', error);
        
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la vérification de l\'authentification',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Déconnexion de l'utilisateur
const logout = async (req, res) => {
    try {
        // Pour l'instant, on retourne juste un succès
        // En production, on pourrait invalider le token côté serveur
        res.status(200).json({
            success: true,
            message: 'Déconnexion réussie'
        });

    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la déconnexion',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    changePassword,
    checkAuth,
    logout
};
