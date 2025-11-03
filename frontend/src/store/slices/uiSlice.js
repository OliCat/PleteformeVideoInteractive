import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Gestion du loading global
  isGlobalLoading: false,
  loadingMessage: '',
  
  // Gestion des modals
  modals: {
    deleteConfirm: {
      isOpen: false,
      title: '',
      message: '',
      onConfirm: null,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
    },
    videoUpload: {
      isOpen: false,
    },
    quizCreation: {
      isOpen: false,
      videoId: null,
    },
    userProfile: {
      isOpen: false,
    },
  },
  
  // Gestion des notifications
  notifications: [],
  
  // Paramètres d'affichage
  sidebarCollapsed: false,
  theme: 'light',
  
  // État du lecteur vidéo
  videoPlayer: {
    isFullscreen: false,
    volume: 1,
    playbackRate: 1,
    quality: 'auto',
    showControls: true,
    showCaptions: false,
  },
  
  // État du quiz
  quizState: {
    isFullscreen: false,
    showHints: true,
    autoNext: false,
  },
  
  // Pagination et filtres
  filters: {
    videos: {
      search: '',
      status: 'all',
      sortBy: 'order',
      sortOrder: 'asc',
    },
    users: {
      search: '',
      role: 'all',
      isActive: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
    quizzes: {
      search: '',
      videoId: null,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Loading global
    setGlobalLoading: (state, action) => {
      const { isLoading, message = '' } = action.payload;
      state.isGlobalLoading = isLoading;
      state.loadingMessage = message;
    },
    
    // Gestion des modals
    openModal: (state, action) => {
      const { modalName, props = {} } = action.payload;
      if (state.modals[modalName]) {
        state.modals[modalName] = {
          ...state.modals[modalName],
          isOpen: true,
          ...props,
        };
      }
    },
    
    closeModal: (state, action) => {
      const modalName = action.payload;
      if (state.modals[modalName]) {
        state.modals[modalName] = {
          ...initialState.modals[modalName],
          isOpen: false,
        };
      }
    },
    
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach(modalName => {
        state.modals[modalName] = {
          ...initialState.modals[modalName],
          isOpen: false,
        };
      });
    },
    
    // Gestion des notifications
    addNotification: (state, action) => {
      const notification = {
        id: Date.now() + Math.random(),
        type: 'info',
        autoClose: true,
        duration: 5000,
        ...action.payload,
      };
      state.notifications.push(notification);
    },
    
    removeNotification: (state, action) => {
      const id = action.payload;
      state.notifications = state.notifications.filter(n => n.id !== id);
    },
    
    clearAllNotifications: (state) => {
      state.notifications = [];
    },
    
    // Sidebar
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    
    setSidebarCollapsed: (state, action) => {
      state.sidebarCollapsed = action.payload;
    },
    
    // Thème
    setTheme: (state, action) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
    },
    
    // Lecteur vidéo
    updateVideoPlayerSettings: (state, action) => {
      state.videoPlayer = {
        ...state.videoPlayer,
        ...action.payload,
      };
    },
    
    setVideoFullscreen: (state, action) => {
      state.videoPlayer.isFullscreen = action.payload;
    },
    
    setVideoVolume: (state, action) => {
      state.videoPlayer.volume = Math.max(0, Math.min(1, action.payload));
    },
    
    setVideoPlaybackRate: (state, action) => {
      state.videoPlayer.playbackRate = action.payload;
    },
    
    setVideoQuality: (state, action) => {
      state.videoPlayer.quality = action.payload;
    },
    
    toggleVideoControls: (state) => {
      state.videoPlayer.showControls = !state.videoPlayer.showControls;
    },
    
    toggleVideoCaptions: (state) => {
      state.videoPlayer.showCaptions = !state.videoPlayer.showCaptions;
    },
    
    // Quiz
    updateQuizSettings: (state, action) => {
      state.quizState = {
        ...state.quizState,
        ...action.payload,
      };
    },
    
    setQuizFullscreen: (state, action) => {
      state.quizState.isFullscreen = action.payload;
    },
    
    toggleQuizHints: (state) => {
      state.quizState.showHints = !state.quizState.showHints;
    },
    
    toggleQuizAutoNext: (state) => {
      state.quizState.autoNext = !state.quizState.autoNext;
    },
    
    // Filtres
    updateFilter: (state, action) => {
      const { section, key, value } = action.payload;
      if (state.filters[section]) {
        state.filters[section][key] = value;
      }
    },
    
    resetFilters: (state, action) => {
      const section = action.payload;
      if (state.filters[section]) {
        state.filters[section] = initialState.filters[section];
      }
    },
    
    resetAllFilters: (state) => {
      state.filters = { ...initialState.filters };
    },
    
    // Reset UI
    resetUI: (state) => {
      return {
        ...initialState,
        theme: state.theme, // Garder le thème
        videoPlayer: {
          ...initialState.videoPlayer,
          volume: state.videoPlayer.volume, // Garder le volume
        },
      };
    },
  },
});

export const {
  setGlobalLoading,
  openModal,
  closeModal,
  closeAllModals,
  addNotification,
  removeNotification,
  clearAllNotifications,
  toggleSidebar,
  setSidebarCollapsed,
  setTheme,
  updateVideoPlayerSettings,
  setVideoFullscreen,
  setVideoVolume,
  setVideoPlaybackRate,
  setVideoQuality,
  toggleVideoControls,
  toggleVideoCaptions,
  updateQuizSettings,
  setQuizFullscreen,
  toggleQuizHints,
  toggleQuizAutoNext,
  updateFilter,
  resetFilters,
  resetAllFilters,
  resetUI,
} = uiSlice.actions;

export default uiSlice.reducer; 