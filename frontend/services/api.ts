import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000', // Server FastAPI
  headers: {
    'Accept': 'application/json',
  },
});

// Tự động chèn Bearer Token vào Header của mỗi request
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      console.log("Token hiện tại là:", token);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;