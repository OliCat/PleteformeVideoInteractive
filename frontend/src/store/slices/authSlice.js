import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';

// Import dynamique d'api pour éviter les cycles
const getApi = async () => {
  const { default: api } = await import('../../services/api');
  return api;
};

// Actions async avec appels API directs
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const api = await getApi();
      const response = await api.post('/auth/login', { 
        email,
        password 
      });
      
      if (response.success) {
        localStorage.setItem('token', response.token);
        toast.success(response.message || 'Connexion réussie');
        return response;
      } else {
        throw new Error(response.message || 'Erreur de connexion');
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Erreur de connexion';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const api = await getApi();
      const response = await api.post('/auth/register', userData);
      
      if (response.success) {
        toast.success(response.message || 'Inscription réussie');
        return response;
      } else {
        throw new Error(response.message || 'Erreur d\'inscription');
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Erreur d\'inscription';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const api = await getApi();
      const response = await api.get('/auth/me');
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la récupération de l\'utilisateur');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (userData, { rejectWithValue }) => {
    try {
      const api = await getApi();
      const response = await api.put('/auth/profile', userData);
      
      if (response.success) {
        toast.success(response.message || 'Profil mis à jour');
        return response;
      } else {
        throw new Error(response.message || 'Erreur de mise à jour');
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Erreur de mise à jour';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const api = await getApi();
      await api.post('/auth/logout');
      localStorage.removeItem('token');
      toast.success('Déconnexion réussie');
      return null;
    } catch (error) {
      localStorage.removeItem('token');
      return null; // On force la déconnexion même en cas d'erreur
    }
  }
);

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetAuth: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('token');
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.data?.user || action.payload.user;
        state.token = action.payload.data?.token || action.payload.token;
        state.error = null;
        
        // Stocker le token dans localStorage
        if (state.token) {
          localStorage.setItem('token', state.token);
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = action.payload;
      })
      
      // Register
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      
      // Get Current User
      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.data?.user || action.payload;
        state.error = null;
        
        // S'assurer que le token est dans localStorage
        if (state.token && !localStorage.getItem('token')) {
          localStorage.setItem('token', state.token);
        }
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = action.payload;
      });
  },
});

export const { clearError, resetAuth } = authSlice.actions;
export default authSlice.reducer; 