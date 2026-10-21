import axios from 'axios';

const ADMIN_API_BASE_URL = import.meta.env.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL}/admin` 
  : '/api/v1/admin';

export const adminClient = axios.create({
  baseURL: ADMIN_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

// Interceptor para injetar o token administrativo e correlation ID
adminClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dragoncorp_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Gera um correlation ID único por requisição para rastreabilidade auditável
    config.headers['X-Correlation-ID'] = 'adm_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para tratamento de 401 e 403
adminClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (!window.location.pathname.includes('/admin/login')) {
        localStorage.removeItem('dragoncorp_admin_token');
        localStorage.removeItem('dragoncorp_admin_user');
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);
