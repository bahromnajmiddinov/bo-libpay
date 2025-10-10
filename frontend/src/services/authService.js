import api from './api';

export const authService = {
  login: async (username, password) => {
    const response = await api.post('/login/', { username, password });
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/register/', userData);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/profile/');
    return response.data;
  },

  refreshToken: async (refreshToken) => {
    const response = await api.post('/auth/token/refresh/', { refresh: refreshToken });
    return response.data;
  },
};
