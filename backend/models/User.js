const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Le nom d\'utilisateur est requis'],
        unique: true,
        trim: true,
        minlength: [3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères'],
        maxlength: [50, 'Le nom d\'utilisateur ne peut pas dépasser 50 caractères'],
        match: [/^[a-zA-Z0-9_-]+$/, 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, _ et -']
    },
    email: {
        type: String,
        required: [true, 'L\'email est requis'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Veuillez fournir un email valide']
    },
    password: {
        type: String,
        required: [true, 'Le mot de passe est requis'],
        minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
        select: false // Ne pas inclure dans les requêtes par défaut
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    firstName: {
        type: String,
        trim: true,
        maxlength: [50, 'Le prénom ne peut pas dépasser 50 caractères']
    },
    lastName: {
        type: String,
        trim: true,
        maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date
    }
}, {
    timestamps: true
});

// Index pour optimiser les recherches (email et username sont déjà indexés par unique: true)
userSchema.index({ createdAt: -1 });

// Virtual pour vérifier si le compte est verrouillé
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Middleware pre-save pour hasher le mot de passe
userSchema.pre('save', async function(next) {
    // Ne hasher que si le mot de passe a été modifié
    if (!this.isModified('password')) return next();
    
    try {
        // Hasher le mot de passe avec salt de 12
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) {
        throw new Error('Mot de passe non défini pour cet utilisateur');
    }
    return await bcrypt.compare(candidatePassword, this.password);
};

// Méthode pour incrémenter les tentatives de connexion échouées
userSchema.methods.incLoginAttempts = function() {
    // Si on a une date de verrouillage et qu'elle est passée, reset les compteurs
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }
    
    const updates = { $inc: { loginAttempts: 1 } };
    
    // Si on atteint 5 tentatives et qu'on n'est pas déjà verrouillé, verrouiller
    const maxAttempts = 5;
    const lockTime = 2 * 60 * 60 * 1000; // 2 heures
    
    if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + lockTime };
    }
    
    return this.updateOne(updates);
};

// Méthode pour reset les tentatives après connexion réussie
userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 },
        $set: { lastLogin: new Date() }
    });
};

// Méthode pour obtenir les infos publiques de l'utilisateur
userSchema.methods.getPublicProfile = function() {
    return {
        id: this._id,
        username: this.username,
        email: this.email,
        firstName: this.firstName,
        lastName: this.lastName,
        role: this.role,
        isActive: this.isActive,
        lastLogin: this.lastLogin,
        createdAt: this.createdAt
    };
};

// Méthode statique pour trouver un utilisateur par email ou username
userSchema.statics.findByLogin = function(login) {
    return this.findOne({
        $or: [
            { email: login.toLowerCase() },
            { username: login }
        ]
    }).select('+password');
};

// Méthode statique pour créer un admin
userSchema.statics.createAdmin = async function(userData) {
    const admin = new this({
        ...userData,
        role: 'admin'
    });
    return await admin.save();
};

// Middleware pre-remove pour nettoyer les données associées
userSchema.pre('remove', async function(next) {
    try {
        // Supprimer la progression de l'utilisateur
        await mongoose.model('UserProgress').deleteOne({ userId: this._id });
        next();
    } catch (error) {
        next(error);
    }
});

// Transformer la sortie JSON pour enlever des champs sensibles
userSchema.methods.toJSON = function() {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.loginAttempts;
    delete userObject.lockUntil;
    return userObject;
};

module.exports = mongoose.model('User', userSchema); 