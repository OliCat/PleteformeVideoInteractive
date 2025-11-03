import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactPlayer from 'react-player';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Settings,
  CheckCircle,
  Lock
} from 'lucide-react';
import { 
  startVideoSession, 
  updateVideoPosition, 
  pauseVideoSession, 
  resumeVideoSession, 
  endVideoSession,
  recordWatchSession 
} from '../../store/slices/progressSlice';
import toast from 'react-hot-toast';
import { getVideoUrl } from '../../utils/assetUrl';

const VideoPlayer = ({ 
  video, 
  onVideoComplete, 
  onQuizAvailable,
  className = '' 
}) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { currentVideoId, sessionStartTime, lastPosition } = useSelector((state) => state.progress);
  
  const playerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const lastSaveTimeRef = useRef(0);
  
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState(null);
  const [isQuizAvailable, setIsQuizAvailable] = useState(false);
  const [hasAccess, setHasAccess] = useState(video?.hasAccess || false);

  // Vérifier l'accès à la vidéo
  useEffect(() => {
    if (video) {
      setHasAccess(video.hasAccess || false);
    }
  }, [video]);

  // Démarrer une session de visionnage
  useEffect(() => {
    if (video && hasAccess && user) {
      dispatch(startVideoSession({ 
        videoId: video._id, 
        position: lastPosition || 0 
      }));
      
      // Démarrer le tracking de progression
      startProgressTracking();
    }

    return () => {
      // Nettoyer les intervalles
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, [video, hasAccess, user]);

  // Démarrer le tracking de progression
  const startProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current && playing && duration > 0) {
        const currentTime = playerRef.current.getCurrentTime();
        const progressPercentage = (currentTime / duration) * 100;
        
        // Sauvegarder la progression toutes les 10 secondes
        if (currentTime - lastSaveTimeRef.current >= 10) {
          saveWatchSession(currentTime);
          lastSaveTimeRef.current = currentTime;
        }

        // Vérifier si le quiz devient disponible (90% de la vidéo)
        if (progressPercentage >= 90 && !isQuizAvailable) {
          setIsQuizAvailable(true);
          if (onQuizAvailable) {
            onQuizAvailable();
          }
          toast.success('🎉 Quiz disponible ! Vous pouvez maintenant passer au quiz.');
        }

        // Mettre à jour la position dans le store
        dispatch(updateVideoPosition({ position: currentTime }));
      }
    }, 1000);
  }, [playing, duration, isQuizAvailable, dispatch, onQuizAvailable]);

  // Sauvegarder une session de visionnage
  const saveWatchSession = useCallback(async (currentTime) => {
    if (!video || !user || !sessionStartTime) return;

    try {
      const startTime = lastPosition || 0;
      const endTime = currentTime;
      
      await dispatch(recordWatchSession({
        videoId: video._id,
        startTime,
        endTime,
        duration: duration
      })).unwrap();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la session:', error);
    }
  }, [video, user, sessionStartTime, lastPosition, duration, dispatch]);

  // Gestion de la lecture/pause
  const handlePlayPause = () => {
    if (!hasAccess) {
      toast.error('Vous n\'avez pas accès à cette vidéo');
      return;
    }

    if (playing) {
      dispatch(pauseVideoSession());
    } else {
      dispatch(resumeVideoSession());
    }
    setPlaying(!playing);
  };

  // Gestion du volume
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setMuted(newVolume === 0);
  };

  // Gestion du mute
  const handleMute = () => {
    setMuted(!muted);
  };

  // Gestion de la barre de progression
  const handleSeekChange = (e) => {
    setPlayed(parseFloat(e.target.value));
  };

  const handleSeekMouseDown = () => {
    setSeeking(true);
  };

  const handleSeekMouseUp = (e) => {
    setSeeking(false);
    if (playerRef.current) {
      playerRef.current.seekTo(parseFloat(e.target.value));
    }
  };

  // Gestion du plein écran
  const handleFullscreen = () => {
    if (playerRef.current && playerRef.current.getInternalPlayer) {
      const internalPlayer = playerRef.current.getInternalPlayer();
      if (internalPlayer.requestFullscreen) {
        internalPlayer.requestFullscreen();
      }
    }
  };

  // Gestion des contrôles automatiques
  const handleMouseMove = () => {
    setShowControls(true);
    
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    
    const timeout = setTimeout(() => {
      setShowControls(false);
    }, 3000);
    
    setControlsTimeout(timeout);
  };

  // Gestion de la fin de vidéo
  const handleVideoEnd = () => {
    setPlaying(false);
    dispatch(endVideoSession());
    
    if (onVideoComplete) {
      onVideoComplete();
    }
    
    toast.success('Vidéo terminée ! Vous pouvez maintenant passer au quiz.');
  };

  // Gestion des erreurs
  const handleError = (error) => {
    console.error('Erreur du lecteur vidéo:', error);
    
    // Construire l'URL pour le debugging
    let debugUrl = '';
    if (video?.streamUrl) {
      debugUrl = getVideoUrl(video.streamUrl);
    } else if (video?.qualities && video.qualities.length > 0) {
      const preferredQuality = video.qualities.find(q => q.quality === '720p') || video.qualities[0];
      let relativePath = preferredQuality.path.replace(/^\.\//, '');
      if (relativePath.startsWith('videos/')) {
        relativePath = relativePath.substring('videos/'.length);
      }
      debugUrl = getVideoUrl(`/videos/${relativePath}`);
    }
    
    console.error('Détails de l\'erreur:', {
      errorType: error.type,
      target: error.target,
      currentTarget: error.currentTarget,
      videoUrl: debugUrl,
      videoData: {
        id: video?._id,
        title: video?.title,
        filePath: video?.filePath,
        streamUrl: video?.streamUrl,
        qualities: video?.qualities
      }
    });
    toast.error('Erreur lors de la lecture de la vidéo. Vérifiez la console pour plus de détails.');
  };

  // Si l'utilisateur n'a pas accès à la vidéo
  if (!hasAccess) {
    return (
      <div className={`relative bg-gray-900 rounded-charte-media overflow-hidden ${className}`}>
        <div className="aspect-video bg-gray-800 flex items-center justify-center">
          <div className="text-center text-white">
            <Lock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2 font-ginka h4-charte">Vidéo verrouillée</h3>
            <p className="text-gray-300 mb-4 font-ginka p-charte">
              Vous devez regarder la vidéo précédente jusqu'à 90% et réussir son quiz avec au moins 80% pour accéder à cette vidéo.
            </p>
            <div className="rounded-charte-media p-4" style={{ backgroundColor: 'rgba(242, 190, 105, 0.2)', borderColor: 'rgba(242, 190, 105, 0.3)', borderWidth: '1px', borderStyle: 'solid' }}>
              <p className="text-sm font-ginka p-charte" style={{ color: '#F2BE69' }}>
                💡 Pour débloquer cette vidéo, vous devez compléter la vidéo précédente : regardez-la jusqu'à 90% et réussissez son quiz avec au moins 80%.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative bg-gray-900 rounded-charte-media overflow-hidden group ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Lecteur vidéo */}
      <div className="aspect-video">
        {(() => {
          // Construire l'URL correctement
          let videoUrl;
          
          if (video?.streamUrl) {
            videoUrl = getVideoUrl(video.streamUrl);
          } else if (video?.qualities && video.qualities.length > 0) {
            // Utiliser la qualité 720p par défaut, sinon la première disponible
            const preferredQuality = video.qualities.find(q => q.quality === '720p') || video.qualities[0];
            
            // Nettoyer le path pour extraire seulement la partie relative
            let relativePath = preferredQuality.path;
            
            // Normaliser les séparateurs de chemin
            relativePath = relativePath.replace(/\\/g, '/');
            
            // Si c'est un chemin absolu qui contient VIDEO_PATH, extraire la partie après
            if (relativePath.includes('/opt/video-platform/videos/')) {
              relativePath = relativePath.split('/opt/video-platform/videos/')[1];
            } else if (relativePath.includes('/videos/')) {
              // Si le path contient déjà 'videos/', extraire seulement ce qui vient après
              const videosIndex = relativePath.indexOf('/videos/');
              relativePath = relativePath.substring(videosIndex + '/videos/'.length);
            } else if (relativePath.startsWith('videos/')) {
              // Si le path commence par 'videos/', enlever le préfixe
              relativePath = relativePath.substring('videos/'.length);
            } else {
              // Supprimer ./ ou chemins relatifs au début
              relativePath = relativePath.replace(/^\.\//, '');
              
              // Si ça commence par le nom du fichier directement, utiliser filePath pour construire le chemin
              if (relativePath && !relativePath.includes('/')) {
                // C'est juste un nom de fichier, utiliser filePath pour construire le chemin relatif
                if (video.filePath) {
                  let filePathBase = video.filePath;
                  // Extraire le nom de dossier depuis filePath
                  const folderName = filePathBase.split('/').pop() || filePathBase.split('\\').pop();
                  relativePath = `${folderName}/${relativePath}`;
                }
              }
            }
            
            // S'assurer qu'on n'a pas de slash en double
            relativePath = relativePath.replace(/^\/+/, '').replace(/\/+/g, '/');
            
            videoUrl = getVideoUrl(`/videos/${relativePath}`);
          } else if (video?.filePath) {
            // Fallback pour l'ancien système - filePath pointe vers le dossier, pas le fichier
            console.warn('⚠️ filePath disponible mais pas de qualities - impossible de construire l\'URL');
            videoUrl = '';
          } else {
            console.error('❌ Aucune URL vidéo disponible');
            videoUrl = '';
          }
          
          return (
            <ReactPlayer
              ref={playerRef}
              url={videoUrl}
              width="100%"
              height="100%"
              playing={playing}
              volume={muted ? 0 : volume}
              muted={muted}
              onProgress={(state) => {
                if (!seeking) {
                  setPlayed(state.played);
                }
              }}
              onDuration={setDuration}
              onEnded={handleVideoEnd}
              onError={handleError}
              config={{
                file: {
                  attributes: {
                    controls: false,
                    preload: 'metadata',
                    crossOrigin: 'anonymous'
                  }
                }
              }}
            />
          );
        })()}
      </div>

      {/* Overlay de contrôles */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        {/* Contrôles du bas */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {/* Barre de progression */}
          <div className="mb-3">
            <input
              type="range"
              min={0}
              max={1}
              step="any"
              value={played}
              onChange={handleSeekChange}
              onMouseDown={handleSeekMouseDown}
              onMouseUp={handleSeekMouseUp}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          {/* Contrôles principaux */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Bouton play/pause */}
              <button
                onClick={handlePlayPause}
                className="text-white hover:text-section-blue transition-colors"
              >
                {playing ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6" />
                )}
              </button>

              {/* Contrôle du volume */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleMute}
                  className="text-white hover:text-section-blue transition-colors"
                >
                  {muted || volume === 0 ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step="any"
                  value={muted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* Temps */}
              <div className="text-white text-sm font-ginka p-charte">
                {formatTime(played * duration)} / {formatTime(duration)}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Indicateur de quiz disponible */}
              {isQuizAvailable && (
                <div className="flex items-center space-x-2" style={{ color: '#69BD93' }}>
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium font-ginka">Quiz disponible</span>
                </div>
              )}

              {/* Bouton plein écran */}
              <button
                onClick={handleFullscreen}
                className="text-white hover:text-section-blue transition-colors"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Styles pour la barre de progression */}
      <style dangerouslySetInnerHTML={{__html: `
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #2D74BA;
          cursor: pointer;
          border: 2px solid #ffffff;
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #2D74BA;
          cursor: pointer;
          border: 2px solid #ffffff;
        }
      `}} />
    </div>
  );
};

// Fonction utilitaire pour formater le temps
const formatTime = (seconds) => {
  if (isNaN(seconds)) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default VideoPlayer;
