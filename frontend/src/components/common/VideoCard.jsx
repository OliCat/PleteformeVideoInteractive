import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  Lock, 
  CheckCircle, 
  Clock, 
  Eye,
  EyeOff,
  FileQuestion
} from 'lucide-react';
import { getThumbnailUrl } from '../../utils/assetUrl';

const VideoCard = ({ 
  video, 
  onClick, 
  showProgress = true,
  className = '' 
}) => {
  const navigate = useNavigate();
  const getStatusIcon = () => {
    if (video.status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-section-green" />;
    } else if (video.status === 'locked') {
      return <Lock className="w-5 h-5 text-gray-400" />;
    } else {
      return <Play className="w-5 h-5 text-section-blue" />;
    }
  };

  const getStatusText = () => {
    if (video.status === 'completed') {
      return 'Terminée';
    } else if (video.status === 'locked') {
      return 'Verrouillée';
    } else {
      return 'Disponible';
    }
  };

  const getStatusColor = () => {
    if (video.status === 'completed') {
      return 'bg-green-100 text-section-green border-green-200';
    } else if (video.status === 'locked') {
      return 'bg-gray-100 text-gray-600 border-gray-200';
    } else {
      return 'bg-blue-100 text-section-blue border-blue-200';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClick = () => {
    if (video.status !== 'locked' && onClick) {
      onClick(video);
    }
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg ${
        video.status === 'locked' 
          ? 'opacity-60 cursor-not-allowed' 
          : 'cursor-pointer hover:scale-105'
      } ${className}`}
      onClick={handleClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-200">
        {video.thumbnailUrl ? (
          <img
            src={getThumbnailUrl(video.thumbnailUrl)}
            alt={video.title}
            className="w-full h-full object-cover thumbnail-charte"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 thumbnail-charte">
            <Play className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {/* Overlay de statut */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
          {video.status === 'locked' ? (
            <div className="bg-black bg-opacity-60 rounded-full p-3">
              <Lock className="w-8 h-8 text-white" />
            </div>
          ) : (
            <div className="bg-black bg-opacity-60 rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Play className="w-8 h-8 text-white" />
            </div>
          )}
        </div>

        {/* Badge de statut */}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
            {getStatusIcon()}
            <span>{getStatusText()}</span>
          </span>
        </div>

        {/* Durée */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
            {formatDuration(video.duration)}
          </div>
        )}

        {/* Numéro d'ordre */}
        <div className="absolute top-2 right-2 bg-section-blue text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center">
          {video.order}
        </div>

        {/* Badge Quiz si la vidéo a un quiz associé */}
        {video.quizId && (
          <div className="absolute bottom-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
            <FileQuestion className="w-3 h-3" />
            <span>Quiz</span>
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 font-ginka h6-charte">
          {video.title}
        </h3>
        
        {video.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2 font-ginka p-charte">
            {video.description}
          </p>
        )}

        {/* Progression */}
        {showProgress && video.watchProgress && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Progression</span>
              <span>{video.watchProgress.completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-section-blue h-2 rounded-full transition-all duration-300"
                style={{ width: `${video.watchProgress.completionPercentage}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Métadonnées */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-3">
            {video.viewCount !== undefined && (
              <div className="flex items-center space-x-1">
                <Eye className="w-3 h-3" />
                <span>{video.viewCount}</span>
              </div>
            )}
            
            {video.duration && (
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{formatDuration(video.duration)}</span>
              </div>
            )}
          </div>

          {video.status === 'locked' && (
            <div className="flex items-center space-x-1 text-orange-600">
              <EyeOff className="w-3 h-3" />
              <span>Verrouillée</span>
            </div>
          )}
        </div>

        {/* Message d'aide pour les vidéos verrouillées */}
        {video.status === 'locked' && (
          <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
            💡 Complétez la vidéo précédente et réussissez son quiz pour débloquer cette vidéo.
          </div>
        )}

        {/* Bouton Quiz - Si la vidéo a un quiz et qu'elle est regardée à 90% ou plus */}
        {video.quizId && video.watchProgress && video.watchProgress.completionPercentage >= 90 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/quiz/${video.quizId}/take`);
            }}
            className="btn-charte btn-charte-secondary mt-3 w-full flex items-center justify-center space-x-2 px-3 py-2"
          >
            <FileQuestion className="w-4 h-4" />
            <span>Passer le quiz</span>
          </button>
        )}

        {/* Badge Quiz disponible - Si la vidéo a un quiz mais pas encore regardée à 90% */}
        {video.quizId && (!video.watchProgress || video.watchProgress.completionPercentage < 90) && video.status !== 'locked' && (
          <div className="mt-3 flex items-center space-x-2 text-xs text-purple-600">
            <FileQuestion className="w-4 h-4" />
            <span>Quiz disponible après 90% de visionnage</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCard;
