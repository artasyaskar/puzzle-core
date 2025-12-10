import React, { createContext, useContext, useReducer, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  loading: true,
  error: null,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        loading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        loading: false,
        error: null,
      };
    case 'REGISTER_START':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'REGISTER_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null,
      };
    case 'REGISTER_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        loading: false,
        error: action.payload,
      };
    case 'LOAD_USER_START':
      return {
        ...state,
        loading: true,
      };
    case 'LOAD_USER_SUCCESS':
      return {
        ...state,
        user: action.payload,
        loading: false,
        error: null,
      };
    case 'LOAD_USER_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        loading: false,
        error: action.payload,
      };
    case 'UPDATE_PROFILE_SUCCESS':
      return {
        ...state,
        user: { ...state.user, ...action.payload },
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    if (state.token) {
      localStorage.setItem('token', state.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
      loadUser();
    } else {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      dispatch({ type: 'LOAD_USER_FAILURE', payload: null });
    }
  }, [state.token]);

  const loadUser = async () => {
    dispatch({ type: 'LOAD_USER_START' });
    try {
      const response = await api.get('/auth/profile');
      dispatch({ type: 'LOAD_USER_SUCCESS', payload: response.data.user });
    } catch (error) {
      dispatch({ type: 'LOAD_USER_FAILURE', payload: error.response?.data?.error || 'Failed to load user' });
    }
  };

  const login = async (email, password) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      dispatch({ type: 'LOGIN_SUCCESS', payload: { token, user } });
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  const register = async (userData) => {
    dispatch({ type: 'REGISTER_START' });
    try {
      const response = await api.post('/auth/register', userData);
      const { token, user } = response.data;
      dispatch({ type: 'REGISTER_SUCCESS', payload: { token, user } });
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      dispatch({ type: 'REGISTER_FAILURE', payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      dispatch({ type: 'UPDATE_PROFILE_SUCCESS', payload: response.data.user });
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Profile update failed';
      return { success: false, error: errorMessage };
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    clearError,
    loadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
