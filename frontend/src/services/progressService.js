import api from './api';

const progressService = {
  // Obtenir la progression de l'utilisateur connecté
  getUserProgress: async () => {
    const response = await api.get('/progress');
    return response;
  },

  // Obtenir la progression d'un utilisateur spécifique (admin)
  getUserProgressById: async (userId) => {
    const response = await api.get(`/progress/user/${userId}`);
    return response;
  },

  // Enregistrer une session de visionnage
  recordWatchSession: async (sessionData) => {
    const { videoId, startTime, endTime, duration } = sessionData;
    const response = await api.post('/progress/watch-session', {
      videoId,
      startTime,
      endTime,
      duration,
    });
    return response;
  },

  // Marquer une vidéo comme terminée
  completeVideo: async (videoId) => {
    const response = await api.post(`/progress/complete-video/${videoId}`);
    return response;
  },

  // Obtenir les statistiques de progression
  getProgressStats: async () => {
    const response = await api.get('/progress/stats');
    return response;
  },

  // Obtenir les statistiques de progression d'un utilisateur (admin)
  getUserProgressStats: async (userId) => {
    const response = await api.get(`/progress/stats/${userId}`);
    return response;
  },

  // Obtenir la progression de tous les utilisateurs (admin)
  getAllUsersProgress: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/progress/all?${queryString}`);
    return response;
  },

  // Obtenir les statistiques globales de la plateforme (admin)
  getGlobalStats: async () => {
    const response = await api.get('/progress/global-stats');
    return response;
  },

  // Obtenir le temps de visionnage détaillé pour une vidéo
  getVideoWatchTime: async (videoId, userId = null) => {
    const url = userId 
      ? `/progress/video/${videoId}/watch-time?userId=${userId}`
      : `/progress/video/${videoId}/watch-time`;
    const response = await api.get(url);
    return response;
  },

  // Obtenir l'historique de progression d'un utilisateur
  getProgressHistory: async (userId = null, days = 30) => {
    const url = userId 
      ? `/progress/history?userId=${userId}&days=${days}`
      : `/progress/history?days=${days}`;
    const response = await api.get(url);
    return response;
  },

  // Réinitialiser la progression d'un utilisateur (admin)
  resetUserProgress: async (userId) => {
    const response = await api.delete(`/progress/user/${userId}`);
    return response;
  },

  // Obtenir le classement des utilisateurs
  getUsersLeaderboard: async (limit = 10, timeframe = 'all') => {
    const response = await api.get(`/progress/leaderboard?limit=${limit}&timeframe=${timeframe}`);
    return response;
  },

  // Obtenir les statistiques d'activité récente
  getRecentActivity: async (days = 7) => {
    const response = await api.get(`/progress/recent-activity?days=${days}`);
    return response;
  },

  // Obtenir le rapport de progression (admin)
  getProgressReport: async (startDate, endDate, userId = null) => {
    const params = { startDate, endDate };
    if (userId) params.userId = userId;
    
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/progress/report?${queryString}`);
    return response;
  },

  // Exporter les données de progression (admin)
  exportProgressData: async (format = 'csv', filters = {}) => {
    const params = { format, ...filters };
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/progress/export?${queryString}`, {
      responseType: 'blob',
    });
    return response;
  },

  // Obtenir les statistiques par vidéo (admin)
  getVideoProgressStats: async (videoId) => {
    const response = await api.get(`/progress/video/${videoId}/stats`);
    return response;
  },

  // Obtenir la position de lecture sauvegardée
  getVideoPosition: async (videoId) => {
    const response = await api.get(`/progress/video/${videoId}/position`);
    return response;
  },

  // Sauvegarder la position de lecture
  saveVideoPosition: async (videoId, position) => {
    const response = await api.post(`/progress/video/${videoId}/position`, {
      position,
    });
    return response;
  },

  // Obtenir les métriques d'engagement
  getEngagementMetrics: async (timeframe = 'week') => {
    const response = await api.get(`/progress/engagement?timeframe=${timeframe}`);
    return response;
  },

  // Obtenir les taux de completion par vidéo
  getCompletionRates: async () => {
    const response = await api.get('/progress/completion-rates');
    return response;
  },

  // Obtenir le temps moyen de visionnage par vidéo
  getAverageWatchTimes: async () => {
    const response = await api.get('/progress/average-watch-times');
    return response;
  },

  // Obtenir les points d'abandon les plus fréquents
  getDropOffPoints: async (videoId) => {
    const response = await api.get(`/progress/video/${videoId}/drop-off-points`);
    return response;
  },

  // Marquer un quiz comme tenté (utilisé par le quizService)
  recordQuizAttempt: async (quizId, score, passed, timeSpent) => {
    const response = await api.post('/progress/quiz-attempt', {
      quizId,
      score,
      passed,
      timeSpent,
    });
    return response;
  },

  // Obtenir les badges/achievements d'un utilisateur
  getUserAchievements: async (userId = null) => {
    const url = userId 
      ? `/progress/achievements?userId=${userId}`
      : '/progress/achievements';
    const response = await api.get(url);
    return response;
  },

  // Calculer et attribuer les nouveaux badges
  calculateAchievements: async (userId = null) => {
    const url = userId 
      ? `/progress/calculate-achievements?userId=${userId}`
      : '/progress/calculate-achievements';
    const response = await api.post(url);
    return response;
  },
};

export default progressService; 