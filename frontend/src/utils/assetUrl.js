/**
 * Utilitaires pour construire les URLs des assets statiques (thumbnails, vidéos)
 */

/**
 * Obtient l'URL de base pour les assets statiques
 * Les assets sont servis depuis le même domaine que l'API via Nginx
 */
const getBaseUrl = () => {
  // L'API URL est définie via REACT_APP_API_URL
  // Les assets sont accessibles directement via le domaine de base de l'API
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  
  // Si l'URL contient /api, on enlève /api pour obtenir le domaine de base
  if (apiUrl.includes('/api')) {
    return apiUrl.replace('/api', '');
  }
  
  // Sinon, on utilise l'URL telle quelle (pour localhost en dev)
  return apiUrl.replace(/\/api$/, '') || 'http://localhost:5000';
};

/**
 * Construit l'URL complète d'un asset (thumbnail, vidéo, etc.)
 * @param {string} relativePath - Chemin relatif de l'asset (ex: /thumbnails/...)
 * @returns {string} URL complète de l'asset
 */
export const getAssetUrl = (relativePath) => {
  if (!relativePath) {
    return null;
  }
  
  // Si c'est déjà une URL complète (commence par http), on la retourne telle quelle
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  
  // Construire l'URL complète avec le domaine de base
  const baseUrl = getBaseUrl();
  const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  
  return `${baseUrl}${normalizedPath}`;
};

/**
 * Construit l'URL complète d'un thumbnail
 * @param {string} thumbnailPath - Chemin relatif du thumbnail (ex: /thumbnails/...)
 * @returns {string} URL complète du thumbnail
 */
export const getThumbnailUrl = (thumbnailPath) => {
  return getAssetUrl(thumbnailPath);
};

/**
 * Construit l'URL complète d'une vidéo
 * @param {string} videoPath - Chemin relatif de la vidéo (ex: /videos/...)
 * @returns {string} URL complète de la vidéo
 */
export const getVideoUrl = (videoPath) => {
  return getAssetUrl(videoPath);
};

export default {
  getAssetUrl,
  getThumbnailUrl,
  getVideoUrl
};

