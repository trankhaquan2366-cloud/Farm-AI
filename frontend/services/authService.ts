import api from './api';

export interface LoginPayload {
  username: string;
  password: string;
}

export const authService = {
  login: async (credentials: LoginPayload) => {
    // 1. Tạo dữ liệu dạng Form Data chuẩn OAuth2
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    // 2. Gửi request đăng nhập
    // Lưu ý: Kiểm tra đường dẫn trên Swagger UI của bạn (ví dụ: '/api/auth/login' hoặc '/auth/login' hoặc '/token')
    const response = await api.post('/api/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // 3. Trích xuất và lưu Access Token vào LocalStorage
    const token = response.data.access_token || response.data.token;
    if (token) {
      localStorage.setItem('token', token);
    }

    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  },

  getToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  },
};