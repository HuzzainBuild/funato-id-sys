// lib/apiClient.ts

const getToken = () => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('auth-token') || '';
};

async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }

  return data;
}

export const api = {
  get: <T>(url: string) => apiRequest<T>(url),

  post: <T>(url: string, body: unknown) =>
    apiRequest<T>(url, { method: 'POST', body: JSON.stringify(body) }),

  put: <T>(url: string, body: unknown) =>
    apiRequest<T>(url, { method: 'PUT', body: JSON.stringify(body) }),

  delete: <T>(url: string) =>
    apiRequest<T>(url, { method: 'DELETE' }),

  upload: <T>(url: string, formData: FormData) =>
    apiRequest<T>(url, { method: 'POST', body: formData }),
};

// Typed API helpers
export interface StudentsResponse {
  success: boolean;
  students: import('../types').Student[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface StudentResponse {
  success: boolean;
  student: import('../types').Student;
}

export interface StatsResponse {
  success: boolean;
  stats: import('../types').DashboardStats;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  result: {
    total: number;
    imported: number;
    duplicates: number;
    errors: number;
    errorDetails: { row: number; message: string }[];
    uploadId: string;
  };
}

export const studentsApi = {
  list: (params: Record<string, string | number> = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString();
    return api.get<StudentsResponse>(`/api/students?${qs}`);
  },

  get: (id: string) => api.get<StudentResponse>(`/api/students/${id}`),

  create: (data: Partial<import('../types').Student>) =>
    api.post<StudentResponse>('/api/students', data),

  update: (id: string, data: Partial<import('../types').Student>) =>
    api.put<StudentResponse>(`/api/students/${id}`, data),

  delete: (id: string) => api.delete(`/api/students/${id}`),

  uploadPassport: (studentId: string, file: File) => {
    const fd = new FormData();
    fd.append('passport', file);
    fd.append('studentId', studentId);
    return api.upload<{ success: boolean; passportUrl: string }>('/api/upload/passport', fd);
  },

  uploadExcel: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.upload<UploadResponse>('/api/upload/excel', fd);
  },
};
