import api from './api';

const userService = {
  // Obtenir tous les utilisateurs (admin)
  getAllUsers: async () => {
    const response = await api.get('/users');
    return response;
  },

  // Obtenir un utilisateur par ID
  getUserById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response;
  },

  // Créer un nouvel utilisateur (admin)
  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response;
  },

  // Mettre à jour un utilisateur (admin)
  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response;
  },

  // Supprimer un utilisateur (admin)
  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response;
  },

  // Activer/désactiver un utilisateur (admin)
  toggleUserStatus: async (id) => {
    const response = await api.patch(`/users/${id}/toggle-status`);
    return response;
  },

  // Obtenir les statistiques des utilisateurs (admin)
  getUserStats: async () => {
    const response = await api.get('/users/stats');
    return response;
  },

  // Mettre à jour son propre profil
  updateProfile: async (userData) => {
    const response = await api.put('/users/profile', userData);
    return response;
  },

  // Changer son mot de passe
  changePassword: async (passwordData) => {
    const response = await api.put('/users/change-password', passwordData);
    return response;
  }
};

export default userService;








