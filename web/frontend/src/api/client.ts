import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

// Interceptor para injetar o token Sanctum
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dragoncorp_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para captura amigável de erros
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redireciona para o login apenas se não estiver já na página de login
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('dragoncorp_token');
        localStorage.removeItem('dragoncorp_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
