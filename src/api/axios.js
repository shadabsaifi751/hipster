import axios from 'axios';
import { API_BASE } from '../utils/constants';
import { logApiError } from '../utils/logger';

export const axiosInstance = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    } else if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    logApiError('request', { message: error?.message });
    return Promise.reject(error);
  },
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    logApiError('response', {
      status: error?.response?.status,
      url: error?.config?.url,
      message: error?.response?.data?.message || error.message,
    });
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
    }
    return Promise.reject(error);
  },
);
