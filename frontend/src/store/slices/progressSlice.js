import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';
import progressService from '../../services/progressService';

// Actions asynchrones
export const fetchUserProgress = createAsyncThunk(
  'progress/fetchUserProgress',
  async (_, { rejectWithValue }) => {
    try {
      const response = await progressService.getUserProgress();
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors du chargement de la progression';
      return rejectWithValue(message);
    }
  }
);

export const recordWatchSession = createAsyncThunk(
  'progress/recordWatchSession',
  async ({ videoId, startTime, endTime, duration }, { rejectWithValue }) => {
    try {
      const response = await progressService.recordWatchSession({
        videoId,
        startTime,
        endTime,
        duration
      });
      return response;
    } catch (error) {
      // Ne pas afficher d'erreur pour cette action silencieuse
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

export const completeVideo = createAsyncThunk(
  'progress/completeVideo',
  async (videoId, { rejectWithValue }) => {
    try {
      const response = await progressService.completeVideo(videoId);
      toast.success('🎉 Vidéo terminée ! Prochaine vidéo débloquée.');
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de la completion';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const getProgressStats = createAsyncThunk(
  'progress/getProgressStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await progressService.getProgressStats();
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors du chargement des statistiques';
      return rejectWithValue(message);
    }
  }
);

export const getAllUsersProgress = createAsyncThunk(
  'progress/getAllUsersProgress',
  async (_, { rejectWithValue }) => {
    try {
      const response = await progressService.getAllUsersProgress();
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors du chargement de la progression des utilisateurs';
      return rejectWithValue(message);
    }
  }
);

export const getGlobalStats = createAsyncThunk(
  'progress/getGlobalStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await progressService.getGlobalStats();
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors du chargement des statistiques globales';
      return rejectWithValue(message);
    }
  }
);

const initialState = {
  userProgress: null,
  progressStats: null,
  allUsersProgress: [],
  globalStats: null,
  isLoading: false,
  error: null,
  // État local pour le tracking vidéo
  currentVideoId: null,
  sessionStartTime: null,
  totalWatchTime: 0,
  lastPosition: 0,
};

const progressSlice = createSlice({
  name: 'progress',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    startVideoSession: (state, action) => {
      const { videoId, position = 0 } = action.payload;
      state.currentVideoId = videoId;
      state.sessionStartTime = Date.now();
      state.lastPosition = position;
    },
    updateVideoPosition: (state, action) => {
      const { position } = action.payload;
      state.lastPosition = position;
    },
    pauseVideoSession: (state) => {
      if (state.sessionStartTime) {
        const sessionTime = Math.floor((Date.now() - state.sessionStartTime) / 1000);
        state.totalWatchTime += sessionTime;
        state.sessionStartTime = null;
      }
    },
    resumeVideoSession: (state) => {
      state.sessionStartTime = Date.now();
    },
    endVideoSession: (state) => {
      if (state.sessionStartTime) {
        const sessionTime = Math.floor((Date.now() - state.sessionStartTime) / 1000);
        state.totalWatchTime += sessionTime;
      }
      state.currentVideoId = null;
      state.sessionStartTime = null;
      state.totalWatchTime = 0;
      state.lastPosition = 0;
    },
    resetProgress: (state) => {
      state.userProgress = null;
      state.progressStats = null;
      state.allUsersProgress = [];
      state.error = null;
      state.currentVideoId = null;
      state.sessionStartTime = null;
      state.totalWatchTime = 0;
      state.lastPosition = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch User Progress
      .addCase(fetchUserProgress.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserProgress.fulfilled, (state, action) => {
        state.isLoading = false;
        state.userProgress = action.payload;
        state.error = null;
      })
      .addCase(fetchUserProgress.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Record Watch Session
      .addCase(recordWatchSession.fulfilled, (state, action) => {
        // Mettre à jour la progression locale si disponible
        if (state.userProgress && action.payload) {
          const videoProgress = state.userProgress.videoWatchTimes?.find(
            vw => vw.videoId === action.payload.videoId
          );
          if (videoProgress) {
            videoProgress.totalWatchTime = action.payload.totalWatchTime;
            videoProgress.lastWatchedPosition = action.payload.lastWatchedPosition;
            videoProgress.completionPercentage = action.payload.completionPercentage;
          }
        }
      })
      
      // Complete Video
      .addCase(completeVideo.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(completeVideo.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.userProgress) {
          state.userProgress = action.payload;
        }
        state.error = null;
      })
      .addCase(completeVideo.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Get Progress Stats
      .addCase(getProgressStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getProgressStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.progressStats = action.payload;
        state.error = null;
      })
      .addCase(getProgressStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Get All Users Progress (Admin)
      .addCase(getAllUsersProgress.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getAllUsersProgress.fulfilled, (state, action) => {
        state.isLoading = false;
        state.allUsersProgress = action.payload;
        state.error = null;
      })
      .addCase(getAllUsersProgress.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Get Global Stats (Admin)
      .addCase(getGlobalStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getGlobalStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.globalStats = action.payload;
        state.error = null;
      })
      .addCase(getGlobalStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  startVideoSession,
  updateVideoPosition,
  pauseVideoSession,
  resumeVideoSession,
  endVideoSession,
  resetProgress,
} = progressSlice.actions;

export default progressSlice.reducer; 