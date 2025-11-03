const Quiz = require('../models/Quiz');
const Video = require('../models/Video');

// Créer un nouveau quiz
const createQuiz = async (quizData, userId) => {
    try {
        // Vérifier que la vidéo existe
        const video = await Video.findById(quizData.videoId);
        if (!video) {
            throw new Error('Vidéo introuvable');
        }

        // Vérifier s'il existe déjà un quiz actif pour cette vidéo
        const existingQuiz = await Quiz.findOne({ videoId: quizData.videoId, isActive: true });
        if (existingQuiz) {
            throw new Error('Un quiz actif existe déjà pour cette vidéo');
        }

        // Si un quiz inactif existe, le supprimer pour éviter les conflits
        const inactiveQuiz = await Quiz.findOne({ videoId: quizData.videoId, isActive: false });
        if (inactiveQuiz) {
            console.log(`⚠️ Suppression d'un quiz inactif existant pour cette vidéo: ${inactiveQuiz._id}`);
            // Nettoyer la référence dans la vidéo
            if (video.quizId && video.quizId.toString() === inactiveQuiz._id.toString()) {
                await Video.findByIdAndUpdate(quizData.videoId, { $unset: { quizId: "" } });
            }
            await Quiz.findByIdAndDelete(inactiveQuiz._id);
            console.log(`✅ Quiz inactif supprimé`);
        }

        // Ajouter les informations de création
        const quiz = new Quiz({
            ...quizData,
            createdBy: userId,
            updatedBy: userId
        });

        // Valider le quiz avant sauvegarde
        const validationErrors = quiz.validateQuiz();
        if (validationErrors.length > 0) {
            throw new Error(`Erreurs de validation: ${validationErrors.join(', ')}`);
        }

        await quiz.save();
        
        // Mettre à jour la vidéo avec le quizId
        await Video.findByIdAndUpdate(quizData.videoId, { quizId: quiz._id });
        console.log(`✅ Vidéo ${quizData.videoId} mise à jour avec quizId: ${quiz._id}`);
        
        return quiz;
    } catch (error) {
        throw error;
    }
};

// Récupérer tous les quiz
const getAllQuizzes = async (filters = {}, includeInactive = false) => {
    try {
        const query = { ...filters };
        
        if (filters.videoId) {
            query.videoId = filters.videoId;
        }
        
        if (filters.difficulty) {
            query.difficulty = filters.difficulty;
        }
        
        // Par défaut, ne retourner que les quiz actifs sauf si includeInactive est true
        if (filters.isActive !== undefined) {
            query.isActive = filters.isActive;
        } else if (!includeInactive) {
            // Si aucun filtre isActive n'est spécifié et qu'on ne veut pas les inactifs, filtrer par défaut
            query.isActive = true;
        }
        
        if (filters.tags && filters.tags.length > 0) {
            query.tags = { $in: filters.tags };
        }

        const quizzes = await Quiz.find(query)
            .populate('videoId', 'title thumbnailUrl isPublished')
            .populate('createdBy', 'username firstName lastName')
            .populate('updatedBy', 'username firstName lastName')
            .sort({ createdAt: -1 });

        // Filtrer les quiz avec des vidéos publiées pour les utilisateurs normaux
        // Les admins verront tous les quiz
        const filteredQuizzes = quizzes.filter(quiz => {
            // Si la vidéo n'existe pas ou n'est pas publiée, exclure le quiz pour les utilisateurs
            if (!quiz.videoId) {
                return false;
            }
            // Si includeInactive est false (utilisateurs normaux), ne retourner que les quiz avec vidéos publiées
            if (!includeInactive && !quiz.videoId.isPublished) {
                return false;
            }
            return true;
        });

        return filteredQuizzes;
    } catch (error) {
        throw error;
    }
};

// Récupérer un quiz par ID
const getQuizById = async (quizId, includeAnswers = false) => {
    try {
        const quiz = await Quiz.findById(quizId)
            .populate('videoId', 'title thumbnailUrl duration')
            .populate('createdBy', 'username firstName lastName')
            .populate('updatedBy', 'username firstName lastName');

        if (!quiz) {
            throw new Error('Quiz introuvable');
        }

        // Convertir en objet pour inclure les virtuals
        const quizObj = quiz.toObject({ virtuals: true });

        // Si on ne veut pas inclure les réponses, les masquer
        if (!includeAnswers) {
            quizObj.questions = quizObj.questions.map(question => {
                const q = { ...question };
                delete q.correctAnswer;
                if (q.options) {
                    q.options = q.options.map(option => ({
                        _id: option._id,
                        text: option.text
                        // Ne pas inclure isCorrect
                    }));
                }
                return q;
            });
        }

        return quizObj;
    } catch (error) {
        throw error;
    }
};

// Récupérer un quiz par ID de vidéo
const getQuizByVideoId = async (videoId, includeAnswers = false) => {
    try {
        const quiz = await Quiz.findOne({ videoId, isActive: true })
            .populate('videoId', 'title thumbnailUrl duration')
            .populate('createdBy', 'username firstName lastName');

        if (!quiz) {
            throw new Error('Aucun quiz trouvé pour cette vidéo');
        }

        // Convertir en objet pour inclure les virtuals
        const quizObj = quiz.toObject({ virtuals: true });

        // Si on ne veut pas inclure les réponses, les masquer
        if (!includeAnswers) {
            quizObj.questions = quizObj.questions.map(question => {
                const q = { ...question };
                delete q.correctAnswer;
                if (q.options) {
                    q.options = q.options.map(option => ({
                        _id: option._id,
                        text: option.text
                    }));
                }
                return q;
            });
        }

        return quizObj;
    } catch (error) {
        throw error;
    }
};

// Mettre à jour un quiz
const updateQuiz = async (quizId, updateData, userId) => {
    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            throw new Error('Quiz introuvable');
        }

        // Vérifier que l'utilisateur peut modifier ce quiz
        if (quiz.createdBy.toString() !== userId.toString()) {
            throw new Error('Vous n\'êtes pas autorisé à modifier ce quiz');
        }

        // Si le videoId change, gérer la mise à jour des références
        const oldVideoId = quiz.videoId;
        const newVideoId = updateData.videoId;
        
        if (newVideoId && oldVideoId.toString() !== newVideoId.toString()) {
            // Supprimer le quizId de l'ancienne vidéo
            await Video.findByIdAndUpdate(oldVideoId, { $unset: { quizId: "" } });
            console.log(`✅ Ancien quizId supprimé de la vidéo ${oldVideoId}`);
            
            // Ajouter le quizId à la nouvelle vidéo
            await Video.findByIdAndUpdate(newVideoId, { quizId: quizId });
            console.log(`✅ Nouvelle vidéo ${newVideoId} mise à jour avec quizId: ${quizId}`);
        }

        // Ajouter l'information de mise à jour
        updateData.updatedBy = userId;

        // Mettre à jour le quiz
        const updatedQuiz = await Quiz.findByIdAndUpdate(
            quizId,
            updateData,
            { new: true, runValidators: true }
        ).populate('videoId', 'title thumbnailUrl')
         .populate('createdBy', 'username firstName lastName')
         .populate('updatedBy', 'username firstName lastName');

        return updatedQuiz;
    } catch (error) {
        throw error;
    }
};

// Supprimer un quiz
const deleteQuiz = async (quizId, userId) => {
    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            throw new Error('Quiz introuvable');
        }

        // Vérifier que l'utilisateur peut supprimer ce quiz
        if (quiz.createdBy.toString() !== userId.toString()) {
            throw new Error('Vous n\'êtes pas autorisé à supprimer ce quiz');
        }

        // Supprimer le quizId de la vidéo associée
        if (quiz.videoId) {
            await Video.findByIdAndUpdate(quiz.videoId, { $unset: { quizId: "" } });
            console.log(`✅ QuizId supprimé de la vidéo ${quiz.videoId}`);
        }

        await Quiz.findByIdAndDelete(quizId);
        return { message: 'Quiz supprimé avec succès' };
    } catch (error) {
        throw error;
    }
};

// Évaluer les réponses d'un quiz
const evaluateQuiz = async (quizId, answers, userId) => {
    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            throw new Error('Quiz introuvable');
        }

        if (!quiz.isActive) {
            throw new Error('Ce quiz n\'est plus actif');
        }

        const results = [];
        let totalScore = 0;
        let totalPoints = 0;

        // Évaluer chaque question
        for (const question of quiz.questions) {
            totalPoints += question.points;
            const userAnswer = answers[question._id.toString()];

            console.log(`🔍 Évaluation question ${question._id}:`);
            console.log(`   - Question: ${question.question}`);
            console.log(`   - Type: ${question.type}`);
            console.log(`   - Réponse utilisateur: ${userAnswer} (type: ${typeof userAnswer})`);
            console.log(`   - Points possibles: ${question.points}`);

            if (userAnswer === undefined) {
                console.log(`   - ❌ Question non répondue`);
                // Question non répondue
                results.push({
                    questionId: question._id,
                    question: question.question,
                    isCorrect: false,
                    points: 0,
                    userAnswer: null,
                    correctAnswer: question.correctAnswer,
                    explanation: question.explanation,
                    skipped: true
                });
                continue;
            }

            let isCorrect = false;
            let earnedPoints = 0;

            // Évaluer selon le type de question
            switch (question.type) {
                case 'multiple-choice':
                    console.log(`   - Options disponibles:`);
                    question.options.forEach(opt => {
                        console.log(`     * ${opt._id} (${opt.text}) - Correct: ${opt.isCorrect}`);
                    });
                    
                    if (Array.isArray(userAnswer)) {
                        // Réponses multiples
                        const correctOptions = question.options
                            .filter(opt => opt.isCorrect)
                            .map(opt => opt._id.toString());
                        
                        isCorrect = correctOptions.length === userAnswer.length &&
                                   correctOptions.every(id => userAnswer.includes(id));
                    } else {
                        // Réponse unique
                        const correctOption = question.options.find(opt => opt.isCorrect);
                        console.log(`   - Option correcte: ${correctOption ? correctOption._id : 'Aucune'}`);
                        console.log(`   - Comparaison: "${correctOption ? correctOption._id.toString() : 'undefined'}" === "${userAnswer}"`);
                        isCorrect = correctOption && correctOption._id.toString() === userAnswer;
                    }
                    console.log(`   - Résultat: ${isCorrect ? '✅ Correct' : '❌ Incorrect'}`);
                    break;

                case 'true-false':
                    isCorrect = userAnswer === question.correctAnswer;
                    break;

                case 'text-input':
                    // Comparaison insensible à la casse et aux espaces
                    const normalizedUserAnswer = userAnswer.toString().toLowerCase().trim();
                    const normalizedCorrectAnswer = question.correctAnswer.toString().toLowerCase().trim();
                    isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;
                    break;

                default:
                    throw new Error(`Type de question non supporté: ${question.type}`);
            }

            if (isCorrect) {
                earnedPoints = question.points;
                totalScore += question.points;
            }

            results.push({
                questionId: question._id,
                question: question.question,
                isCorrect,
                points: earnedPoints,
                userAnswer,
                correctAnswer: question.correctAnswer,
                explanation: question.explanation,
                skipped: false
            });
        }

        // Calculer le pourcentage et déterminer si le quiz est réussi
        const percentage = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;
        const passed = percentage >= quiz.passingScore;

        console.log(`📊 Évaluation du quiz ${quiz._id}:`);
        console.log(`   - Score obtenu: ${totalScore}/${totalPoints} points`);
        console.log(`   - Pourcentage: ${percentage}%`);
        console.log(`   - Score requis: ${quiz.passingScore}%`);
        console.log(`   - Quiz réussi: ${passed}`);

        return {
            quizId: quiz._id,
            userId,
            results,
            totalScore,
            totalPoints,
            percentage,
            passed,
            passingScore: quiz.passingScore,
            completedAt: new Date()
        };
    } catch (error) {
        throw error;
    }
};

// Récupérer les statistiques d'un quiz
const getQuizStats = async (quizId) => {
    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            throw new Error('Quiz introuvable');
        }

        // Ici on pourrait ajouter des statistiques de performance
        // Pour l'instant, retournons les informations de base
        return {
            quizId: quiz._id,
            title: quiz.title,
            questionCount: quiz.questionCount,
            totalPoints: quiz.totalPoints,
            passingScore: quiz.passingScore,
            difficulty: quiz.difficulty,
            isActive: quiz.isActive,
            createdAt: quiz.createdAt,
            updatedAt: quiz.updatedAt
        };
    } catch (error) {
        throw error;
    }
};

// Activer/désactiver un quiz
const toggleQuizStatus = async (quizId, userId) => {
    try {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            throw new Error('Quiz introuvable');
        }

        // Vérifier que l'utilisateur peut modifier ce quiz
        if (quiz.createdBy.toString() !== userId.toString()) {
            throw new Error('Vous n\'êtes pas autorisé à modifier ce quiz');
        }

        quiz.isActive = !quiz.isActive;
        quiz.updatedBy = userId;
        await quiz.save();

        return {
            message: `Quiz ${quiz.isActive ? 'activé' : 'désactivé'} avec succès`,
            isActive: quiz.isActive
        };
    } catch (error) {
        throw error;
    }
};

// Rechercher des quiz
const searchQuizzes = async (searchTerm, filters = {}, includeInactive = false) => {
    try {
        const query = { ...filters };
        
        // Par défaut, ne retourner que les quiz actifs sauf si includeInactive est true
        if (filters.isActive !== undefined) {
            query.isActive = filters.isActive;
        } else if (!includeInactive) {
            query.isActive = true;
        }
        
        if (searchTerm) {
            query.$or = [
                { title: { $regex: searchTerm, $options: 'i' } },
                { description: { $regex: searchTerm, $options: 'i' } },
                { tags: { $in: [new RegExp(searchTerm, 'i')] } }
            ];
        }

        const quizzes = await Quiz.find(query)
            .populate('videoId', 'title thumbnailUrl isPublished')
            .populate('createdBy', 'username firstName lastName')
            .sort({ createdAt: -1 });

        // Filtrer les quiz avec des vidéos publiées pour les utilisateurs normaux
        const filteredQuizzes = quizzes.filter(quiz => {
            if (!quiz.videoId) {
                return false;
            }
            // Si includeInactive est false (utilisateurs normaux), ne retourner que les quiz avec vidéos publiées
            if (!includeInactive && !quiz.videoId.isPublished) {
                return false;
            }
            return true;
        });

        return filteredQuizzes;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    createQuiz,
    getAllQuizzes,
    getQuizById,
    getQuizByVideoId,
    updateQuiz,
    deleteQuiz,
    evaluateQuiz,
    getQuizStats,
    toggleQuizStatus,
    searchQuizzes
};
