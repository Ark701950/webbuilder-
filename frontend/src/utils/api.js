import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Create axios instance with credentials
export const apiClient = axios.create({
  baseURL: API,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor to include auth token from localStorage as fallback
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('session_token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      // Do NOT auto-redirect for the /auth/me probe (used to check session on mount)
      // and do NOT redirect if we're already on the login/register page - prevents infinite loop
      const isAuthProbe = url.includes('/auth/me');
      const onAuthPage = typeof window !== 'undefined' &&
        (window.location.pathname === '/login' || window.location.pathname === '/register');
      if (!isAuthProbe && !onAuthPage) {
        localStorage.removeItem('session_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;