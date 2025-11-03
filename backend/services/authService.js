const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Création de l'utilisateur admin par défaut
const createAdminUser = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@cooperative.local';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';

        // Vérifier si l'admin existe déjà
        const existingAdmin = await User.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log('✅ Utilisateur admin déjà existant');
            return;
        }

        // Créer l'utilisateur admin
        const adminUser = new User({
            username: adminUsername,
            email: adminEmail,
            password: adminPassword, // Sera hashé automatiquement par le middleware
            role: 'admin',
            firstName: 'Admin',
            lastName: 'User'
        });

        await adminUser.save();
        console.log('✅ Utilisateur admin créé avec succès');
        console.log(`📧 Email: ${adminEmail}`);
        console.log(`🔑 Mot de passe: ${adminPassword}`);
        
    } catch (error) {
        console.error('❌ Erreur lors de la création de l\'admin:', error.message);
    }
};

// Inscription d'un nouvel utilisateur
const registerUser = async (userData) => {
    try {
        // Vérifier si l'email ou username existe déjà
        const existingUser = await User.findOne({
            $or: [
                { email: userData.email },
                { username: userData.username }
            ]
        });

        if (existingUser) {
            throw new Error('Un utilisateur avec cet email ou nom d\'utilisateur existe déjà');
        }

        // Créer le nouvel utilisateur
        const newUser = new User({
            username: userData.username,
            email: userData.email,
            password: userData.password,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: 'user'
        });

        await newUser.save();

        // Retourner l'utilisateur sans le mot de passe
        const userResponse = newUser.toObject();
        delete userResponse.password;

        return userResponse;
    } catch (error) {
        throw error;
    }
};

// Connexion d'un utilisateur
const loginUser = async (email, password) => {
    try {
        // Trouver l'utilisateur par email ou username et inclure le mot de passe
        // La méthode findByLogin cherche par email OU username
        const user = await User.findByLogin(email);
        
        if (!user) {
            throw new Error('Email ou mot de passe incorrect');
        }

        // Vérifier si le compte est verrouillé
        if (user.isLocked) {
            throw new Error('Compte temporairement verrouillé. Réessayez plus tard.');
        }

        // Vérifier le mot de passe
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            // Incrémenter les tentatives de connexion échouées
            await user.incLoginAttempts();
            throw new Error('Email ou mot de passe incorrect');
        }

        // Reset des tentatives de connexion échouées
        if (user.loginAttempts > 0) {
            user.loginAttempts = 0;
            user.lockUntil = undefined;
        }

        // Mettre à jour la dernière connexion
        user.lastLogin = new Date();
        await user.save();

        // Générer le token JWT
        const token = generateToken(user._id);

        // Retourner l'utilisateur sans le mot de passe
        const userResponse = user.toObject();
        delete userResponse.password;

        return {
            user: userResponse,
            token
        };
    } catch (error) {
        throw error;
    }
};

// Récupération du profil utilisateur
const getUserProfile = async (userId) => {
    try {
        const user = await User.findById(userId).select('-password');
        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }
        return user;
    } catch (error) {
        throw error;
    }
};

// Mise à jour du profil utilisateur
const updateUserProfile = async (userId, updateData) => {
    try {
        // Ne pas permettre la modification du rôle via cette méthode
        delete updateData.role;
        delete updateData.email; // L'email ne peut être modifié que via une route spéciale

        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        return user;
    } catch (error) {
        throw error;
    }
};

// Changement de mot de passe
const changePassword = async (userId, currentPassword, newPassword) => {
    try {
        const user = await User.findById(userId).select('+password');
        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        // Vérifier l'ancien mot de passe
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            throw new Error('Mot de passe actuel incorrect');
        }

        // Mettre à jour le mot de passe
        user.password = newPassword;
        await user.save();

        return { message: 'Mot de passe modifié avec succès' };
    } catch (error) {
        throw error;
    }
};

// Génération de token JWT
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );
};

// Vérification de token JWT
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    } catch (error) {
        throw new Error('Token invalide ou expiré');
    }
};

// Récupération de tous les utilisateurs (admin seulement)
const getAllUsers = async () => {
    try {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        return users;
    } catch (error) {
        throw error;
    }
};

// Désactivation/activation d'un utilisateur (admin seulement)
const toggleUserStatus = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        user.isActive = !user.isActive;
        await user.save();

        return { 
            message: `Utilisateur ${user.isActive ? 'activé' : 'désactivé'} avec succès`,
            isActive: user.isActive
        };
    } catch (error) {
        throw error;
    }
};

// Créer un utilisateur par un admin (avec rôle et statut personnalisables)
const createUserByAdmin = async (userData) => {
    try {
        // Vérifier si l'email ou username existe déjà
        const existingUser = await User.findOne({
            $or: [
                { email: userData.email },
                { username: userData.username }
            ]
        });

        if (existingUser) {
            throw new Error('Un utilisateur avec cet email ou nom d\'utilisateur existe déjà');
        }

        // Créer le nouvel utilisateur avec le rôle et statut spécifiés
        const newUser = new User({
            username: userData.username,
            email: userData.email,
            password: userData.password, // Sera hashé automatiquement
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role || 'user',
            isActive: userData.isActive !== undefined ? userData.isActive : true
        });

        await newUser.save();

        // Retourner l'utilisateur sans le mot de passe
        const userResponse = newUser.toObject();
        delete userResponse.password;

        return userResponse;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    createAdminUser,
    registerUser,
    createUserByAdmin,
    loginUser,
    getUserProfile,
    updateUserProfile,
    changePassword,
    generateToken,
    verifyToken,
    getAllUsers,
    toggleUserStatus
}; 