import api from './api';

const quizService = {
  // Obtenir tous les quiz (admin)
  getAllQuizzes: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/quizzes?${queryString}`);
    return response;
  },

  // Obtenir un quiz par ID
  getQuizById: async (id) => {
    const response = await api.get(`/quizzes/${id}`);
    return response;
  },

  // Obtenir le quiz associé à une vidéo
  getQuizByVideoId: async (videoId) => {
    const response = await api.get(`/quizzes/video/${videoId}`);
    return response;
  },

  // Créer un nouveau quiz
  createQuiz: async (quizData) => {
    const response = await api.post('/quizzes', quizData);
    return response;
  },

  // Mettre à jour un quiz
  updateQuiz: async (id, quizData) => {
    const response = await api.put(`/quizzes/${id}`, quizData);
    return response;
  },

  // Supprimer un quiz
  deleteQuiz: async (id) => {
    const response = await api.delete(`/quizzes/${id}`);
    return response;
  },

  // Soumettre une tentative de quiz
  submitQuizAttempt: async (quizId, answers, timeSpent = 0) => {
    const response = await api.post(`/quizzes/${quizId}/attempt`, {
      answers,
      timeSpent,
    });
    return response;
  },

  // Obtenir les tentatives d'un utilisateur pour un quiz
  getQuizAttempts: async (quizId, userId = null) => {
    const url = userId 
      ? `/quizzes/${quizId}/attempts?userId=${userId}`
      : `/quizzes/${quizId}/attempts`;
    const response = await api.get(url);
    return response;
  },

  // Obtenir le meilleur score d'un utilisateur pour un quiz
  getBestScore: async (quizId, userId = null) => {
    const url = userId 
      ? `/quizzes/${quizId}/best-score?userId=${userId}`
      : `/quizzes/${quizId}/best-score`;
    const response = await api.get(url);
    return response;
  },

  // Obtenir les statistiques d'un quiz
  getQuizStats: async (id) => {
    const response = await api.get(`/quizzes/${id}/stats`);
    return response;
  },

  // Obtenir un quiz formaté pour l'utilisateur (sans réponses)
  getQuizForUser: async (id) => {
    const response = await api.get(`/quizzes/${id}/for-user`);
    return response;
  },

  // Vérifier si un utilisateur peut passer le quiz
  checkQuizAccess: async (id) => {
    const response = await api.get(`/quizzes/${id}/access`);
    return response;
  },

  // Obtenir l'historique complet des tentatives d'un utilisateur
  getUserQuizHistory: async (userId = null) => {
    const url = userId 
      ? `/quizzes/history?userId=${userId}`
      : '/quizzes/history';
    const response = await api.get(url);
    return response;
  },

  // Activer/désactiver un quiz
  toggleQuizStatus: async (id, isActive) => {
    const response = await api.patch(`/quizzes/${id}/status`, {
      isActive,
    });
    return response;
  },

  // Dupliquer un quiz
  duplicateQuiz: async (id) => {
    const response = await api.post(`/quizzes/${id}/duplicate`);
    return response;
  },

  // Importer des questions depuis un fichier
  importQuestions: async (quizId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(`/quizzes/${quizId}/import-questions`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  },

  // Exporter un quiz
  exportQuiz: async (id, format = 'json') => {
    const response = await api.get(`/quizzes/${id}/export?format=${format}`, {
      responseType: 'blob',
    });
    return response;
  },

  // Rechercher des quiz
  searchQuizzes: async (query, filters = {}) => {
    const params = { q: query, ...filters };
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/quizzes/search?${queryString}`);
    return response;
  },

  // Obtenir les statistiques globales des quiz (admin)
  getGlobalQuizStats: async () => {
    const response = await api.get('/quizzes/stats/global');
    return response;
  },

  // Obtenir le classement des utilisateurs pour un quiz
  getQuizLeaderboard: async (id, limit = 10) => {
    const response = await api.get(`/quizzes/${id}/leaderboard?limit=${limit}`);
    return response;
  },

  // Réinitialiser les tentatives d'un utilisateur pour un quiz (admin)
  resetUserAttempts: async (quizId, userId) => {
    const response = await api.delete(`/quizzes/${quizId}/attempts/${userId}`);
    return response;
  },

  // Obtenir les détails d'une tentative spécifique
  getAttemptDetails: async (quizId, attemptId) => {
    const response = await api.get(`/quizzes/${quizId}/attempts/${attemptId}`);
    return response;
  },

  // Valider les réponses d'un quiz (prévisualisation)
  previewQuizEvaluation: async (quizId, answers) => {
    const response = await api.post(`/quizzes/${quizId}/preview`, {
      answers,
    });
    return response;
  },

  // Obtenir des suggestions d'amélioration pour un quiz
  getQuizSuggestions: async (id) => {
    const response = await api.get(`/quizzes/${id}/suggestions`);
    return response;
  },
};

export default quizService; 