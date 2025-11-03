import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Save, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown,
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createQuiz,
  updateQuiz,
  fetchQuizById,
  clearMessages
} from '../../store/slices/quizSlice';
import { fetchVideos } from '../../store/slices/videosSlice';

const QuizForm = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { quizId } = useParams();
  const { user } = useSelector((state) => state.auth);
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoId: '',
    difficulty: 'intermédiaire',
    passingScore: 70,
    timeLimit: 0,
    isRandomized: false,
    allowRetake: true,
    maxAttempts: 3,
    tags: [],
    questions: []
  });
  
  const [errors, setErrors] = useState({});
  const [videos, setVideos] = useState([]);
  const [tagInput, setTagInput] = useState('');

  // Sélecteurs Redux
  const { isLoading, error, success } = useSelector((state) => state.quiz);

  // Vérifier que l'utilisateur est admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/dashboard');
      toast.error('Accès non autorisé');
    }
  }, [user, navigate]);

  // Charger les vidéos disponibles
  useEffect(() => {
    if (user?.role === 'admin') {
      loadVideos();
    }
  }, [user]);

  // Charger le quiz si on est en mode édition
  useEffect(() => {
    if (quizId && user?.role === 'admin') {
      setIsEditing(true);
      loadQuiz();
    }
  }, [quizId, user]);

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

  const loadVideos = async () => {
    try {
      const response = await dispatch(fetchVideos()).unwrap();
      
      // La réponse peut être soit un tableau directement, soit un objet avec data
      const videosData = Array.isArray(response) ? response : (response.data || []);

      // Filtrer seulement les vidéos publiées pour les quiz
      const publishedVideos = videosData.filter(video => video.isPublished === true);
      setVideos(publishedVideos);
    } catch (error) {
      console.error('Erreur lors du chargement des vidéos:', error);
      toast.error('Erreur lors du chargement des vidéos');
    }
  };

  const loadQuiz = async () => {
    try {
      const response = await dispatch(fetchQuizById({ quizId, includeAnswers: true })).unwrap();
      setFormData(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement du quiz:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newFormData = {
        ...prev,
        [field]: value
      };
      
      // Si le score de passage change, vérifier qu'il ne dépasse pas le total possible
      if (field === 'passingScore') {
        const totalPoints = newFormData.questions.reduce((total, q) => total + (q.points || 0), 0);
        if (value > totalPoints) {
          // Ajuster automatiquement le score de passage au maximum possible
          newFormData.passingScore = totalPoints;
        }
      }
      
      return newFormData;
    });
    
    // Effacer l'erreur pour ce champ
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addQuestion = () => {
    const newQuestion = {
      _id: Date.now().toString(),
      question: '',
      type: 'multiple-choice',
      options: [
        { _id: Date.now().toString() + '_1', text: 'Option 1', isCorrect: true },
        { _id: Date.now().toString() + '_2', text: 'Option 2', isCorrect: false }
      ],
      points: 1,
      timeLimit: 30,
      order: formData.questions.length + 1
    };

    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  const updateQuestion = (questionId, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q._id === questionId) {
          const updatedQuestion = { ...q, [field]: value };
          
          // Si le type change, adapter les options
          if (field === 'type') {
            if (value === 'true-false') {
              // Pour true-false, ajouter automatiquement 2 options (Vrai/Faux)
              updatedQuestion.options = [
                { _id: Date.now().toString() + '_vrai', text: 'Vrai', isCorrect: false },
                { _id: Date.now().toString() + '_faux', text: 'Faux', isCorrect: false }
              ];
              updatedQuestion.correctAnswer = false;
            } else if (value === 'multiple-choice') {
              // Pour multiple-choice, ajouter des options par défaut
              updatedQuestion.options = [
                { _id: Date.now().toString() + '_1', text: 'Option 1', isCorrect: true },
                { _id: Date.now().toString() + '_2', text: 'Option 2', isCorrect: false }
              ];
            } else if (value === 'text-input') {
              // Pour text-input, pas d'options
              updatedQuestion.options = [];
              updatedQuestion.correctAnswer = '';
            }
          }
          
          return updatedQuestion;
        }
        return q;
      })
    }));
  };

  const updateQuestionOption = (questionId, optionId, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q._id === questionId) {
          return {
            ...q,
            options: q.options.map(opt => 
              opt._id === optionId ? { ...opt, [field]: value } : opt
            )
          };
        }
        return q;
      })
    }));
  };

  const addOption = (questionId) => {
    const newOption = {
      _id: Date.now().toString(),
      text: '',
      isCorrect: false
    };

    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q._id === questionId) {
          return {
            ...q,
            options: [...q.options, newOption]
          };
        }
        return q;
      })
    }));
  };

  const removeOption = (questionId, optionId) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q._id === questionId) {
          const filteredOptions = q.options.filter(opt => opt._id !== optionId);
          // S'assurer qu'il y a au moins une option correcte
          if (filteredOptions.length > 0 && !filteredOptions.some(opt => opt.isCorrect)) {
            filteredOptions[0].isCorrect = true;
          }
          return { ...q, options: filteredOptions };
        }
        return q;
      })
    }));
  };

  const removeQuestion = (questionId) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q._id !== questionId)
    }));
  };

  const moveQuestion = (questionId, direction) => {
    const currentIndex = formData.questions.findIndex(q => q._id === questionId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= formData.questions.length) return;

    const newQuestions = [...formData.questions];
    [newQuestions[currentIndex], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[currentIndex]];
    
    // Mettre à jour l'ordre
    newQuestions.forEach((q, index) => {
      q.order = index + 1;
    });

    setFormData(prev => ({
      ...prev,
      questions: newQuestions
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Le titre est requis';
    }

    if (!formData.videoId) {
      newErrors.videoId = 'La vidéo est requise';
    }

    if (formData.passingScore < 1 || formData.passingScore > 100) {
      newErrors.passingScore = 'Le score de passage doit être entre 1 et 100';
    }

    if (formData.questions.length === 0) {
      newErrors.questions = 'Au moins une question est requise';
    }

    // Valider chaque question
    formData.questions.forEach((question, index) => {
      if (!question.question.trim()) {
        newErrors[`question_${index}`] = 'La question est requise';
      }

      if (question.type === 'multiple-choice') {
        if (question.options.length < 2) {
          newErrors[`question_${index}_options`] = 'Au moins 2 options sont requises';
        }

        if (!question.options.some(opt => opt.isCorrect)) {
          newErrors[`question_${index}_correct`] = 'Au moins une option doit être correcte';
        }

        question.options.forEach((option, optIndex) => {
          if (!option.text.trim()) {
            newErrors[`question_${index}_option_${optIndex}`] = 'Le texte de l\'option est requis';
          }
        });
      }

      if (question.type === 'text-input' && !question.correctAnswer?.trim()) {
        newErrors[`question_${index}_correct`] = 'La réponse correcte est requise';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    try {
      if (isEditing) {
        await dispatch(updateQuiz({ quizId, quizData: formData })).unwrap();
      } else {
        await dispatch(createQuiz(formData)).unwrap();
        // Attendre un peu pour que le state soit mis à jour
        setTimeout(() => {
          navigate('/admin/quizzes');
        }, 100);
      }
      
      if (isEditing) {
        navigate('/admin/quizzes');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  if (user?.role !== 'admin') {
    return null;
  }

  if (isLoading && isEditing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-red"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="h2-charte text-gray-900 font-ginka">
                {isEditing ? 'Modifier le Quiz' : 'Créer un Quiz'}
              </h1>
              <p className="mt-2 text-gray-600 font-ginka p-charte">
                {isEditing ? 'Modifiez les paramètres de votre quiz' : 'Créez un nouveau quiz interactif'}
              </p>
            </div>
            <button
              onClick={() => navigate('/admin/quizzes')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-charte-media text-gray-700 bg-white hover:bg-gray-50 font-ginka p-charte"
            >
              <X className="w-5 h-5 mr-2" />
              Annuler
            </button>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Informations générales */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 font-ginka h4-charte">
              Informations générales
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-ginka p-charte">
                  Titre du quiz *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className={`w-full border rounded-charte-media px-3 py-2 focus:ring-primary-red focus:border-primary-red font-ginka p-charte ${
                    errors.title ? 'border-primary-red' : 'border-gray-300'
                  }`}
                  placeholder="Ex: Quiz sur la sécurité informatique"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-ginka p-charte">
                  Vidéo associée *
                </label>
                <select
                  value={formData.videoId}
                  onChange={(e) => handleInputChange('videoId', e.target.value)}
                  className={`w-full border rounded-charte-media px-3 py-2 focus:ring-primary-red focus:border-primary-red font-ginka p-charte ${
                    errors.videoId ? 'border-primary-red' : 'border-gray-300'
                  }`}
                >
                  <option value="">Sélectionner une vidéo</option>
                  {videos.map(video => (
                    <option key={video._id} value={video._id}>
                      {video.title} (ID: {video._id})
                    </option>
                  ))}
                </select>
                {errors.videoId && (
                  <p className="mt-1 text-sm text-red-600">{errors.videoId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-ginka p-charte">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-charte-media px-3 py-2 focus:ring-primary-red focus:border-primary-red font-ginka p-charte"
                  placeholder="Description optionnelle du quiz"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-ginka p-charte">
                  Difficulté
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => handleInputChange('difficulty', e.target.value)}
                  className="w-full border border-gray-300 rounded-charte-media px-3 py-2 focus:ring-primary-red focus:border-primary-red font-ginka p-charte"
                >
                  <option value="facile">Facile</option>
                  <option value="intermédiaire">Intermédiaire</option>
                  <option value="difficile">Difficile</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-ginka p-charte">
                  Score de passage (points) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={formData.questions.reduce((total, q) => total + (q.points || 0), 0) || 100}
                  value={formData.passingScore}
                  onChange={(e) => handleInputChange('passingScore', parseInt(e.target.value))}
                  className={`w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.passingScore ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Score total possible : {formData.questions.reduce((total, q) => total + (q.points || 0), 0)} points
                </p>
                {errors.passingScore && (
                  <p className="mt-1 text-sm text-red-600">{errors.passingScore}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-ginka p-charte">
                  Limite de temps (secondes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="3600"
                  value={formData.timeLimit}
                  onChange={(e) => handleInputChange('timeLimit', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-charte-media px-3 py-2 focus:ring-primary-red focus:border-primary-red font-ginka p-charte"
                  placeholder="0 = pas de limite"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-ginka p-charte"
                    style={{ backgroundColor: '#E8F4FD', color: '#2D74BA' }}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-section-blue hover:text-blue-800 font-ginka p-charte"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  className="flex-1 border border-gray-300 rounded-l-charte-media px-3 py-2 focus:ring-primary-red focus:border-primary-red font-ginka p-charte"
                  placeholder="Ajouter un tag (Entrée ou virgule)"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="btn-charte btn-charte-primary px-4 py-2 rounded-r-charte-media"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Options avancées */}
            <div className="mt-6 space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isRandomized"
                  checked={formData.isRandomized}
                  onChange={(e) => handleInputChange('isRandomized', e.target.checked)}
                  className="h-4 w-4 text-primary-red focus:ring-primary-red border-gray-300 rounded-charte-media"
                />
                <label htmlFor="isRandomized" className="ml-2 text-sm text-gray-700">
                  Mélanger les questions
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowRetake"
                  checked={formData.allowRetake}
                  onChange={(e) => handleInputChange('allowRetake', e.target.checked)}
                  className="h-4 w-4 text-primary-red focus:ring-primary-red border-gray-300 rounded-charte-media"
                />
                <label htmlFor="allowRetake" className="ml-2 text-sm text-gray-700">
                  Autoriser les nouvelles tentatives
                </label>
              </div>

              {formData.allowRetake && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-ginka p-charte">
                    Nombre maximum de tentatives
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.maxAttempts}
                    onChange={(e) => handleInputChange('maxAttempts', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-charte-media px-3 py-2 focus:ring-primary-red focus:border-primary-red font-ginka p-charte"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Questions */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900 font-ginka h4-charte">
                Questions ({formData.questions.length})
              </h2>
              <button
                type="button"
                onClick={addQuestion}
                className="btn-charte btn-charte-primary inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-charte-media"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une question
              </button>
            </div>

            {errors.questions && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                  <p className="text-sm text-red-600">{errors.questions}</p>
                </div>
              </div>
            )}

            {formData.questions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Aucune question ajoutée. Commencez par ajouter votre première question.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {formData.questions.map((question, index) => (
                  <div key={question._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900 font-ginka h4-charte">
                        Question {question.order}
                      </h3>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => moveQuestion(question._id, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveQuestion(question._id, 'down')}
                          disabled={index === formData.questions.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeQuestion(question._id)}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 font-ginka p-charte">
                          Type de question
                        </label>
                        <select
                          value={question.type}
                          onChange={(e) => updateQuestion(question._id, 'type', e.target.value)}
                          className="w-full border border-gray-300 rounded-charte-media px-3 py-2 focus:ring-primary-red focus:border-primary-red font-ginka p-charte"
                        >
                          <option value="multiple-choice">Choix multiples</option>
                          <option value="true-false">Vrai/Faux</option>
                          <option value="text-input">Texte libre</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 font-ginka p-charte">
                          Points
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={question.points}
                          onChange={(e) => updateQuestion(question._id, 'points', parseInt(e.target.value))}
                          className="w-full border border-gray-300 rounded-charte-media px-3 py-2 focus:ring-primary-red focus:border-primary-red font-ginka p-charte"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 font-ginka p-charte">
                          Temps limite (secondes)
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="300"
                          value={question.timeLimit}
                          onChange={(e) => updateQuestion(question._id, 'timeLimit', parseInt(e.target.value))}
                          className="w-full border border-gray-300 rounded-charte-media px-3 py-2 focus:ring-primary-red focus:border-primary-red font-ginka p-charte"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2 font-ginka p-charte">
                        Question *
                      </label>
                      <textarea
                        value={question.question}
                        onChange={(e) => updateQuestion(question._id, 'question', e.target.value)}
                        rows={3}
                        className={`w-full border rounded-charte-media px-3 py-2 focus:ring-primary-red focus:border-primary-red font-ginka p-charte ${
                          errors[`question_${index}`] ? 'border-primary-red' : 'border-gray-300'
                        }`}
                        placeholder="Entrez votre question..."
                      />
                      {errors[`question_${index}`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`question_${index}`]}</p>
                      )}
                    </div>

                    {/* Options pour choix multiples */}
                    {question.type === 'multiple-choice' && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Options *
                          </label>
                          <button
                            type="button"
                            onClick={() => addOption(question._id)}
                            className="text-sm text-section-blue hover:text-blue-800 font-ginka p-charte"
                          >
                            <Plus className="w-4 h-4 inline mr-1" />
                            Ajouter une option
                          </button>
                        </div>

                        {errors[`question_${index}_options`] && (
                          <p className="mb-2 text-sm text-red-600">{errors[`question_${index}_options`]}</p>
                        )}

                        <div className="space-y-2">
                          {question.options.map((option, optIndex) => (
                            <div key={option._id} className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={option.isCorrect}
                                onChange={(e) => {
                                  // Permettre plusieurs réponses correctes avec checkbox
                                  updateQuestionOption(question._id, option._id, 'isCorrect', e.target.checked);
                                }}
                                className="h-4 w-4 text-primary-red focus:ring-primary-red border-gray-300 rounded-charte-media"
                                title="Cocher pour marquer cette réponse comme correcte"
                              />
                              <input
                                type="text"
                                value={option.text}
                                onChange={(e) => updateQuestionOption(question._id, option._id, 'text', e.target.value)}
                                className={`flex-1 border rounded-charte-media px-3 py-2 focus:ring-primary-red focus:border-primary-red font-ginka p-charte ${
                                  errors[`question_${index}_option_${optIndex}`] ? 'border-primary-red' : 'border-gray-300'
                                }`}
                                placeholder="Texte de l'option"
                              />
                              {option.isCorrect && (
                                <span className="text-green-600 text-sm font-medium">✓ Correcte</span>
                              )}
                              {question.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removeOption(question._id, option._id)}
                                  className="p-1 text-red-400 hover:text-red-600"
                                  title="Supprimer cette option"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        <p className="mt-2 text-sm text-gray-500">
                          💡 Vous pouvez cocher plusieurs réponses comme correctes
                        </p>

                        {errors[`question_${index}_correct`] && (
                          <p className="mt-2 text-sm text-red-600">{errors[`question_${index}_correct`]}</p>
                        )}
                      </div>
                    )}

                    {/* Réponse correcte pour vrai/faux */}
                    {question.type === 'true-false' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 font-ginka p-charte">
                          Réponse correcte
                        </label>
                        <div className="flex space-x-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`correct_${question._id}`}
                              value="true"
                              checked={question.correctAnswer === true}
                              onChange={(e) => updateQuestion(question._id, 'correctAnswer', e.target.value === 'true')}
                              className="h-4 w-4 text-primary-red focus:ring-primary-red border-gray-300 rounded-charte-media"
                            />
                            <span className="ml-2 text-sm text-gray-700">Vrai</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`correct_${question._id}`}
                              value="false"
                              checked={question.correctAnswer === false}
                              onChange={(e) => updateQuestion(question._id, 'correctAnswer', e.target.value === 'true')}
                              className="h-4 w-4 text-primary-red focus:ring-primary-red border-gray-300 rounded-charte-media"
                            />
                            <span className="ml-2 text-sm text-gray-700">Faux</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Réponse correcte pour texte libre */}
                    {question.type === 'text-input' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 font-ginka p-charte">
                          Réponse correcte *
                        </label>
                        <input
                          type="text"
                          value={question.correctAnswer || ''}
                          onChange={(e) => updateQuestion(question._id, 'correctAnswer', e.target.value)}
                          className={`w-full border rounded-charte-media px-3 py-2 focus:ring-primary-red focus:border-primary-red font-ginka p-charte ${
                            errors[`question_${index}_correct`] ? 'border-primary-red' : 'border-gray-300'
                          }`}
                          placeholder="Réponse attendue"
                        />
                        {errors[`question_${index}_correct`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`question_${index}_correct`]}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/admin/quizzes')}
              className="px-6 py-3 border border-gray-300 text-sm font-medium rounded-charte-media text-gray-700 bg-white hover:bg-gray-50 font-ginka p-charte"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-charte btn-charte-primary inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-charte-media focus:outline-none disabled:opacity-50"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isEditing ? 'Mettre à jour' : 'Créer le Quiz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuizForm;
