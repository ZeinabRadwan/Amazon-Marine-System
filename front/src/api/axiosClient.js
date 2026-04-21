import axios from 'axios';
import { getApiBaseUrl } from './apiBaseUrl';
import { getLanguage } from '../i18n';

/**
 * Shared Axios instance for the application.
 * Automatically adds:
 * - Base URL from VITE_API_BASE_URL or defaults
 * - Authorization: Bearer <token> from localStorage
 * - Accept-Language and X-App-Locale based on current language
 */
const axiosClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor: Attach token and locale
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const lang = getLanguage();
    config.headers['Accept-Language'] = lang === 'ar' ? 'ar,en;q=0.9' : 'en,ar;q=0.9';
    config.headers['X-App-Locale'] = lang === 'ar' ? 'ar' : 'en';

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle 401 Unauthorized
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Dispatch event to trigger session expiration logic in AuthenticatedLayout/App
      window.dispatchEvent(new CustomEvent('am:session:expired'));
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
