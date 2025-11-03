import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Search,
  Filter,
  MoreVertical,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Mail,
  Calendar
} from 'lucide-react';
import { fetchUsers, updateUser, deleteUser, toggleUserStatus } from '../../store/slices/usersSlice';
import toast from 'react-hot-toast';

const AdminUsers = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { users, isLoading, stats } = useSelector((state) => state.users);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Vérifier si l'utilisateur est admin
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-primary-red mx-auto mb-4" />
          <h2 className="h3-charte text-gray-900 mb-2 font-ginka">Accès refusé</h2>
          <p className="text-gray-600 font-ginka p-charte">Vous devez être administrateur pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      await dispatch(fetchUsers()).unwrap();
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${userEmail} ? Cette action est irréversible.`)) {
      return;
    }

    try {
      await dispatch(deleteUser(userId)).unwrap();
      toast.success('Utilisateur supprimé avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression de l\'utilisateur');
    }
  };

  const handleToggleStatus = async (userId, currentStatus, userEmail) => {
    try {
      await dispatch(toggleUserStatus(userId)).unwrap();
      toast.success(`Utilisateur ${currentStatus ? 'désactivé' : 'activé'} avec succès`);
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
      toast.error('Erreur lors du changement de statut de l\'utilisateur');
    }
  };

  const filteredUsers = users && Array.isArray(users) ? users.filter(user => {
    // Vérifier que les champs existent avant d'appeler toLowerCase()
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const email = user.email || '';
    const username = user.username || '';
    
    const matchesSearch = firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         username.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'active' && user.isActive) ||
                         (filterStatus === 'inactive' && !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  }) : [];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-red mx-auto mb-4"></div>
          <p className="text-gray-600 font-ginka p-charte">Chargement des utilisateurs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="h2-charte text-gray-900 font-ginka">Gestion des utilisateurs</h1>
              <p className="mt-2 text-gray-600 font-ginka p-charte">
                Administrez les comptes utilisateurs de la plateforme
              </p>
            </div>
            <button
              onClick={() => navigate('/admin/users/create')}
              className="btn-charte btn-charte-primary flex items-center space-x-2 px-4 py-2"
            >
              <UserPlus className="w-5 h-5" />
              <span>Ajouter un utilisateur</span>
            </button>
          </div>
        </div>

        {/* Statistiques */}
        {stats && (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-section-blue" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 font-ginka p-charte">Total utilisateurs</p>
                    <p className="text-2xl font-semibold text-gray-900 font-ginka h3-charte">{stats.total || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <UserCheck className="w-8 h-8 text-section-green" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 font-ginka p-charte">Utilisateurs actifs</p>
                    <p className="text-2xl font-semibold text-gray-900 font-ginka h3-charte">{stats.active || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-primary-red" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 font-ginka p-charte">Administrateurs</p>
                    <p className="text-2xl font-semibold text-gray-900 font-ginka h3-charte">{stats.admins || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Calendar className="w-8 h-8 text-section-yellow" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 font-ginka p-charte">Nouveaux ce mois</p>
                    <p className="text-2xl font-semibold text-gray-900 font-ginka h3-charte">{stats.newThisMonth || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtres et recherche */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-charte-media focus:ring-2 focus:ring-primary-red focus:border-primary-red font-ginka p-charte"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-charte-media focus:ring-2 focus:ring-primary-red focus:border-primary-red font-ginka p-charte"
              >
                <option value="all">Tous les rôles</option>
                <option value="admin">Administrateurs</option>
                <option value="user">Utilisateurs</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-charte-media focus:ring-2 focus:ring-primary-red focus:border-primary-red font-ginka p-charte"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
              </select>
            </div>
          </div>
        </div>

        {/* Liste des utilisateurs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Users className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2 font-ginka h4-charte">
                {searchTerm || filterRole !== 'all' || filterStatus !== 'all' ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur'}
              </h3>
              <p className="text-gray-500 mb-4 font-ginka p-charte">
                {searchTerm || filterRole !== 'all' || filterStatus !== 'all'
                  ? 'Essayez de modifier vos critères de recherche'
                  : 'Commencez par ajouter votre premier utilisateur'
                }
              </p>
              {!searchTerm && filterRole === 'all' && filterStatus === 'all' && (
                <button
                  onClick={() => navigate('/admin/users/create')}
                  className="btn-charte btn-charte-primary flex items-center space-x-2 px-4 py-2 mx-auto"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Ajouter un utilisateur</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rôle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inscription
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 font-ginka h6-charte">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500 font-ginka p-charte">{user.email}</div>
                            <div className="text-sm text-gray-400 font-ginka p-charte">@{user.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full font-ginka ${
                          user.role === 'admin'
                            ? 'bg-red-50 text-primary-red'
                            : 'bg-blue-100 text-section-blue'
                        }`}>
                          {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full font-ginka ${
                          user.isActive
                            ? 'bg-green-100 text-section-green'
                            : 'bg-red-100 text-primary-red'
                        }`}>
                          {user.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleToggleStatus(user._id, user.isActive, user.email)}
                            className={`p-2 rounded-charte-media transition-colors ${
                              user.isActive
                                ? 'text-primary-red hover:bg-red-50'
                                : 'text-section-green hover:bg-green-50'
                            }`}
                            title={user.isActive ? 'Désactiver' : 'Activer'}
                          >
                            {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => navigate(`/admin/users/${user._id}/edit`)}
                            className="p-2 text-section-blue hover:bg-blue-50 rounded-charte-media transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {user.email !== 'admin@cooperative.local' && (
                            <button
                              onClick={() => handleDeleteUser(user._id, user.email)}
                              className="p-2 text-primary-red hover:bg-red-50 rounded-charte-media transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;








