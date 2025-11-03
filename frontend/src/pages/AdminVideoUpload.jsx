import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Upload,
  Video,
  FileText,
  Clock,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { uploadVideo, fetchVideoById, updateVideo } from '../store/slices/videosSlice';
import toast from 'react-hot-toast';

const AdminVideoUpload = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { videoId } = useParams();
  const { user } = useSelector((state) => state.auth);
  const { isLoading, currentVideo } = useSelector((state) => state.videos);

  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    order: '',
    isPublished: false
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);

  // Vérifier si on est en mode édition
  useEffect(() => {
    if (videoId) {
      setIsEditMode(true);
      setIsLoadingVideo(true);
      dispatch(fetchVideoById(videoId))
        .unwrap()
        .then((video) => {
          setFormData({
            title: video.title || '',
            description: video.description || '',
            order: video.order || '',
            isPublished: video.isPublished || false
          });
          setIsLoadingVideo(false);
        })
        .catch((error) => {
          console.error('Erreur lors du chargement de la vidéo:', error);
          toast.error('Erreur lors du chargement de la vidéo');
          setIsLoadingVideo(false);
        });
    }
  }, [videoId, dispatch]);

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

  // Afficher le spinner de chargement pendant le chargement de la vidéo en mode édition
  if (isEditMode && isLoadingVideo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-red mx-auto mb-4"></div>
          <p className="text-gray-600 font-ginka p-charte">Chargement de la vidéo...</p>
        </div>
      </div>
    );
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Vérifier le type de fichier
      if (!file.type.startsWith('video/')) {
        toast.error('Veuillez sélectionner un fichier vidéo valide');
        return;
      }
      
      // Vérifier la taille (max 500MB)
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (file.size > maxSize) {
        toast.error('Le fichier est trop volumineux (max 500MB)');
        return;
      }
      
      setSelectedFile(file);
      toast.success('Fichier sélectionné avec succès');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Veuillez saisir un titre pour la vidéo');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      if (isEditMode) {
        // Mode édition - mettre à jour la vidéo existante
        console.log('🔍 Frontend - Mode édition - formData:', formData);

        await dispatch(updateVideo({
          id: videoId,
          videoData: formData
        })).unwrap();

        toast.success('Vidéo mise à jour avec succès !');
      } else {
        // Mode upload - uploader une nouvelle vidéo
        if (!selectedFile) {
          toast.error('Veuillez sélectionner un fichier vidéo');
          return;
        }

        console.log('🔍 Frontend - selectedFile:', selectedFile);
        console.log('🔍 Frontend - formData:', formData);

        const uploadData = new FormData();
        uploadData.append('video', selectedFile);
        uploadData.append('title', formData.title);
        uploadData.append('description', formData.description);
        uploadData.append('order', formData.order);
        uploadData.append('isPublished', formData.isPublished);

        console.log('🔍 Frontend - FormData entries:');
        for (let [key, value] of uploadData.entries()) {
          console.log(`  ${key}:`, value);
        }

        await dispatch(uploadVideo({
          formData: uploadData,
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        })).unwrap();

        toast.success('Vidéo uploadée avec succès !');

        // Réinitialiser le formulaire
        setFormData({
          title: '',
          description: '',
          order: '',
          isPublished: false
        });
        setSelectedFile(null);
        setUploadProgress(0);
      }

      // Rediriger vers la liste des vidéos
      navigate('/admin/videos');

    } catch (error) {
      console.error('Erreur lors de l\'opération:', error);
      toast.error(error.message || 'Erreur lors de l\'opération');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        setSelectedFile(file);
        toast.success('Fichier déposé avec succès');
      } else {
        toast.error('Veuillez déposer un fichier vidéo valide');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="h2-charte text-gray-900 font-ginka">
                {isEditMode ? 'Modifier la vidéo' : 'Upload de vidéo'}
              </h1>
              <p className="mt-2 text-gray-600 font-ginka p-charte">
                {isEditMode
                  ? 'Modifiez les informations de la vidéo'
                  : 'Ajoutez une nouvelle vidéo au parcours d\'apprentissage'
                }
              </p>
            </div>
            <button
              onClick={() => navigate('/admin/videos')}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors font-ginka p-charte"
            >
              <X className="w-5 h-5" />
              <span>Annuler</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Zone de drop pour le fichier */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center font-ginka h4-charte">
              <Video className="w-5 h-5 mr-2" />
              {isEditMode ? 'Fichier vidéo (optionnel)' : 'Fichier vidéo'}
            </h2>

            <div
              className={`border-2 border-dashed rounded-charte-media p-8 text-center transition-colors ${
                selectedFile
                  ? 'border-section-green bg-green-50'
                  : isEditMode
                    ? 'border-section-blue bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-4">
                  <CheckCircle className="w-12 h-12 text-section-green mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-900 font-ginka h5-charte">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500 font-ginka p-charte">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-primary-red hover:text-red-700 text-sm font-ginka p-charte"
                  >
                    Supprimer le fichier
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-900 font-ginka h5-charte">
                      {isEditMode
                        ? 'Glissez-déposez un nouveau fichier vidéo ici (optionnel)'
                        : 'Glissez-déposez votre vidéo ici'
                      }
                    </p>
                    <p className="text-gray-500 font-ginka p-charte">ou</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-charte btn-charte-primary mt-2 px-4 py-2"
                    >
                      Sélectionner un fichier
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 font-ginka p-charte">
                    {isEditMode
                      ? 'Formats supportés: MP4, AVI, MOV, WMV (max 500MB) - Laissez vide pour garder le fichier existant'
                      : 'Formats supportés: MP4, AVI, MOV, WMV (max 500MB)'
                    }
                  </p>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Barre de progression */}
            {isUploading && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2 font-ginka p-charte">
                  <span>Upload en cours...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-section-blue h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Informations de la vidéo */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center font-ginka h4-charte">
              <FileText className="w-5 h-5 mr-2" />
              Informations de la vidéo
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2 font-ginka p-charte">
                  Titre *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-charte-media focus:ring-2 focus:ring-primary-red focus:border-primary-red font-ginka p-charte"
                  placeholder="Titre de la vidéo"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2 font-ginka p-charte">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-charte-media focus:ring-2 focus:ring-primary-red focus:border-primary-red font-ginka p-charte"
                  placeholder="Description de la vidéo (optionnel)"
                />
              </div>
              
              <div>
                <label htmlFor="order" className="block text-sm font-medium text-gray-700 mb-2 font-ginka p-charte">
                  Ordre dans le parcours
                </label>
                <input
                  type="text"
                  id="order"
                  name="order"
                  value={formData.order}
                  onChange={handleInputChange}
                  placeholder="L'ordre sera calculé automatiquement"
                  className="w-full px-3 py-2 border border-gray-300 rounded-charte-media focus:ring-2 focus:ring-primary-red focus:border-primary-red font-ginka p-charte"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublished"
                  name="isPublished"
                  checked={formData.isPublished}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-red focus:ring-primary-red border-gray-300 rounded-charte-media"
                />
                <label htmlFor="isPublished" className="ml-2 block text-sm text-gray-700 font-ginka p-charte">
                  Publier immédiatement
                </label>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/admin/videos')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-charte-media hover:bg-gray-50 transition-colors font-ginka p-charte"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isUploading || !formData.title.trim() || (isEditMode ? false : !selectedFile)}
              className="btn-charte btn-charte-primary flex items-center space-x-2 px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{isEditMode ? 'Mise à jour en cours...' : 'Upload en cours...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>{isEditMode ? 'Mettre à jour la vidéo' : 'Uploader la vidéo'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminVideoUpload;
