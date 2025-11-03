import api, { uploadWithProgress } from './api';
import axios from 'axios';

const videoService = {
  // Obtenir toutes les vidéos (admin)
  getAllVideos: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/videos?${queryString}`);
    return response.data; // Retourner les données directement
  },

  // Obtenir les vidéos accessibles à l'utilisateur
  getAccessibleVideos: async () => {
    const response = await api.get('/videos/accessible');
    return response.data; // Retourner les données directement
  },

  // Obtenir une vidéo par ID
  getVideoById: async (id) => {
    const response = await api.get(`/videos/${id}`);
    return response.data; // Retourner les données directement
  },

  // Upload d'une vidéo
  uploadVideo: async (formData, onProgress) => {
    // Créer une instance axios séparée pour l'upload sans les headers par défaut
    const uploadApi = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
      timeout: 3600000, // 1 heure pour upload + transcodage vidéo
    });

    // Ajouter le token d'authentification
    const token = localStorage.getItem('token');
    if (token) {
      uploadApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    return uploadApi.post('/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(progressEvent);
        }
      },
    });
  },

  // Créer une nouvelle vidéo
  createVideo: async (videoData, onProgress) => {
    if (videoData.videoFile) {
      // Upload avec progress pour les fichiers vidéo
      return uploadWithProgress('/videos', videoData, onProgress);
    } else {
      // Mise à jour des métadonnées seulement
      const response = await api.post('/videos', videoData);
      return response;
    }
  },

  // Mettre à jour une vidéo
  updateVideo: async (id, videoData, onProgress) => {
    if (videoData.videoFile) {
      // Upload avec progress pour les nouveaux fichiers
      return uploadWithProgress(`/videos/${id}`, videoData, onProgress);
    } else {
      // Mise à jour des métadonnées seulement
      const response = await api.put(`/videos/${id}`, videoData);
      return response;
    }
  },

  // Supprimer une vidéo
  deleteVideo: async (id) => {
    const response = await api.delete(`/videos/${id}`);
    return response;
  },

  // Publier/dépublier une vidéo
  toggleVideoPublication: async (id, isPublished) => {
    const response = await api.patch(`/videos/${id}/publication`, {
      isPublished,
    });
    return response;
  },

  // Réorganiser l'ordre des vidéos
  reorderVideos: async (videoOrders) => {
    const response = await api.put('/videos/reorder', { videoOrders });
    return response;
  },

  // Incrémenter le compteur de vues
  incrementViewCount: async (id) => {
    const response = await api.post(`/videos/${id}/view`);
    return response;
  },

  // Obtenir les statistiques d'une vidéo
  getVideoStats: async (id) => {
    const response = await api.get(`/videos/${id}/stats`);
    return response;
  },

  // Obtenir l'URL de streaming sécurisée
  getStreamingUrl: async (id) => {
    const response = await api.get(`/videos/${id}/stream`);
    return response;
  },

  // Obtenir les informations de traitement d'une vidéo
  getProcessingStatus: async (id) => {
    const response = await api.get(`/videos/${id}/processing`);
    return response;
  },

  // Relancer le traitement d'une vidéo
  retryProcessing: async (id) => {
    const response = await api.post(`/videos/${id}/retry-processing`);
    return response;
  },

  // Obtenir les miniatures disponibles
  getThumbnails: async (id) => {
    const response = await api.get(`/videos/${id}/thumbnails`);
    return response;
  },

  // Générer une nouvelle miniature
  generateThumbnail: async (id, timestamp) => {
    const response = await api.post(`/videos/${id}/thumbnail`, {
      timestamp,
    });
    return response;
  },

  // Obtenir les qualités vidéo disponibles
  getVideoQualities: async (id) => {
    const response = await api.get(`/videos/${id}/qualities`);
    return response;
  },

  // Rechercher des vidéos
  searchVideos: async (query, filters = {}) => {
    const params = { q: query, ...filters };
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/videos/search?${queryString}`);
    return response;
  },

  // Obtenir les vidéos similaires
  getSimilarVideos: async (id, limit = 5) => {
    const response = await api.get(`/videos/${id}/similar?limit=${limit}`);
    return response;
  },

  // Exporter les données des vidéos (admin)
  exportVideosData: async (format = 'json') => {
    const response = await api.get(`/videos/export?format=${format}`, {
      responseType: 'blob',
    });
    return response;
  },

  // Importer des vidéos en lot (admin)
  bulkImportVideos: async (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return uploadWithProgress('/videos/bulk-import', { file }, onProgress);
  },

  // Vérifier l'accessibilité d'une vidéo
  checkVideoAccess: async (id) => {
    const response = await api.get(`/videos/${id}/access`);
    return response;
  },

  // Obtenir la prochaine vidéo dans le parcours
  getNextVideo: async (currentVideoId) => {
    const response = await api.get(`/videos/${currentVideoId}/next`);
    return response;
  },

  // Obtenir la vidéo précédente dans le parcours
  getPreviousVideo: async (currentVideoId) => {
    const response = await api.get(`/videos/${currentVideoId}/previous`);
    return response;
  },

  // Obtenir le parcours d'apprentissage complet
  getLearningPath: async () => {
    const response = await api.get('/videos/learning-path');
    return response;
  },

  // Réordonner les vidéos
  reorderVideos: async (videoId, direction) => {
    const response = await api.patch(`/videos/${videoId}/reorder`, { direction });
    return response;
  },
};

export default videoService; 