import React, { useEffect, useState } from 'react';
import { User, Mail, Calendar, Trophy } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { getUserProgress } from '../store/slices/progressSlice';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Profile = () => {
  const { user } = useSelector((state) => state.auth);
  const { userProgress } = useSelector((state) => state.progress);
  const [isEditing, setIsEditing] = useState(false);

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <LoadingSpinner message="Chargement du profil..." />
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Non défini';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getInitials = (user) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header du profil */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-8">
          <div className="flex items-center space-x-6">
            {/* Avatar */}
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-600">
                {getInitials(user)}
              </span>
            </div>

            {/* Informations utilisateur */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user.username || user.email
                }
              </h1>
              
              <div className="mt-2 space-y-1">
                <div className="flex items-center text-gray-600">
                  <User className="w-4 h-4 mr-2" />
                  <span>{user.username || 'Nom d\'utilisateur non défini'}</span>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <Mail className="w-4 h-4 mr-2" />
                  <span>{user.email}</span>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Membre depuis le {formatDate(user.createdAt)}</span>
                </div>
              </div>

              {/* Badge rôle */}
              <div className="mt-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  user.role === 'admin' 
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {isEditing ? 'Annuler' : 'Modifier le profil'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques de progression */}
      {userProgress && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Trophy className="w-6 h-6 mr-2" />
              Vos statistiques d'apprentissage
            </h2>
          </div>
          
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {userProgress.completedVideos?.length || 0}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Vidéos terminées
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {userProgress.totalQuizzesPassed || 0}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Quiz réussis
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {userProgress.totalWatchTime || 0}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Minutes de visionnage
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Informations du compte */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Informations du compte
          </h2>
        </div>
        
        <div className="px-6 py-6">
          {isEditing ? (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-sm text-yellow-700">
                  La modification du profil sera implémentée dans une prochaine version.
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Prénom
                  </label>
                  <div className="mt-1 text-sm text-gray-900">
                    {user.firstName || 'Non renseigné'}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nom de famille
                  </label>
                  <div className="mt-1 text-sm text-gray-900">
                    {user.lastName || 'Non renseigné'}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nom d'utilisateur
                  </label>
                  <div className="mt-1 text-sm text-gray-900">
                    {user.username || 'Non défini'}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Adresse email
                  </label>
                  <div className="mt-1 text-sm text-gray-900">
                    {user.email}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Dernière connexion
                  </label>
                  <div className="mt-1 text-sm text-gray-900">
                    {formatDate(user.lastLogin)}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Compte créé le
                  </label>
                  <div className="mt-1 text-sm text-gray-900">
                    {formatDate(user.createdAt)}
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Sécurité du compte
                </h3>
                
                <button
                  onClick={() => alert('Fonctionnalité en cours de développement')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Changer le mot de passe
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile; 