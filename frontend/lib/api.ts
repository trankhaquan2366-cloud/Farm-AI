export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Chuẩn hóa Base URL
export const RAW_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:8000'
).replace(/\/$/, '');

// Đảm bảo API_BASE_URL chuẩn
export const API_BASE_URL = RAW_BASE_URL.endsWith('/api')
  ? RAW_BASE_URL
  : `${RAW_BASE_URL}/api`;

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;

  const localToken = localStorage.getItem('token') || localStorage.getItem('access_token');
  if (localToken) return localToken;

  const match = document.cookie.match(new RegExp('(^| )token=([^;]+)'));
  if (match) return match[2];

  return null;
}

export async function api<T = any>(
  endpoint: string,
  options: Omit<RequestInit, 'body'> & { body?: any } = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});

  const token = getStoredToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // ✅ XỬ LÝ LỖI LẶP /api/api
  let url = endpoint;
  if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // Nếu endpoint truyền vào có chứa /api ở đầu thì xóa bớt để không trùng với API_BASE_URL
    if (cleanEndpoint.startsWith('/api/')) {
      cleanEndpoint = cleanEndpoint.replace(/^\/api/, '');
    } else if (cleanEndpoint === '/api') {
      cleanEndpoint = '';
    }

    url = `${API_BASE_URL}${cleanEndpoint}`;
  }

  // Xử lý Body & Content-Type
  let body = options.body;
  if (body !== undefined && body !== null && !(body instanceof FormData)) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (typeof body === 'object') {
      body = JSON.stringify(body);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || errorData.detail || 'Lỗi kết nối máy chủ',
      response.status,
      errorData
    );
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

export async function fetcher<T = any>(url: string): Promise<T> {
  return api<T>(url, { method: 'GET' });
}

// ==================== CÁC HÀM GỌI API CHUẨN ====================

export async function getCareLogs(batchId?: number) {
  const endpoint = batchId ? `/care-logs?batch_id=${batchId}` : '/care-logs';
  return api(endpoint, { method: 'GET' });
}

export async function createCareLog(data: {
  batch_id: number;
  action_type: string;
  log_date?: string;
  notes?: string;
  quantity?: number;
  image_url?: string;
}) {
  return api('/care-logs', {
    method: 'POST',
    body: data,
  });
}

export async function askAiAdvisor(data: {
  batch_id: number;
  message: string;
}) {
  return api('/v1/ai-advisor/chat', {
    method: 'POST',
    body: data,
  });
}

export async function checkHealth() {
  try {
    return await api(`${RAW_BASE_URL}/health`);
  } catch {
    try {
      return await api(`${RAW_BASE_URL}/`);
    } catch {
      return null;
    }
  }
}