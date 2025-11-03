const { validationResult } = require('express-validator');
const authService = require('../services/authService');
const User = require('../models/User');

// Récupération de tous les utilisateurs (admin seulement)
const getAllUsers = async (req, res) => {
    try {
        const users = await authService.getAllUsers();

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des utilisateurs',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Création d'un utilisateur (admin seulement)
const createUser = async (req, res) => {
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

        const userData = req.body;

        // Créer l'utilisateur via le service admin
        const newUser = await authService.createUserByAdmin(userData);

        res.status(201).json({
            success: true,
            message: 'Utilisateur créé avec succès',
            data: newUser
        });

    } catch (error) {
        console.error('Erreur lors de la création de l\'utilisateur:', error);
        
        if (error.message.includes('existe déjà')) {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création de l\'utilisateur',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Récupération d'un utilisateur par ID
const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error);
        
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération de l\'utilisateur',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Mise à jour d'un utilisateur (admin seulement)
const updateUser = async (req, res) => {
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

        const { userId } = req.params;
        const updateData = req.body;

        // Vérifier que l'utilisateur existe
        const existingUser = await User.findById(userId);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Empêcher la modification de l'admin principal
        if (existingUser.email === 'admin@cooperative.local' && req.user.email !== 'admin@cooperative.local') {
            return res.status(403).json({
                success: false,
                message: 'Impossible de modifier l\'administrateur principal'
            });
        }

        // Mettre à jour l'utilisateur
        // Utiliser findById + save() au lieu de findByIdAndUpdate pour déclencher les middlewares (hash du mot de passe)
        const userToUpdate = await User.findById(userId);
        if (!userToUpdate) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Mettre à jour les champs
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined && key !== '_id') {
                userToUpdate[key] = updateData[key];
            }
        });

        // Sauvegarder pour déclencher les middlewares (notamment le hash du mot de passe)
        await userToUpdate.save();

        // Retourner l'utilisateur mis à jour sans le mot de passe
        const updatedUser = await User.findById(userId).select('-password');

        res.status(200).json({
            success: true,
            message: 'Utilisateur mis à jour avec succès',
            data: updatedUser
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
        
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour de l\'utilisateur',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Activation/désactivation d'un utilisateur
const toggleUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;

        // Empêcher la désactivation de l'admin principal
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        if (targetUser.email === 'admin@cooperative.local') {
            return res.status(403).json({
                success: false,
                message: 'Impossible de désactiver l\'administrateur principal'
            });
        }

        const result = await authService.toggleUserStatus(userId);

        res.status(200).json({
            success: true,
            message: result.message,
            data: result
        });

    } catch (error) {
        console.error('Erreur lors du changement de statut de l\'utilisateur:', error);
        
        res.status(500).json({
            success: false,
            message: 'Erreur lors du changement de statut de l\'utilisateur',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Suppression d'un utilisateur (admin seulement)
const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Vérifier que l'utilisateur existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Empêcher la suppression de l'admin principal
        if (user.email === 'admin@cooperative.local') {
            return res.status(403).json({
                success: false,
                message: 'Impossible de supprimer l\'administrateur principal'
            });
        }

        // Supprimer l'utilisateur
        await User.findByIdAndDelete(userId);

        res.status(200).json({
            success: true,
            message: 'Utilisateur supprimé avec succès'
        });

    } catch (error) {
        console.error('Erreur lors de la suppression de l\'utilisateur:', error);
        
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression de l\'utilisateur',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

// Statistiques des utilisateurs
const getUserStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const adminUsers = await User.countDocuments({ role: 'admin' });
        const regularUsers = await User.countDocuments({ role: 'user' });

        // Utilisateurs créés ce mois
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const newUsersThisMonth = await User.countDocuments({
            createdAt: { $gte: startOfMonth }
        });

        res.status(200).json({
            success: true,
            data: {
                total: totalUsers,
                active: activeUsers,
                inactive: totalUsers - activeUsers,
                admins: adminUsers,
                regular: regularUsers,
                newThisMonth: newUsersThisMonth
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des statistiques',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
        });
    }
};

module.exports = {
    getAllUsers,
    createUser,
    getUserById,
    updateUser,
    toggleUserStatus,
    deleteUser,
    getUserStats
};
