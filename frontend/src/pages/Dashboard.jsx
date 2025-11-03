import React, { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  VideoIcon, 
  User, 
  LogOut, 
  Plus, 
  Play, 
  BookOpen, 
  Trophy, 
  CheckCircle,
  Clock,
  ArrowRight,
  BarChart3
} from 'lucide-react';
import { logoutUser } from '../store/slices/authSlice';
import { fetchUserProgress, getProgressStats, getGlobalStats } from '../store/slices/progressSlice';
import { fetchVideos } from '../store/slices/videosSlice';
import ProgressBar from '../components/common/ProgressBar';
import VideoCard from '../components/common/VideoCard';
import { getThumbnailUrl } from '../utils/assetUrl';

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { userProgress, progressStats, globalStats, isLoading: progressLoading } = useSelector((state) => state.progress);
  const { videos, isLoading: videosLoading } = useSelector((state) => state.videos);

  // Logs de débogage
  console.log('🔍 Dashboard - progressStats:', progressStats);
  console.log('🔍 Dashboard - progressStats.data:', progressStats?.data);

  // Ref pour éviter les appels multiples simultanés
  const isLoadingRef = useRef(false);

  // Charger les données du dashboard avec useCallback pour éviter les re-créations
  const loadDashboardData = useCallback(async () => {
    // Éviter les appels multiples simultanés
    if (isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;
      if (user?.role === 'admin') {
        // Pour les administrateurs, charger les vidéos et les statistiques globales
        await Promise.all([
          dispatch(fetchVideos()).unwrap(),
          dispatch(getGlobalStats()).unwrap()
        ]);
      } else {
        // Pour les utilisateurs, charger progression et vidéos accessibles
        await Promise.all([
          dispatch(fetchUserProgress()).unwrap(),
          dispatch(fetchVideos({ accessible: true })).unwrap(),
          dispatch(getProgressStats()).unwrap()
        ]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données du dashboard:', error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [dispatch, user?.role]);

  // Redirection si non authentifié
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Charger les données du dashboard
  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated, loadDashboardData]);

  // Rafraîchir les données quand l'utilisateur revient sur la page (avec debounce)
  useEffect(() => {
    let debounceTimeout;
    const handleFocus = () => {
      // Debounce pour éviter trop de requêtes rapides
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        if (isAuthenticated && user?.role !== 'admin') {
          loadDashboardData();
        }
      }, 1000); // Attendre 1 seconde avant de recharger
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearTimeout(debounceTimeout);
    };
  }, [isAuthenticated, user?.role, loadDashboardData]);

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      // La redirection sera gérée par le composant Login via useEffect
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      // Forcer la redirection même en cas d'erreur
      navigate('/login');
    }
  };

  const handleVideoClick = (video) => {
    if (video.status === 'locked') {
      return;
    }
    navigate(`/video/${video._id}/watch`);
  };

  const getNextVideo = () => {
    if (!videos || !Array.isArray(videos)) return null;
    return videos.find(video =>
      video.status === 'unlocked' && !video.isCompleted
    );
  };

  const isNewUser = () => {
    // userProgress est un objet de réponse API {success: true, data: {...}}
    const progressData = userProgress?.data || userProgress;

    // Si progressData n'est pas encore chargé, considérer comme nouvel utilisateur
    if (!progressData) {
      return true;
    }

    // Si progressData est chargé mais vide, c'est un nouvel utilisateur
    return progressData.completedVideos?.length === 0 &&
           progressData.videoWatchTimes?.length === 0 &&
           progressData.totalVideosWatched === 0;
  };

  const getCompletedCount = () => {
    if (!videos || !Array.isArray(videos)) return 0;
    return videos.filter(video => video.status === 'completed').length;
  };

  const getRecentVideos = () => {
    if (!videos || !Array.isArray(videos)) return [];
    
    // Récupérer les IDs des vidéos complétées depuis userProgress
    const progressData = userProgress?.data || userProgress;
    const completedVideoIds = progressData?.completedVideos || [];
    const completedIdsSet = new Set(
      completedVideoIds.map(id => 
        typeof id === 'object' && id._id ? id._id.toString() : id.toString()
      )
    );
    
    // Inclure les vidéos complétées ou avec progression
    const recentVideos = videos.filter(video => {
      // Vérifier si la vidéo est complétée (via statut ou via completedVideos)
      const videoIdStr = video._id?.toString() || video._id;
      const isCompleted = 
        video.status === 'completed' || 
        video.isCompleted ||
        completedIdsSet.has(videoIdStr);
      
      if (isCompleted) {
        return true;
      }
      
      // Vidéos avec progression de visionnage
      if (video.watchProgress && video.watchProgress.completionPercentage > 0) {
        return true;
      }
      return false;
    });
    
    // Trier par date de dernière activité (complétées en premier, puis par progression)
    return recentVideos
      .sort((a, b) => {
        // Vidéos complétées en premier
        const aIdStr = a._id?.toString() || a._id;
        const bIdStr = b._id?.toString() || b._id;
        const aCompleted = 
          a.status === 'completed' || 
          a.isCompleted ||
          completedIdsSet.has(aIdStr);
        const bCompleted = 
          b.status === 'completed' || 
          b.isCompleted ||
          completedIdsSet.has(bIdStr);
          
        if (aCompleted && !bCompleted) return -1;
        if (!aCompleted && bCompleted) return 1;
        
        // Puis par ordre (vidéos complétées dans l'ordre du parcours)
        if (aCompleted && bCompleted) {
          return (a.order || 0) - (b.order || 0);
        }
        
        // Puis par dernière position de visionnage
        const aLastPos = a.watchProgress?.lastWatchedPosition || 0;
        const bLastPos = b.watchProgress?.lastWatchedPosition || 0;
        return bLastPos - aLastPos;
      })
      .slice(0, 3);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <VideoIcon className="w-8 h-8 text-primary-red mr-3" />
              <h1 className="text-xl font-semibold text-gray-900 font-ginka">
                Plateforme Vidéo Interactive
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-700 font-ginka">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-primary-red">
                  {user?.role}
                </span>
              </div>
              
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 font-ginka"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="h3-charte text-gray-900 mb-2">
                    Bienvenue, {user?.firstName} !
                  </h2>
                  <p className="p-charte text-gray-600">
                    {user?.role === 'admin'
                      ? 'Gérez le contenu et les utilisateurs de la plateforme'
                      : 'Continuez votre parcours d\'apprentissage interactif'
                    }
                  </p>
                </div>
                
                {user?.role === 'admin' && (
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                      <BarChart3 className="w-4 h-4 mr-1" />
                      Administrateur
                    </span>
                  </div>
                )}
              </div>
              
              {/* Quick Actions - Adaptées selon le rôle */}
        {user?.role === 'admin' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/admin/videos')}
              className="btn-charte btn-charte-primary inline-flex items-center justify-center px-4 py-3"
            >
              <VideoIcon className="w-5 h-5 mr-2" />
              Gérer les vidéos
            </button>

            <button
              onClick={() => navigate('/admin/quizzes')}
              className="btn-charte btn-charte-success inline-flex items-center justify-center px-4 py-3"
            >
              <Plus className="w-5 h-5 mr-2" />
              Gérer les quiz
            </button>

            <button
              onClick={() => navigate('/admin/videos/upload')}
              className="btn-charte btn-charte-secondary inline-flex items-center justify-center px-4 py-3"
            >
              <Plus className="w-5 h-5 mr-2" />
              Ajouter une vidéo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/learning-path')}
              className="btn-charte btn-charte-primary inline-flex items-center justify-center px-4 py-3"
            >
              <BookOpen className="w-5 h-5 mr-2" />
              Parcours d'apprentissage
            </button>

            <button
              onClick={() => navigate('/learning-path')}
              className="inline-flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 font-ginka"
            >
              <VideoIcon className="w-5 h-5 mr-2" />
              Voir les vidéos
            </button>
          </div>
        )}
            </div>
          </div>
        </div>

        {/* Progression Section - Seulement pour les utilisateurs */}
        {user?.role !== 'admin' && progressStats && (
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Votre Progression
                  </h3>
                  <button
                    onClick={() => navigate('/learning-path')}
                    className="flex items-center space-x-2 text-section-blue hover:text-blue-700 transition-colors font-ginka p-charte"
                  >
                    <span>Voir tout</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Progression globale */}
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Trophy className="w-8 h-8 text-section-yellow" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 font-ginka">
                      {progressStats.data?.completionPercentage || 0}%
                    </p>
                    <p className="text-sm text-gray-500 font-ginka">Progression</p>
                    <div className="mt-2">
                      <ProgressBar 
                        progress={progressStats.data?.completedVideos || 0} 
                        total={progressStats.data?.totalVideos || 0} 
                        color="yellow"
                        size="sm"
                        showNumbers={true}
                        showPercentage={false}
                      />
                    </div>
                  </div>

                  {/* Vidéos complétées */}
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <CheckCircle className="w-8 h-8 text-section-green" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 font-ginka">
                      {progressStats.data?.completedVideos || 0}
                    </p>
                    <p className="text-sm text-gray-500 font-ginka">Vidéos terminées</p>
                  </div>

                  {/* Quiz réussis */}
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Play className="w-8 h-8 text-section-blue" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 font-ginka">
                      {progressStats.data?.passedQuizzes || 0}
                    </p>
                    <p className="text-sm text-gray-500 font-ginka">Quiz réussis</p>
                  </div>

                  {/* Temps passé */}
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Clock className="w-8 h-8 text-primary-red" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 font-ginka">
                      {progressStats.data?.totalTimeSpent ? Math.floor(progressStats.data.totalTimeSpent / 3600) : 0}h
                    </p>
                    <p className="text-sm text-gray-500 font-ginka">Temps passé</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistiques globales - Pour les administrateurs */}
        {user?.role === 'admin' && globalStats && (
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Statistiques du Parcours d'Apprentissage
                  </h3>
                  <button
                    onClick={() => navigate('/admin/users')}
                    className="flex items-center space-x-2 text-primary-red hover:text-red-700 transition-colors font-ginka"
                  >
                    <span>Voir tous les utilisateurs</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Total utilisateurs */}
                  <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#E8F4FD' }}>
                    <div className="flex items-center justify-center mb-2">
                      <User className="w-8 h-8" style={{ color: '#2D74BA' }} />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 font-ginka">
                      {globalStats.data?.totalUsers || 0}
                    </p>
                    <p className="text-sm text-gray-600 mt-1 font-ginka">Utilisateurs actifs</p>
                  </div>

                  {/* Utilisateurs ayant complété */}
                  <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#E8F5E9' }}>
                    <div className="flex items-center justify-center mb-2">
                      <Trophy className="w-8 h-8" style={{ color: '#69BD93' }} />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 font-ginka">
                      {globalStats.data?.completedUsers || 0}
                    </p>
                    <p className="text-sm text-gray-600 mt-1 font-ginka">Parcours complétés</p>
                    {globalStats.data?.completionRate !== undefined && (
                      <p className="text-xs mt-1 font-ginka" style={{ color: '#69BD93' }}>
                        ({globalStats.data.completionRate}% taux de complétion)
                      </p>
                    )}
                  </div>

                  {/* Progression moyenne */}
                  <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#FEF7E8' }}>
                    <div className="flex items-center justify-center mb-2">
                      <BarChart3 className="w-8 h-8" style={{ color: '#F2BE69' }} />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 font-ginka">
                      {globalStats.data?.averageProgress || 0}%
                    </p>
                    <p className="text-sm text-gray-600 mt-1 font-ginka">Progression moyenne</p>
                    <div className="mt-2">
                      <ProgressBar 
                        progress={globalStats.data?.averageProgress || 0} 
                        total={100} 
                        color="yellow"
                        size="sm"
                        showNumbers={false}
                        showPercentage={true}
                      />
                    </div>
                  </div>

                  {/* Total vidéos */}
                  <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#FEE8E8' }}>
                    <div className="flex items-center justify-center mb-2">
                      <VideoIcon className="w-8 h-8 text-primary-red" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 font-ginka">
                      {globalStats.data?.totalVideos || 0}
                    </p>
                    <p className="text-sm text-gray-600 mt-1 font-ginka">Vidéos publiées</p>
                  </div>
                </div>

                {/* Détails supplémentaires */}
                {globalStats.data && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Utilisateurs actifs :</span>
                        <span className="font-medium text-gray-900">
                          {globalStats.data.totalUsers || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Parcours complétés :</span>
                        <span className="font-medium text-gray-900">
                          {globalStats.data.completedUsers || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Taux de complétion :</span>
                        <span className="font-medium text-gray-900">
                          {globalStats.data.completionRate || 0}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Progression moyenne :</span>
                        <span className="font-medium text-gray-900">
                          {globalStats.data.averageProgress || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section de prévisualisation des vidéos - Pour les administrateurs */}
        {user?.role === 'admin' && videos && videos.length > 0 && (
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Aperçu des Vidéos
                  </h3>
                  <button
                    onClick={() => navigate('/admin/videos')}
                    className="flex items-center space-x-2 text-primary-red hover:text-red-700 transition-colors font-ginka"
                  >
                    <span>Gérer toutes les vidéos</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {videos.slice(0, 3).map((video) => (
                    <div key={video._id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      <div className="aspect-video bg-gray-200 flex items-center justify-center">
                        {video.thumbnailUrl ? (
                          <img
                            src={getThumbnailUrl(video.thumbnailUrl)}
                            alt={video.title}
                            className="w-full h-full object-cover thumbnail-charte"
                          />
                        ) : (
                          <VideoIcon className="w-12 h-12 text-gray-400" />
                        )}
                      </div>
                      <div className="p-4">
                        <h4 className="font-medium text-gray-900 mb-1 font-ginka h6-charte">
                          {video.title}
                        </h4>
                        <div className="flex items-center justify-between text-sm text-gray-500 font-ginka">
                          <span>Ordre {video.order}</span>
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            video.isPublished
                              ? 'bg-green-100 text-section-green'
                              : 'bg-yellow-100 text-section-yellow'
                          }`}>
                            {video.isPublished ? 'Publiée' : 'Brouillon'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Prochaine vidéo recommandée - Seulement pour les utilisateurs */}
        {user?.role !== 'admin' && getNextVideo() && (
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-charte-media flex items-center justify-center" style={{ backgroundColor: '#E8F4FD' }}>
                      <Play className="w-8 h-8 text-section-blue" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {isNewUser() ? 'Commencez votre apprentissage' : 'Continuez votre apprentissage'}
                    </h3>
                    <p className="text-gray-600">{getNextVideo().title}</p>
                    <p className="text-sm text-gray-500">
                      Vidéo {getNextVideo().order} • {getNextVideo().duration ? Math.floor(getNextVideo().duration / 60) : 0} min
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleVideoClick(getNextVideo())}
                  className="btn-charte btn-charte-primary flex items-center space-x-2 px-6 py-3"
                >
                  <Play className="w-4 h-4" />
                  <span>{isNewUser() ? 'Commencer' : 'Continuer'}</span>
                </button>
              </div>
            </div>
          </div>
        )}



        {/* Vidéos récentes - Seulement pour les utilisateurs qui ont commencé */}
        {user?.role !== 'admin' && !isNewUser() && (
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Vidéos Récentes
                  </h3>
                  <button
                    onClick={() => navigate('/learning-path')}
                    className="flex items-center space-x-2 text-section-blue hover:text-blue-700 transition-colors font-ginka p-charte"
                  >
                    <span>Voir tout</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {getRecentVideos().length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {getRecentVideos().map((video) => (
                      <VideoCard
                        key={video._id}
                        video={video}
                        onClick={handleVideoClick}
                        showProgress={true}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <VideoIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      Aucune vidéo récente
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Continuez votre parcours d'apprentissage pour voir vos vidéos récentes ici.
                    </p>
                    <button
                      onClick={() => navigate('/learning-path')}
                      className="btn-charte btn-charte-primary mt-4 px-4 py-2"
                    >
                      Continuer le parcours
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard; 