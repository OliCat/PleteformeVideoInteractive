import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Play,
  BarChart3,
  Tag,
  Clock,
  Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  fetchQuizzes, 
  deleteQuiz, 
  toggleQuizStatus,
  clearMessages,
  updateFilters,
  resetFilters
} from '../../store/slices/quizSlice';

const QuizManagement = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
  const [showFilters, setShowFilters] = useState(false);
  
  // Sélecteurs Redux
  const { quizzes, isLoading, error, success } = useSelector((state) => state.quiz);
  const reduxFilters = useSelector((state) => state.quiz.filters);
  
  // État local pour la recherche
  const [searchTerm, setSearchTerm] = useState('');

  // Vérifier que l'utilisateur est admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/dashboard');
      toast.error('Accès non autorisé');
    }
  }, [user, navigate]);

  // Charger les quiz au montage du composant
  useEffect(() => {
    if (user?.role === 'admin') {
      loadQuizzes();
    }
  }, [user]);

  // Log pour déboguer l'état des quiz
  useEffect(() => {
    console.log('📋 État des quiz dans QuizManagement:', { quizzes, isLoading, error });
  }, [quizzes, isLoading, error]);

  // Effacer les messages lors du démontage
  useEffect(() => {
    return () => {
      dispatch(clearMessages());
    };
  }, [dispatch]);

  // Afficher les messages de succès/erreur
  useEffect(() => {
    if (success) {
      toast.success(success);
      dispatch(clearMessages());
    }
    if (error) {
      toast.error(error);
      dispatch(clearMessages());
    }
  }, [success, error, dispatch]);

  const loadQuizzes = async () => {
    try {
      console.log('🔄 Chargement des quiz...');
      const filters = {
        search: searchTerm,
        ...reduxFilters
      };
      console.log('🔍 Filtres appliqués:', filters);
      const response = await dispatch(fetchQuizzes(filters)).unwrap();
      console.log('📊 Réponse API quiz:', response);
    } catch (error) {
      console.error('Erreur lors du chargement des quiz:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadQuizzes();
  };

  const handleFilterChange = (key, value) => {
    dispatch(updateFilters({ [key]: value }));
  };

  const handleCreateQuiz = () => {
    navigate('/admin/quizzes/create');
  };

  const handleEditQuiz = (quizId) => {
    navigate(`/admin/quizzes/${quizId}/edit`);
  };

  const handleViewQuiz = (quizId) => {
    navigate(`/admin/quizzes/${quizId}`);
  };

  const handleToggleStatus = async (quizId, currentStatus) => {
    try {
      await dispatch(toggleQuizStatus(quizId)).unwrap();
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce quiz ?')) {
      return;
    }

    try {
      await dispatch(deleteQuiz(quizId)).unwrap();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'facile': return 'bg-green-100 text-green-800';
      case 'intermédiaire': return 'bg-yellow-100 text-yellow-800';
      case 'difficile': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyLabel = (difficulty) => {
    switch (difficulty) {
      case 'facile': return 'Facile';
      case 'intermédiaire': return 'Intermédiaire';
      case 'difficile': return 'Difficile';
      default: return difficulty;
    }
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Gestion des Quiz
              </h1>
              <p className="mt-2 text-gray-600">
                Créez, modifiez et gérez les quiz interactifs de votre plateforme
              </p>
            </div>
            <button
              onClick={handleCreateQuiz}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-5 h-5 mr-2" />
              Créer un Quiz
            </button>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Barre de recherche */}
              <div className="flex-1">
                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Rechercher des quiz..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </form>
              </div>

              {/* Actions filtres */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Filter className="w-5 h-5 mr-2" />
                  Filtres
                </button>
                <button
                  onClick={() => { setSearchTerm(''); dispatch(resetFilters()); setTimeout(() => loadQuizzes(), 0); }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  title="Réinitialiser les filtres"
                >
                  Réinitialiser
                </button>
              </div>
            </div>

            {/* Panneau de filtres */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Difficulté
                    </label>
                    <select
                      value={reduxFilters.difficulty}
                      onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Toutes</option>
                      <option value="facile">Facile</option>
                      <option value="intermédiaire">Intermédiaire</option>
                      <option value="difficile">Difficile</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Statut
                    </label>
                    <select
                      value={reduxFilters.isActive}
                      onChange={(e) => handleFilterChange('isActive', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Tous</option>
                      <option value="true">Actifs</option>
                      <option value="false">Inactifs</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags
                    </label>
                    <input
                      type="text"
                      placeholder="Séparés par des virgules"
                      value={reduxFilters.tags}
                      onChange={(e) => handleFilterChange('tags', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Liste des quiz */}
        <div className="bg-white rounded-lg shadow">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement des quiz...</p>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="p-8 text-center">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun quiz trouvé
              </h3>
              <p className="text-gray-500 mb-4">
                Commencez par créer votre premier quiz interactif.
              </p>
              <button
                onClick={handleCreateQuiz}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Créer un Quiz
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                      Quiz
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                      Vidéo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Difficulté
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Questions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {quizzes.map((quiz) => (
                    <tr key={quiz._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="min-w-[200px]">
                          <div className="text-sm font-medium text-gray-900">
                            {quiz.title}
                          </div>
                          {quiz.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {quiz.description}
                            </div>
                          )}
                          <div className="flex items-center mt-1 text-xs text-gray-500">
                            <Clock className="w-4 h-4 mr-1 flex-shrink-0" />
                            {new Date(quiz.createdAt).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 min-w-[150px] max-w-xs truncate" title={quiz.videoId?.title || 'Vidéo inconnue'}>
                          {quiz.videoId?.title || 'Vidéo inconnue'}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(quiz.difficulty)} whitespace-nowrap`}>
                          {getDifficultyLabel(quiz.difficulty)}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {quiz.questionCount} questions
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Target className="w-4 h-4 mr-1 flex-shrink-0" />
                          <span>{quiz.passingScore}/{quiz.totalPoints}</span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                          quiz.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {quiz.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewQuiz(quiz._id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Voir le quiz"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleEditQuiz(quiz._id)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Modifier le quiz"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleToggleStatus(quiz._id, quiz.isActive)}
                            className={quiz.isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}
                            title={quiz.isActive ? 'Désactiver' : 'Activer'}
                          >
                            {quiz.isActive ? <EyeOff className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                          
                          <button
                            onClick={() => handleDeleteQuiz(quiz._id)}
                            className="text-red-600 hover:text-red-900"
                            title="Supprimer le quiz"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

export default QuizManagement;
