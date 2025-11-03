import axios from 'axios';

// Configuration de base d'axios
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('🔐 Token trouvé:', token ? 'OUI' : 'NON');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('📤 En-tête Authorization ajouté:', config.headers.Authorization);
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
    return response;
  },
  (error) => {
    // Si l'erreur est 401 (non autorisé), rediriger vers login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Fonction pour obtenir l'instance API configurée
export const getApi = () => {
  return api;
};

// Fonction pour créer une nouvelle instance API avec des options personnalisées
export const createApi = (options = {}) => {
  return axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
};

// Fonction pour faire un appel GET
export const apiGet = async (url, config = {}) => {
  try {
    const response = await api.get(url, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Fonction pour faire un appel POST
export const apiPost = async (url, data = {}, config = {}) => {
  try {
    const response = await api.post(url, data, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Fonction pour faire un appel PUT
export const apiPut = async (url, data = {}, config = {}) => {
  try {
    const response = await api.put(url, data, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Fonction pour faire un appel DELETE
export const apiDelete = async (url, config = {}) => {
  try {
    const response = await api.delete(url, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Fonction pour faire un appel PATCH
export const apiPatch = async (url, data = {}, config = {}) => {
  try {
    const response = await api.patch(url, data, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Fonction pour télécharger un fichier
export const apiDownload = async (url, filename, config = {}) => {
  try {
    const response = await api.get(url, {
      ...config,
      responseType: 'blob',
    });
    
    // Créer un lien de téléchargement
    const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Fonction pour uploader un fichier
export const apiUpload = async (url, formData, config = {}) => {
  try {
    const response = await api.post(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config.headers,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Fonction pour vérifier si l'utilisateur est connecté
export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return !!token;
};

// Fonction pour obtenir le token
export const getToken = () => {
  return localStorage.getItem('token');
};

// Fonction pour définir le token
export const setToken = (token) => {
  localStorage.setItem('token', token);
};

// Fonction pour supprimer le token
export const removeToken = () => {
  localStorage.removeItem('token');
};

// Fonction pour rafraîchir le token (si nécessaire)
export const refreshToken = async () => {
  try {
    const response = await api.post('/api/auth/refresh');
    const { token } = response.data;
    setToken(token);
    return token;
  } catch (error) {
    removeToken();
    throw error;
  }
};

export default api;
