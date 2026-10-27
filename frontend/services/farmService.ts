import api from './api';

// Interface cấu trúc dữ liệu Lô đất
export interface PlotPayload {
  name: string;
  area: number;
  location: string;
  soil_type: string;
}

// 1. Hàm Đăng nhập (Đã chuẩn hóa URLSearchParams & Đồng bộ Key 'token')
export async function login(username: string, password: string) {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const response = await api.post('/api/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  //  SỬA: Lưu chính xác key 'token' để khớp với api.ts
  if (response.data.access_token) {
    localStorage.setItem('token', response.data.access_token);
  }
  return response.data;
}

// 2. Hàm lấy danh sách Lô đất
export async function getPlots() {
  const response = await api.get('/api/plots');
  return response.data;
}

// 3. Hàm tạo Lô đất mới (Bổ sung để phục vụ Modal Thêm Lô Đất)
export async function createPlot(data: PlotPayload) {
  const response = await api.post('/api/plots', data);
  return response.data;
}