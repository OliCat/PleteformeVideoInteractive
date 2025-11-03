const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => Date.now().toString()
  },
  question: {
    type: String,
    required: [true, 'La question est requise'],
    trim: true,
    maxlength: [500, 'La question ne peut pas dépasser 500 caractères']
  },
  type: {
    type: String,
    enum: ['multiple-choice', 'true-false', 'text-input'],
    default: 'multiple-choice',
    required: true
  },
  options: [{
    _id: {
      type: String,
      default: () => Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9)
    },
    text: {
      type: String,
      required: [true, 'Le texte de l\'option est requis'],
      trim: true,
      maxlength: [200, 'L\'option ne peut pas dépasser 200 caractères']
    },
    isCorrect: {
      type: Boolean,
      default: false
    },
    explanation: {
      type: String,
      trim: true,
      maxlength: [300, 'L\'explication ne peut pas dépasser 300 caractères']
    }
  }],
  correctAnswer: {
    type: String,
    trim: true,
    maxlength: [200, 'La réponse correcte ne peut pas dépasser 200 caractères']
  },
  points: {
    type: Number,
    default: 1,
    min: [1, 'Les points doivent être au minimum de 1'],
    max: [10, 'Les points ne peuvent pas dépasser 10']
  },
  timeLimit: {
    type: Number,
    default: 30,
    min: [5, 'Le temps limite doit être au minimum de 5 secondes'],
    max: [300, 'Le temps limite ne peut pas dépasser 5 minutes']
  },
  order: {
    type: Number,
    required: true,
    min: 1
  }
});

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Le titre du quiz est requis'],
    trim: true,
    maxlength: [100, 'Le titre ne peut pas dépasser 100 caractères']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: [true, 'L\'ID de la vidéo est requis']
  },
  questions: [questionSchema],
  difficulty: {
    type: String,
    enum: ['facile', 'intermédiaire', 'difficile'],
    default: 'intermédiaire'
  },
  passingScore: {
    type: Number,
    required: true,
    min: [1, 'Le score de passage doit être au minimum de 1'],
    max: [100, 'Le score de passage ne peut pas dépasser 100']
  },
  timeLimit: {
    type: Number,
    default: 0, // 0 = pas de limite de temps
    min: [0, 'La limite de temps ne peut pas être négative'],
    max: [3600, 'La limite de temps ne peut pas dépasser 1 heure']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isRandomized: {
    type: Boolean,
    default: false
  },
  allowRetake: {
    type: Boolean,
    default: true
  },
  maxAttempts: {
    type: Number,
    default: 3,
    min: [1, 'Le nombre maximum de tentatives doit être au minimum de 1'],
    max: [10, 'Le nombre maximum de tentatives ne peut pas dépasser 10']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Un tag ne peut pas dépasser 50 caractères']
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour améliorer les performances
quizSchema.index({ videoId: 1 });
quizSchema.index({ createdBy: 1 });
quizSchema.index({ isActive: 1 });
quizSchema.index({ difficulty: 1 });
quizSchema.index({ tags: 1 });

// Virtual pour calculer le score total possible
quizSchema.virtual('totalPoints').get(function() {
  return this.questions && Array.isArray(this.questions) 
    ? this.questions.reduce((total, question) => total + (question.points || 0), 0)
    : 0;
});

// Virtual pour calculer le nombre de questions
quizSchema.virtual('questionCount').get(function() {
  return this.questions && Array.isArray(this.questions) 
    ? this.questions.length 
    : 0;
});

// Méthode pour vérifier si un score est suffisant pour passer
quizSchema.methods.isPassingScore = function(score) {
  const percentage = (score / this.totalPoints) * 100;
  return percentage >= this.passingScore;
};

// Méthode pour mélanger les questions (si randomisé)
quizSchema.methods.getRandomizedQuestions = function() {
  if (!this.isRandomized) {
    return this.questions;
  }
  
  const shuffled = [...this.questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
};

// Méthode pour valider la cohérence du quiz
quizSchema.methods.validateQuiz = function() {
  const errors = [];
  
  if (this.questions.length === 0) {
    errors.push('Le quiz doit contenir au moins une question');
  }
  
  if (this.passingScore > this.totalPoints) {
    errors.push('Le score de passage ne peut pas dépasser le score total possible');
  }
  
  // Valider chaque question
  this.questions.forEach((question, index) => {
    if (question.type === 'multiple-choice') {
      if (!question.options || question.options.length < 2) {
        errors.push(`Question ${index + 1}: Les questions à choix multiples doivent avoir au moins 2 options`);
      }
      
      const correctOptions = question.options.filter(opt => opt.isCorrect);
      if (correctOptions.length === 0) {
        errors.push(`Question ${index + 1}: Au moins une option doit être marquée comme correcte`);
      }
    }
    
    if (question.type === 'true-false') {
      if (question.options.length !== 2) {
        errors.push(`Question ${index + 1}: Les questions vrai/faux doivent avoir exactement 2 options`);
      }
    }
  });
  
  return errors;
};

// Middleware pre-save pour valider le quiz
quizSchema.pre('save', function(next) {
  const errors = this.validateQuiz();
  if (errors.length > 0) {
    return next(new Error(`Erreurs de validation du quiz: ${errors.join(', ')}`));
  }
  next();
});

// Méthode statique pour trouver les quiz actifs
quizSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

// Méthode statique pour trouver les quiz par vidéo
quizSchema.statics.findByVideo = function(videoId) {
  return this.find({ videoId, isActive: true });
};

// Méthode statique pour trouver les quiz par difficulté
quizSchema.statics.findByDifficulty = function(difficulty) {
  return this.find({ difficulty, isActive: true });
};

module.exports = mongoose.model('Quiz', quizSchema); 