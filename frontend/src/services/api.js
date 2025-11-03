import axios from 'axios';
import toast from 'react-hot-toast';

// Configuration de base
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 secondes
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les réponses et erreurs
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const { response } = error;
    
    if (response) {
      switch (response.status) {
        case 401:
          // Token expiré ou invalide - juste nettoyer localStorage
          localStorage.removeItem('token');
          
          if (window.location.pathname !== '/login') {
            toast.error('Session expirée, veuillez vous reconnecter');
            window.location.href = '/login';
          }
          break;
          
        case 403:
          toast.error('Accès interdit');
          break;
          
        case 404:
          if (!error.config.url.includes('/health')) {
            toast.error('Ressource non trouvée');
          }
          break;
          
        case 429:
          toast.error('Trop de requêtes, veuillez patienter');
          break;
          
        case 500:
          toast.error('Erreur serveur, veuillez réessayer plus tard');
          break;
          
        default:
          if (response.data?.message) {
            toast.error(response.data.message);
          } else {
            toast.error('Une erreur inattendue s\'est produite');
          }
      }
    } else if (error.code === 'NETWORK_ERROR') {
      toast.error('Erreur de connexion au serveur');
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Requête expirée, veuillez réessayer');
    } else {
      toast.error('Erreur de connexion');
    }
    
    return Promise.reject(error);
  }
);

// Fonction utilitaire pour créer des FormData
export const createFormData = (data) => {
  const formData = new FormData();
  
  Object.keys(data).forEach(key => {
    const value = data[key];
    
    if (value instanceof File) {
      formData.append(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'object') {
          formData.append(`${key}[${index}]`, JSON.stringify(item));
        } else {
          formData.append(`${key}[${index}]`, item);
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, value);
    }
  });
  
  return formData;
};

// Fonction pour uploader des fichiers avec progress
export const uploadWithProgress = (url, data, onProgress) => {
  const formData = createFormData(data);
  
  return api.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });
};

// Fonction pour télécharger des fichiers
export const downloadFile = async (url, filename) => {
  try {
    const response = await api.get(url, {
      responseType: 'blob',
    });
    
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    return true;
  } catch (error) {
    toast.error('Erreur lors du téléchargement');
    return false;
  }
};

// Fonction pour vérifier la santé de l'API
export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response;
  } catch (error) {
    return null;
  }
};

export default api; 