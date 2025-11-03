import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  BookOpen, 
  Trophy, 
  Clock, 
  CheckCircle,
  Lock,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import VideoCard from '../components/common/VideoCard';
import ProgressBar from '../components/common/ProgressBar';
import { fetchUserProgress, getProgressStats } from '../store/slices/progressSlice';
import { fetchVideos } from '../store/slices/videosSlice';
import toast from 'react-hot-toast';

const VideoLearningPath = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user } = useSelector((state) => state.auth);
  const { userProgress, progressStats, isLoading } = useSelector((state) => state.progress);
  const { videos, isLoading: videosLoading } = useSelector((state) => state.videos);

  // Logs de débogage
  console.log('🔍 VideoLearningPath - userProgress:', userProgress);
  console.log('🔍 VideoLearningPath - progressStats:', progressStats);
  console.log('🔍 VideoLearningPath - videos:', videos);

  // Rediriger les administrateurs vers l'interface d'administration
  if (user?.role === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-primary-red mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <h2 className="h3-charte text-gray-900 mb-2 font-ginka">Interface Administrateur</h2>
          <p className="text-gray-600 mb-6 font-ginka p-charte">
            En tant qu'administrateur, vous pouvez gérer les vidéos depuis l'interface d'administration.
          </p>
          <div className="space-x-4">
            <button
              onClick={() => navigate('/admin/videos')}
              className="btn-charte btn-charte-primary px-6 py-3"
            >
              Gérer les vidéos
            </button>
            <button
              onClick={() => navigate('/admin/quizzes')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-charte-media hover:bg-gray-50 transition-colors font-ginka p-charte"
            >
              Gérer les quiz
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  const [selectedVideo, setSelectedVideo] = useState(null);
  
  // Ref pour éviter les appels multiples simultanés
  const isLoadingRef = useRef(false);

  // Charger les données avec useCallback pour éviter les re-créations
  const loadData = useCallback(async () => {
    // Éviter les appels multiples simultanés
    if (isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;
      // Charger la progression et les vidéos en parallèle
      await Promise.all([
        dispatch(fetchUserProgress()).unwrap(),
        dispatch(fetchVideos({ accessible: true })).unwrap(),
        dispatch(getProgressStats()).unwrap()
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast.error('Erreur lors du chargement du parcours');
    } finally {
      isLoadingRef.current = false;
    }
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Rafraîchir les données quand l'utilisateur revient sur la page (avec debounce)
  useEffect(() => {
    let debounceTimeout;
    const handleFocus = () => {
      // Debounce pour éviter trop de requêtes rapides
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        loadData();
      }, 1000); // Attendre 1 seconde avant de recharger
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearTimeout(debounceTimeout);
    };
  }, [loadData]);

  const handleRefresh = async () => {
    await loadData();
    toast.success('Données mises à jour');
  };

  const handleVideoClick = (video) => {
    if (video.status === 'locked') {
      toast.error('Cette vidéo est verrouillée. Complétez la vidéo précédente et réussissez son quiz.');
      return;
    }
    
    navigate(`/video/${video._id}/watch`);
  };

  const handleContinueLearning = () => {
    // Trouver la prochaine vidéo à regarder
    if (!videos || !Array.isArray(videos)) return;
    const nextVideo = videos.find(video =>
      video.status === 'unlocked' && !video.isCompleted
    );

    if (nextVideo) {
      navigate(`/video/${nextVideo._id}/watch`);
    } else {
      toast.info('Toutes les vidéos disponibles ont été complétées !');
    }
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

  const getNextVideo = () => {
    if (!videos || !Array.isArray(videos)) return null;
    return videos.find(video => 
      video.status === 'unlocked' && !video.isCompleted
    );
  };

  const getCompletedCount = () => {
    // D'abord, essayer d'utiliser les données de progression (la source la plus fiable)
    const progressData = userProgress?.data || userProgress;
    if (progressData && Array.isArray(progressData.completedVideos)) {
      return progressData.completedVideos.length;
    }
    
    // Ensuite, utiliser progressStats si disponible
    if (progressStats?.data?.completedVideos !== undefined) {
      return progressStats.data.completedVideos;
    }
    
    // Enfin, compter les vidéos avec status === 'completed' depuis la liste des vidéos
    if (videos && Array.isArray(videos)) {
      return videos.filter(video => video.status === 'completed' || video.isCompleted).length;
    }
    
    return 0;
  };

  const getLockedCount = () => {
    if (!videos || !Array.isArray(videos)) return 0;
    return videos.filter(video => video.status === 'locked').length;
  };

  const getUnlockedCount = () => {
    // Compter directement les vidéos avec status === 'unlocked' (plus fiable)
    if (videos && Array.isArray(videos)) {
      return videos.filter(video => video.status === 'unlocked' && !video.isCompleted).length;
    }
    // Fallback sur les données de progression si les vidéos ne sont pas disponibles
    const progressData = userProgress?.data || userProgress;
    if (progressData && progressData.currentPosition) {
      // Le nombre de vidéos débloquées = position actuelle (moins les complétées)
      const completed = progressData.completedVideos?.length || 0;
      return Math.max(0, progressData.currentPosition - completed);
    }
    return 0;
  };

  if (isLoading || videosLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-red" />
          <p className="text-gray-600 font-ginka p-charte">Chargement du parcours d'apprentissage...</p>
        </div>
      </div>
    );
  }

  const nextVideo = getNextVideo();
  const completedCount = getCompletedCount();
  
  // Utiliser les données de progression corrigées pour le pourcentage
  let completionPercentage = 0;
  let totalVideos = 0;
  
  if (progressStats?.data?.completionPercentage !== undefined) {
    completionPercentage = progressStats.data.completionPercentage;
    totalVideos = progressStats.data.totalVideos;
  } else {
    // Fallback sur le calcul manuel
    totalVideos = videos && Array.isArray(videos) ? videos.length : 0;
    completionPercentage = totalVideos > 0 ? Math.round((completedCount / totalVideos) * 100) : 0;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="h2-charte text-gray-900 flex items-center font-ginka">
                <BookOpen className="w-8 h-8 mr-3 text-primary-red" />
                Parcours d'Apprentissage
              </h1>
              <p className="mt-2 text-gray-600 font-ginka p-charte">
                {isNewUser()
                  ? 'Commencez votre parcours d\'apprentissage interactif'
                  : 'Suivez votre progression dans le parcours vidéo interactif'
                }
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors font-ginka p-charte"
                title="Actualiser les données"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Actualiser</span>
              </button>
              
              {nextVideo && (
                <button
                  onClick={handleContinueLearning}
                  className="btn-charte btn-charte-primary flex items-center space-x-2 px-6 py-3"
                >
                  <Play className="w-5 h-5" />
                  <span>{isNewUser() ? 'Commencer' : 'Continuer'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Statistiques de progression */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Progression globale */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Trophy className="w-8 h-8 text-section-yellow" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 font-ginka p-charte">Progression</p>
                <p className="text-2xl font-semibold text-gray-900 font-ginka h3-charte">{completionPercentage}%</p>
              </div>
            </div>
            <div className="mt-4">
              <ProgressBar 
                progress={completedCount} 
                total={totalVideos} 
                color="yellow"
                showNumbers={true}
                showPercentage={false}
              />
            </div>
          </div>

          {/* Vidéos complétées */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="w-8 h-8 text-section-green" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 font-ginka p-charte">Terminées</p>
                <p className="text-2xl font-semibold text-gray-900 font-ginka h3-charte">{completedCount}</p>
              </div>
            </div>
          </div>

          {/* Vidéos disponibles */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Play className="w-8 h-8 text-section-blue" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 font-ginka p-charte">Disponibles</p>
                <p className="text-2xl font-semibold text-gray-900 font-ginka h3-charte">{getUnlockedCount()}</p>
              </div>
            </div>
          </div>

          {/* Vidéos verrouillées */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Lock className="w-8 h-8 text-gray-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 font-ginka p-charte">Verrouillées</p>
                <p className="text-2xl font-semibold text-gray-900 font-ginka h3-charte">{getLockedCount()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Prochaine vidéo recommandée */}
        {nextVideo && (
          <div className="rounded-charte-media p-6 mb-8 border" style={{ background: 'linear-gradient(to right, #E8F4FD, #F0F8FF)', borderColor: '#2D74BA' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-charte-media flex items-center justify-center" style={{ backgroundColor: '#E8F4FD' }}>
                    <Play className="w-8 h-8 text-section-blue" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 font-ginka h4-charte">
                    {isNewUser() ? 'Première vidéo du parcours' : 'Prochaine vidéo recommandée'}
                  </h3>
                  <p className="text-gray-600 font-ginka p-charte">{nextVideo.title}</p>
                  <p className="text-sm text-gray-500 font-ginka p-charte">
                    Vidéo {nextVideo.order} • {nextVideo.duration ? Math.floor(nextVideo.duration / 60) : 0} min
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleVideoClick(nextVideo)}
                className="btn-charte btn-charte-primary flex items-center space-x-2 px-4 py-2"
              >
                <Play className="w-4 h-4" />
                <span>{isNewUser() ? 'Commencer' : 'Regarder'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Liste des vidéos */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 font-ginka h3-charte">
              Toutes les vidéos du parcours
            </h2>
            <p className="text-gray-600 font-ginka p-charte">
              Cliquez sur une vidéo pour la regarder (si elle est débloquée)
            </p>
          </div>
          
          <div className="p-6">
            {!videos || !Array.isArray(videos) || videos.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2 font-ginka h4-charte">
                  Aucune vidéo disponible
                </h3>
                <p className="text-gray-500 font-ginka p-charte">
                  Il n'y a pas encore de vidéos dans ce parcours d'apprentissage.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos && Array.isArray(videos) && videos.map((video) => (
                  <VideoCard
                    key={video._id}
                    video={video}
                    onClick={handleVideoClick}
                    showProgress={true}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Message de félicitations si tout est complété */}
        {completedCount === totalVideos && totalVideos > 0 && (
          <div className="mt-8 rounded-charte-media p-6 border" style={{ background: 'linear-gradient(to right, #E8F5E9, #F0F9F4)', borderColor: '#69BD93' }}>
            <div className="text-center">
              <Trophy className="w-16 h-16 text-section-green mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2 font-ginka h2-charte" style={{ color: '#69BD93' }}>
                🎉 Félicitations !
              </h3>
              <p className="text-lg font-ginka h5-charte" style={{ color: '#5aa57e' }}>
                Vous avez terminé tout le parcours d'apprentissage !
              </p>
              <p className="mt-2 font-ginka p-charte" style={{ color: '#69BD93' }}>
                Vous avez regardé {completedCount} vidéos et réussi tous les quiz.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoLearningPath;
