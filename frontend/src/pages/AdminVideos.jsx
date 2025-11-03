import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown,
  Search,
  Filter,
  MoreVertical,
  AlertCircle
} from 'lucide-react';
import { fetchVideos, deleteVideo, updateVideo, reorderVideos } from '../store/slices/videosSlice';
import toast from 'react-hot-toast';

const AdminVideos = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { videos, isLoading } = useSelector((state) => state.videos);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedVideos, setSelectedVideos] = useState([]);

  // Vérifier si l'utilisateur est admin
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h2>
          <p className="text-gray-600">Vous devez être administrateur pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      await dispatch(fetchVideos({ admin: true })).unwrap();
    } catch (error) {
      console.error('Erreur lors du chargement des vidéos:', error);
      toast.error('Erreur lors du chargement des vidéos');
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette vidéo ? Cette action est irréversible.')) {
      return;
    }

    try {
      await dispatch(deleteVideo(videoId)).unwrap();
      toast.success('Vidéo supprimée avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression de la vidéo');
    }
  };

  const handleTogglePublished = async (video) => {
    try {
      await dispatch(updateVideo({
        id: video._id,
        data: { isPublished: !video.isPublished }
      })).unwrap();
      toast.success(`Vidéo ${video.isPublished ? 'dépubliée' : 'publiée'} avec succès`);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour de la vidéo');
    }
  };

  const handleReorder = async (videoId, direction) => {
    try {
      await dispatch(reorderVideos({ videoId, direction })).unwrap();
      toast.success('Ordre mis à jour avec succès');
    } catch (error) {
      console.error('Erreur lors du réordonnement:', error);
      toast.error('Erreur lors du réordonnement');
    }
  };

  const filteredVideos = videos && Array.isArray(videos) ? videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'published' && video.isPublished) ||
                         (filterStatus === 'unpublished' && !video.isPublished);
    
    return matchesSearch && matchesFilter;
  }) : [];

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-red mx-auto mb-4"></div>
          <p className="text-gray-600 font-ginka p-charte">Chargement des vidéos...</p>
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
              <h1 className="h2-charte text-gray-900 font-ginka">Gestion des vidéos</h1>
              <p className="mt-2 text-gray-600 font-ginka p-charte">
                Gérez les vidéos du parcours d'apprentissage
              </p>
            </div>
            <button
              onClick={() => navigate('/admin/videos/upload')}
              className="btn-charte btn-charte-primary flex items-center space-x-2 px-4 py-2"
            >
              <Plus className="w-5 h-5" />
              <span>Ajouter une vidéo</span>
            </button>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher une vidéo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-charte-media focus:ring-2 focus:ring-primary-red focus:border-primary-red font-ginka p-charte"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-charte-media focus:ring-2 focus:ring-primary-red focus:border-primary-red font-ginka p-charte"
              >
                <option value="all">Toutes les vidéos</option>
                <option value="published">Publiées</option>
                <option value="unpublished">Non publiées</option>
              </select>
            </div>
          </div>
        </div>

        {/* Liste des vidéos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {filteredVideos.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2 font-ginka h4-charte">
                {searchTerm || filterStatus !== 'all' ? 'Aucune vidéo trouvée' : 'Aucune vidéo'}
              </h3>
              <p className="text-gray-500 mb-4 font-ginka p-charte">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Essayez de modifier vos critères de recherche'
                  : 'Commencez par ajouter votre première vidéo'
                }
              </p>
              {!searchTerm && filterStatus === 'all' && (
                <button
                  onClick={() => navigate('/admin/videos/upload')}
                  className="btn-charte btn-charte-primary flex items-center space-x-2 px-4 py-2 mx-auto"
                >
                  <Plus className="w-5 h-5" />
                  <span>Ajouter une vidéo</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vidéo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ordre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Détails
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredVideos.map((video) => (
                    <tr key={video._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-16 w-24 bg-gray-200 rounded-charte-media flex items-center justify-center">
                            {video.thumbnail ? (
                              <img
                                src={video.thumbnail}
                                alt={video.title}
                                className="h-16 w-24 object-cover rounded-charte-media thumbnail-charte"
                              />
                            ) : (
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 font-ginka h6-charte">
                              {video.title}
                            </div>
                            <div className="text-sm text-gray-500 truncate max-w-xs font-ginka p-charte">
                              {video.description || 'Aucune description'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleReorder(video._id, 'up')}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Monter"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-medium text-gray-900">
                            {video.order}
                          </span>
                          <button
                            onClick={() => handleReorder(video._id, 'down')}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Descendre"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full font-ginka ${
                          video.isPublished 
                            ? 'bg-green-100 text-section-green' 
                            : 'bg-yellow-100 text-section-yellow'
                        }`}>
                          {video.isPublished ? 'Publiée' : 'Brouillon'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="space-y-1">
                          <div>Durée: {formatDuration(video.duration)}</div>
                          <div>Taille: {formatFileSize(video.fileSize)}</div>
                          <div>Vues: {video.views || 0}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleTogglePublished(video)}
                            className={`p-2 rounded-charte-media transition-colors ${
                              video.isPublished 
                                ? 'text-section-yellow hover:bg-yellow-50' 
                                : 'text-section-green hover:bg-green-50'
                            }`}
                            title={video.isPublished ? 'Dépublier' : 'Publier'}
                          >
                            {video.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => navigate(`/admin/videos/${video._id}/edit`)}
                            className="p-2 text-section-blue hover:bg-blue-50 rounded-charte-media transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteVideo(video._id)}
                            className="p-2 text-primary-red hover:bg-red-50 rounded-charte-media transition-colors"
                            title="Supprimer"
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

export default AdminVideos;
