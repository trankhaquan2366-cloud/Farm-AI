import axios, { type InternalAxiosRequestConfig } from 'axios';

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8000' : '');

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Accept': 'application/json',
  },
});

// Tự động chèn Bearer Token vào Header của mỗi request
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      console.log("Token hiện tại là:", token);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

export default api;