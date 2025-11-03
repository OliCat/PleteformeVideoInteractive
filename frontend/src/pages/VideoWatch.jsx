import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  ArrowLeft, 
  ArrowRight, 
  BookOpen, 
  Play, 
  CheckCircle,
  Lock,
  Home,
  ChevronRight
} from 'lucide-react';
import VideoPlayer from '../components/video/VideoPlayer';
import { fetchVideoById, fetchVideos } from '../store/slices/videosSlice';
import { fetchUserProgress } from '../store/slices/progressSlice';
import toast from 'react-hot-toast';

const VideoWatch = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { currentVideo, isLoading, videos } = useSelector((state) => state.videos);
  const { userProgress } = useSelector((state) => state.progress);

  
  const [isQuizAvailable, setIsQuizAvailable] = useState(false);
  const [showQuizButton, setShowQuizButton] = useState(false);
  
  // Ref pour éviter les appels multiples simultanés
  const isLoadingRef = useRef(false);
  const lastVideoIdRef = useRef(null);

  // Charger la vidéo avec useCallback pour éviter les re-créations
  const loadVideo = useCallback(async () => {
    // Éviter les appels multiples simultanés ou pour la même vidéo
    if (isLoadingRef.current || lastVideoIdRef.current === videoId) {
      return;
    }

    try {
      isLoadingRef.current = true;
      lastVideoIdRef.current = videoId;
      
      // Charger en parallèle pour optimiser
      await Promise.all([
        dispatch(fetchVideoById(videoId)).unwrap(),
        dispatch(fetchUserProgress()).unwrap(),
        // Charger toutes les vidéos accessibles pour la navigation seulement si nécessaire
        dispatch(fetchVideos({ accessible: true })).unwrap()
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement de la vidéo:', error);
      toast.error('Erreur lors du chargement de la vidéo');
      navigate('/learning-path');
    } finally {
      isLoadingRef.current = false;
    }
  }, [videoId, dispatch, navigate]);

  useEffect(() => {
    if (videoId && videoId !== lastVideoIdRef.current) {
      loadVideo();
    }
  }, [videoId, loadVideo]);

  const handleVideoComplete = () => {
    toast.success('Vidéo terminée ! Vous pouvez maintenant passer au quiz.');
    setShowQuizButton(true);
  };

  const handleQuizAvailable = () => {
    setIsQuizAvailable(true);
    setShowQuizButton(true);
  };

  const handleTakeQuiz = () => {
    if (currentVideo?.quizId) {
      navigate(`/quiz/${currentVideo.quizId}/take`);
    } else {
      toast.error('Aucun quiz associé à cette vidéo');
    }
  };

  const handleGoToLearningPath = () => {
    navigate('/learning-path');
  };

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const getNextVideo = () => {
    if (!currentVideo || !videos || !Array.isArray(videos)) return null;
    
    // Trouver la prochaine vidéo dans l'ordre (débloquée ou complétée)
    const nextOrder = currentVideo.order + 1;
    const nextVideo = videos.find(video => 
      video.order === nextOrder && 
      (video.status === 'unlocked' || video.status === 'completed' || video.hasAccess)
    );
    
    return nextVideo || null;
  };

  const getPreviousVideo = () => {
    if (!currentVideo || !videos || !Array.isArray(videos)) return null;
    
    // Trouver la vidéo précédente dans l'ordre (toujours accessible car déjà vue)
    const prevOrder = currentVideo.order - 1;
    if (prevOrder < 1) return null;
    
    const previousVideo = videos.find(video => video.order === prevOrder);
    
    return previousVideo || null;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-ginka p-charte">Chargement de la vidéo...</p>
        </div>
      </div>
    );
  }

  if (!currentVideo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2 font-ginka h4-charte">
            Vidéo non trouvée
          </h3>
          <p className="text-gray-500 mb-4 font-ginka p-charte">
            La vidéo que vous recherchez n'existe pas ou n'est pas accessible.
          </p>
          <button
            onClick={handleGoToLearningPath}
            className="btn-charte btn-charte-primary px-4 py-2"
          >
            Retour au parcours
          </button>
        </div>
      </div>
    );
  }

  const nextVideo = getNextVideo();
  const previousVideo = getPreviousVideo();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm">
              <button
                onClick={handleGoHome}
                className="flex items-center text-gray-500 hover:text-gray-700 transition-colors font-ginka p-charte"
              >
                <Home className="w-4 h-4 mr-1" />
                Accueil
              </button>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <button
                onClick={handleGoToLearningPath}
                className="flex items-center text-gray-500 hover:text-gray-700 transition-colors font-ginka p-charte"
              >
                <BookOpen className="w-4 h-4 mr-1" />
                Parcours
              </button>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="text-gray-900 font-medium font-ginka p-charte">
                Vidéo {currentVideo.order}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handleGoToLearningPath}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors font-ginka p-charte"
              >
                <BookOpen className="w-4 h-4" />
                <span>Parcours</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lecteur vidéo principal */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-charte-media shadow-lg overflow-hidden">
              <VideoPlayer
                video={currentVideo}
                onVideoComplete={handleVideoComplete}
                onQuizAvailable={handleQuizAvailable}
                className="w-full"
              />
            </div>

            {/* Informations vidéo */}
            <div className="mt-6 bg-white rounded-charte-media shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2 font-ginka h2-charte">
                    {currentVideo.title}
                  </h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 font-ginka p-charte">
                    <span>Vidéo {currentVideo.order}</span>
                    {currentVideo.duration && (
                      <span>{formatDuration(currentVideo.duration)}</span>
                    )}
                    {currentVideo.viewCount !== undefined && (
                      <span>{currentVideo.viewCount} vues</span>
                    )}
                  </div>
                </div>
                
                {/* Statut de la vidéo */}
                <div className="flex items-center space-x-2">
                  {currentVideo.hasAccess ? (
                    <div className="flex items-center space-x-1 text-section-green">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium font-ginka p-charte">Accessible</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-gray-400">
                      <Lock className="w-5 h-5" />
                      <span className="text-sm font-medium font-ginka p-charte">Verrouillée</span>
                    </div>
                  )}
                </div>
              </div>

              {currentVideo.description && (
                <p className="text-gray-600 leading-relaxed font-ginka p-charte">
                  {currentVideo.description}
                </p>
              )}

              {/* Bouton quiz */}
              {showQuizButton && currentVideo.quizId && (
                <div className="mt-6 p-6 rounded-charte-media shadow-md animate-pulse border-2" style={{ background: 'linear-gradient(to right, #E8F5E9, #F0F9F4)', borderColor: '#69BD93' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 rounded-full p-3" style={{ backgroundColor: '#E8F5E9' }}>
                        <BookOpen className="w-8 h-8 text-section-green" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold flex items-center space-x-2 font-ginka h4-charte" style={{ color: '#69BD93' }}>
                          <span>🎉 Quiz disponible !</span>
                        </h3>
                        <p className="text-sm mt-1 font-ginka p-charte" style={{ color: '#5aa57e' }}>
                          Testez vos connaissances avec le quiz associé à cette vidéo. 
                          Vous devez obtenir au moins 80% pour débloquer la vidéo suivante.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleTakeQuiz}
                      className="btn-charte btn-charte-success flex-shrink-0 flex items-center space-x-2 px-6 py-3 transition-all transform hover:scale-105 shadow-lg"
                    >
                      <Play className="w-5 h-5" />
                      <span className="font-semibold">Passer le quiz</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Navigation entre vidéos */}
            <div className="bg-white rounded-charte-media shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 font-ginka h4-charte">
                Navigation
              </h3>
              
              <div className="space-y-3">
                {/* Vidéo précédente */}
                {previousVideo ? (
                  <button
                    onClick={() => navigate(`/video/${previousVideo._id}/watch`)}
                    className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-charte-media transition-colors font-ginka p-charte"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 font-ginka h6-charte">
                        Vidéo {previousVideo.order}
                      </p>
                      <p className="text-xs text-gray-500 font-ginka p-charte">
                        {previousVideo.title}
                      </p>
                    </div>
                  </button>
                ) : (
                  <div className="w-full flex items-center space-x-3 p-3 text-left text-gray-400 font-ginka p-charte">
                    <ArrowLeft className="w-5 h-5" />
                    <div>
                      <p className="text-sm">Aucune vidéo précédente</p>
                    </div>
                  </div>
                )}

                {/* Vidéo suivante */}
                {nextVideo ? (
                  <button
                    onClick={() => navigate(`/video/${nextVideo._id}/watch`)}
                    className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-charte-media transition-colors font-ginka p-charte"
                  >
                    <div className="flex-1 text-right">
                      <p className="text-sm font-medium text-gray-900 font-ginka h6-charte">
                        Vidéo {nextVideo.order}
                      </p>
                      <p className="text-xs text-gray-500 font-ginka p-charte">
                        {nextVideo.title}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </button>
                ) : (
                  <div className="w-full flex items-center space-x-3 p-3 text-left text-gray-400 font-ginka p-charte">
                    <div className="flex-1 text-right">
                      <p className="text-sm">Aucune vidéo suivante</p>
                    </div>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </div>
            </div>

            {/* Informations sur le parcours */}
            <div className="bg-white rounded-charte-media shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 font-ginka h4-charte">
                À propos du parcours
              </h3>
              
              <div className="space-y-3 text-sm font-ginka p-charte">
                <div className="flex justify-between">
                  <span className="text-gray-500">Vidéo actuelle :</span>
                  <span className="font-medium">{currentVideo.order}</span>
                </div>
                
                {userProgress && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Vidéos complétées :</span>
                      <span className="font-medium">
                        {(userProgress?.data?.completedVideos?.length ?? userProgress?.completedVideos?.length) || 0}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-500">Progression :</span>
                      <span className="font-medium">
                        {(userProgress?.data?.currentPosition ?? userProgress?.currentPosition) || 1}
                      </span>
                    </div>
                  </>
                )}
              </div>
              
              <button
                onClick={handleGoToLearningPath}
                className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-charte-media hover:bg-gray-200 transition-colors font-ginka p-charte"
              >
                Voir tout le parcours
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoWatch;
