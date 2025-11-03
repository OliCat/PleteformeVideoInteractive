import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getApi } from '../../utils/api';

// Actions asynchrones pour les quiz

// Récupérer tous les quiz
export const fetchQuizzes = createAsyncThunk(
  'quiz/fetchQuizzes',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const api = await getApi();
      const params = new URLSearchParams();
      
      // Ajouter les filtres aux paramètres de requête
      if (filters.videoId) params.append('videoId', filters.videoId);
      if (filters.difficulty) params.append('difficulty', filters.difficulty);
      // isActive peut venir du UI sous forme de string ('', 'true', 'false')
      // Ne pas envoyer si valeur vide, et normaliser en string explicite
      if (filters.isActive === true || filters.isActive === false) {
        params.append('isActive', String(filters.isActive));
      } else if (filters.isActive === 'true' || filters.isActive === 'false') {
        params.append('isActive', filters.isActive);
      }
      if (filters.tags && filters.tags.length > 0) params.append('tags', filters.tags.join(','));
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(`/quizzes?${params.toString()}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors du chargement des quiz');
    }
  }
);

// Récupérer un quiz par ID
export const fetchQuizById = createAsyncThunk(
  'quiz/fetchQuizById',
  async ({ quizId, includeAnswers = false }, { rejectWithValue }) => {
    try {
      const api = await getApi();
      const response = await api.get(`/quizzes/${quizId}?includeAnswers=${includeAnswers}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors du chargement du quiz');
    }
  }
);

// Récupérer un quiz par ID de vidéo
export const fetchQuizByVideoId = createAsyncThunk(
  'quiz/fetchQuizByVideoId',
  async ({ videoId, includeAnswers = false }, { rejectWithValue }) => {
    try {
      const api = await getApi();
      const response = await api.get(`/quizzes/video/${videoId}?includeAnswers=${includeAnswers}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors du chargement du quiz');
    }
  }
);

// Créer un nouveau quiz
export const createQuiz = createAsyncThunk(
  'quiz/createQuiz',
  async (quizData, { rejectWithValue }) => {
    try {
      const api = await getApi();
      const response = await api.post('/quizzes', quizData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la création du quiz');
    }
  }
);

// Mettre à jour un quiz
export const updateQuiz = createAsyncThunk(
  'quiz/updateQuiz',
  async ({ quizId, quizData }, { rejectWithValue }) => {
    try {
      const api = await getApi();
      const response = await api.put(`/quizzes/${quizId}`, quizData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la mise à jour du quiz');
    }
  }
);

// Supprimer un quiz
export const deleteQuiz = createAsyncThunk(
  'quiz/deleteQuiz',
  async (quizId, { rejectWithValue }) => {
    try {
      const api = await getApi();
      await api.delete(`/quizzes/${quizId}`);
      return quizId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la suppression du quiz');
    }
  }
);

// Évaluer un quiz
export const evaluateQuiz = createAsyncThunk(
  'quiz/evaluateQuiz',
  async ({ quizId, answers }, { rejectWithValue }) => {
    try {
      const api = await getApi();
      const response = await api.post(`/quizzes/${quizId}/evaluate`, { answers });
      console.log('📦 Réponse complète du backend:', response.data);
      // Retourner directement les données du quiz (response.data.data)
      const result = response.data.data || response.data;
      console.log('📤 Données retournées par evaluateQuiz:', result);
      return result;
    } catch (error) {
      console.error('❌ Erreur dans evaluateQuiz:', error);
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de l\'évaluation du quiz');
    }
  }
);

// Récupérer les statistiques d'un quiz
export const fetchQuizStats = createAsyncThunk(
  'quiz/fetchQuizStats',
  async (quizId, { rejectWithValue }) => {
    try {
      const api = await getApi();
      const response = await api.get(`/quizzes/${quizId}/stats`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors du chargement des statistiques');
    }
  }
);

// Basculer le statut d'un quiz
export const toggleQuizStatus = createAsyncThunk(
  'quiz/toggleQuizStatus',
  async (quizId, { rejectWithValue }) => {
    try {
      const api = await getApi();
      const response = await api.patch(`/quizzes/${quizId}/toggle-status`);
      return { quizId, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors du changement de statut');
    }
  }
);

// État initial
const initialState = {
  quizzes: [],
  currentQuiz: null,
  quizByVideo: null,
  quizResult: null,
  isLoading: false,
  error: null,
  success: null,
  filters: {
    videoId: '',
    difficulty: '',
    isActive: undefined,
    tags: '',
    search: ''
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  }
};

// Slice Redux
const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    // Réinitialiser les erreurs et messages de succès
    clearMessages: (state) => {
      state.error = null;
      state.success = null;
    },

    // Réinitialiser le quiz courant
    clearCurrentQuiz: (state) => {
      state.currentQuiz = null;
    },

    // Réinitialiser le quiz par vidéo
    clearQuizByVideo: (state) => {
      state.quizByVideo = null;
    },

    // Mettre à jour les filtres
    updateFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    // Réinitialiser les filtres
    resetFilters: (state) => {
      state.filters = {
        videoId: '',
        difficulty: '',
        isActive: undefined,
        tags: '',
        search: ''
      };
    },

    // Mettre à jour la pagination
    updatePagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },

    // Réinitialiser l'état
    resetQuizState: (state) => {
      state.quizzes = [];
      state.currentQuiz = null;
      state.quizByVideo = null;
      state.isLoading = false;
      state.error = null;
      state.success = null;
      state.filters = {
        videoId: '',
        difficulty: '',
        isActive: undefined,
        tags: '',
        search: ''
      };
      state.pagination = {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      };
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchQuizzes
      .addCase(fetchQuizzes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchQuizzes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.quizzes = action.payload.data || [];
        state.error = null;
      })
      .addCase(fetchQuizzes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // fetchQuizById
      .addCase(fetchQuizById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchQuizById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentQuiz = action.payload.data;
        state.error = null;
      })
      .addCase(fetchQuizById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // fetchQuizByVideoId
      .addCase(fetchQuizByVideoId.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchQuizByVideoId.fulfilled, (state, action) => {
        state.isLoading = false;
        state.quizByVideo = action.payload.data;
        state.error = null;
      })
      .addCase(fetchQuizByVideoId.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // createQuiz
      .addCase(createQuiz.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createQuiz.fulfilled, (state, action) => {
        state.isLoading = false;
        state.quizzes.unshift(action.payload.data);
        state.success = action.payload.message;
        state.error = null;
      })
      .addCase(createQuiz.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // updateQuiz
      .addCase(updateQuiz.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateQuiz.fulfilled, (state, action) => {
        state.isLoading = false;
        const updatedQuiz = action.payload.data;
        
        // Mettre à jour dans la liste des quiz
        const index = state.quizzes.findIndex(q => q._id === updatedQuiz._id);
        if (index !== -1) {
          state.quizzes[index] = updatedQuiz;
        }
        
        // Mettre à jour le quiz courant s'il correspond
        if (state.currentQuiz && state.currentQuiz._id === updatedQuiz._id) {
          state.currentQuiz = updatedQuiz;
        }
        
        // Mettre à jour le quiz par vidéo s'il correspond
        if (state.quizByVideo && state.quizByVideo._id === updatedQuiz._id) {
          state.quizByVideo = updatedQuiz;
        }
        
        state.success = action.payload.message;
        state.error = null;
      })
      .addCase(updateQuiz.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // deleteQuiz
      .addCase(deleteQuiz.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteQuiz.fulfilled, (state, action) => {
        state.isLoading = false;
        const deletedQuizId = action.payload;
        
        // Supprimer de la liste des quiz
        state.quizzes = state.quizzes.filter(q => q._id !== deletedQuizId);
        
        // Supprimer du quiz courant s'il correspond
        if (state.currentQuiz && state.currentQuiz._id === deletedQuizId) {
          state.currentQuiz = null;
        }
        
        // Supprimer du quiz par vidéo s'il correspond
        if (state.quizByVideo && state.quizByVideo._id === deletedQuizId) {
          state.quizByVideo = null;
        }
        
        state.success = 'Quiz supprimé avec succès';
        state.error = null;
      })
      .addCase(deleteQuiz.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // evaluateQuiz
      .addCase(evaluateQuiz.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(evaluateQuiz.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = action.payload.message || 'Quiz évalué avec succès';
        state.error = null;
        // Stocker le résultat du quiz évalué si disponible
        if (action.payload.percentage !== undefined) {
          state.quizResult = action.payload;
        }
      })
      .addCase(evaluateQuiz.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // fetchQuizStats
      .addCase(fetchQuizStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchQuizStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchQuizStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // toggleQuizStatus
      .addCase(toggleQuizStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(toggleQuizStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        const { quizId, isActive } = action.payload.data;
        
        // Mettre à jour dans la liste des quiz
        const index = state.quizzes.findIndex(q => q._id === quizId);
        if (index !== -1) {
          state.quizzes[index].isActive = isActive;
        }
        
        // Mettre à jour le quiz courant s'il correspond
        if (state.currentQuiz && state.currentQuiz._id === quizId) {
          state.currentQuiz.isActive = isActive;
        }
        
        // Mettre à jour le quiz par vidéo s'il correspond
        if (state.quizByVideo && state.quizByVideo._id === quizId) {
          state.quizByVideo.isActive = isActive;
        }
        
        state.success = action.payload.message;
        state.error = null;
      })
      .addCase(toggleQuizStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  }
});

// Export des actions
export const {
  clearMessages,
  clearCurrentQuiz,
  clearQuizByVideo,
  updateFilters,
  resetFilters,
  updatePagination,
  resetQuizState
} = quizSlice.actions;

// Export des sélecteurs
export const selectQuizzes = (state) => state.quiz.quizzes;
export const selectCurrentQuiz = (state) => state.quiz.currentQuiz;
export const selectQuizByVideo = (state) => state.quiz.quizByVideo;
export const selectQuizLoading = (state) => state.quiz.isLoading;
export const selectQuizError = (state) => state.quiz.error;
export const selectQuizSuccess = (state) => state.quiz.success;
export const selectQuizFilters = (state) => state.quiz.filters;
export const selectQuizPagination = (state) => state.quiz.pagination;

// Export du reducer
export default quizSlice.reducer;
