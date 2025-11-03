import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';
import videoService from '../../services/videoService';

// Actions asynchrones
export const fetchVideos = createAsyncThunk(
  'videos/fetchVideos',
  async ({ accessible = false } = {}, { rejectWithValue }) => {
    try {
      const response = accessible 
        ? await videoService.getAccessibleVideos()
        : await videoService.getAllVideos();
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors du chargement des vidéos';
      return rejectWithValue(message);
    }
  }
);

export const fetchLearningPath = createAsyncThunk(
  'videos/fetchLearningPath',
  async (_, { rejectWithValue }) => {
    try {
      const response = await videoService.getLearningPath();
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors du chargement du parcours';
      return rejectWithValue(message);
    }
  }
);

export const fetchVideoById = createAsyncThunk(
  'videos/fetchVideoById',
  async (videoId, { rejectWithValue }) => {
    try {
      const response = await videoService.getVideoById(videoId);
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Vidéo non trouvée';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const uploadVideo = createAsyncThunk(
  'videos/uploadVideo',
  async ({ formData, onUploadProgress }, { rejectWithValue }) => {
    try {
      const response = await videoService.uploadVideo(formData, onUploadProgress);
      toast.success('Vidéo uploadée avec succès');
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de l\'upload de la vidéo';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const createVideo = createAsyncThunk(
  'videos/createVideo',
  async (videoData, { rejectWithValue }) => {
    try {
      const response = await videoService.createVideo(videoData);
      toast.success('Vidéo créée avec succès !');
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de la création de la vidéo';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateVideo = createAsyncThunk(
  'videos/updateVideo',
  async ({ id, videoData }, { rejectWithValue }) => {
    try {
      const response = await videoService.updateVideo(id, videoData);
      toast.success('Vidéo mise à jour avec succès !');
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteVideo = createAsyncThunk(
  'videos/deleteVideo',
  async (videoId, { rejectWithValue }) => {
    try {
      await videoService.deleteVideo(videoId);
      toast.success('Vidéo supprimée avec succès !');
      return videoId;
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de la suppression';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const incrementViewCount = createAsyncThunk(
  'videos/incrementViewCount',
  async (videoId, { rejectWithValue }) => {
    try {
      await videoService.incrementViewCount(videoId);
      return videoId;
    } catch (error) {
      // Ne pas afficher d'erreur pour cette action silencieuse
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const reorderVideos = createAsyncThunk(
  'videos/reorderVideos',
  async ({ videoId, direction }, { rejectWithValue }) => {
    try {
      const response = await videoService.reorderVideos(videoId, direction);
      toast.success('Ordre mis à jour avec succès');
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors du réordonnement';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const initialState = {
  videos: [],
  currentVideo: null,
  accessibleVideos: [],
  isLoading: false,
  error: null,
  totalVideos: 0,
  hasNextPage: false,
  currentPage: 1,
};

const videosSlice = createSlice({
  name: 'videos',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentVideo: (state) => {
      state.currentVideo = null;
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    resetVideos: (state) => {
      state.videos = [];
      state.accessibleVideos = [];
      state.currentVideo = null;
      state.error = null;
      state.currentPage = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Videos
      .addCase(fetchVideos.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVideos.fulfilled, (state, action) => {
        state.isLoading = false;
        // L'API backend retourne { success, count, data }
        // Le service API retourne directement response.data
        const videos = action.payload.data || action.payload.videos || action.payload;
        state.videos = Array.isArray(videos) ? videos : [];
        state.totalVideos = action.payload.count || videos.length || 0;
        state.hasNextPage = action.payload.hasNextPage || false;
        state.error = null;
      })
      .addCase(fetchVideos.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Fetch Video By ID
      .addCase(fetchVideoById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVideoById.fulfilled, (state, action) => {
        state.isLoading = false;
        // Extraire les données de la vidéo depuis la structure de réponse
        state.currentVideo = action.payload.data || action.payload;
        console.log('📹 currentVideo loaded:', state.currentVideo);
        console.log('📝 quizId:', state.currentVideo.quizId);
        state.error = null;
      })
      .addCase(fetchVideoById.rejected, (state, action) => {
        state.isLoading = false;
        state.currentVideo = null;
        state.error = action.payload;
      })
      
      // Create Video
      .addCase(createVideo.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createVideo.fulfilled, (state, action) => {
        state.isLoading = false;
        state.videos.push(action.payload);
        state.totalVideos += 1;
        state.error = null;
      })
      .addCase(createVideo.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Update Video
      .addCase(updateVideo.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateVideo.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.videos.findIndex(video => video._id === action.payload._id);
        if (index !== -1) {
          state.videos[index] = action.payload;
        }
        if (state.currentVideo?._id === action.payload._id) {
          state.currentVideo = action.payload;
        }
        state.error = null;
      })
      .addCase(updateVideo.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Delete Video
      .addCase(deleteVideo.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteVideo.fulfilled, (state, action) => {
        state.isLoading = false;
        state.videos = state.videos.filter(video => video._id !== action.payload);
        state.accessibleVideos = state.accessibleVideos.filter(video => video._id !== action.payload);
        if (state.currentVideo?._id === action.payload) {
          state.currentVideo = null;
        }
        state.totalVideos = Math.max(0, state.totalVideos - 1);
        state.error = null;
      })
      .addCase(deleteVideo.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Increment View Count
      .addCase(incrementViewCount.fulfilled, (state, action) => {
        const videoId = action.payload;
        const video = state.videos.find(v => v._id === videoId);
        if (video) {
          video.viewCount = (video.viewCount || 0) + 1;
        }
        if (state.currentVideo?._id === videoId) {
          state.currentVideo.viewCount = (state.currentVideo.viewCount || 0) + 1;
        }
      })
      
      // Reorder Videos
      .addCase(reorderVideos.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(reorderVideos.fulfilled, (state, action) => {
        state.isLoading = false;
        // Recharger les vidéos pour avoir le bon ordre
        state.videos = action.payload;
        state.error = null;
      })
      .addCase(reorderVideos.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrentVideo, setCurrentPage, resetVideos } = videosSlice.actions;
export default videosSlice.reducer; 