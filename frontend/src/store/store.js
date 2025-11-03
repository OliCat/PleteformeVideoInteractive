import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import videosSlice from './slices/videosSlice';
import quizSlice from './slices/quizSlice';
import progressSlice from './slices/progressSlice';
import usersSlice from './slices/usersSlice';
import uiSlice from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    videos: videosSlice,
    quiz: quizSlice,
    progress: progressSlice,
    users: usersSlice,
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
}); 