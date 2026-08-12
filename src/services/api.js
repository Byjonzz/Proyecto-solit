import axios from 'axios';


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, 
});


api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const habiaSesion = Boolean(localStorage.getItem('auth_token'));
      localStorage.removeItem('auth_token');
      localStorage.removeItem('usuario_actual');

      if (habiaSesion && !error.config?.url?.includes('/login/')) {
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

export default api;