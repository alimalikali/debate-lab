import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 2 minutes for CPU-only Ollama
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        localStorage.setItem('accessToken', accessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth API
export const authApi = {
  register: async (data: { email: string; username: string; password: string; displayName?: string }) => {
    const response = await api.post<ApiResponse<{ user: any; tokens: { accessToken: string; refreshToken: string } }>>('/auth/register', data);
    return response.data;
  },

  login: async (data: { email: string; password: string }) => {
    const response = await api.post<ApiResponse<{ user: any; tokens: { accessToken: string; refreshToken: string } }>>('/auth/login', data);
    return response.data;
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken });
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  getMe: async () => {
    const response = await api.get<ApiResponse<any>>('/auth/me');
    return response.data;
  },
};

// User API
export const userApi = {
  getProfile: async () => {
    const response = await api.get<ApiResponse<any>>('/users/profile');
    return response.data;
  },

  updateProfile: async (data: { displayName?: string; avatarUrl?: string }) => {
    const response = await api.put<ApiResponse<any>>('/users/profile', data);
    return response.data;
  },

  getSettings: async () => {
    const response = await api.get<ApiResponse<any>>('/users/settings');
    return response.data;
  },

  updateSettings: async (data: any) => {
    const response = await api.put<ApiResponse<any>>('/users/settings', data);
    return response.data;
  },

  getApiKeys: async () => {
    const response = await api.get<ApiResponse<any[]>>('/users/api-keys');
    return response.data;
  },

  addApiKey: async (data: { provider: string; apiKey: string; keyName?: string; apiBaseUrl?: string }) => {
    const response = await api.post<ApiResponse<any>>('/users/api-keys', data);
    return response.data;
  },

  deleteApiKey: async (id: string) => {
    const response = await api.delete<ApiResponse<any>>(`/users/api-keys/${id}`);
    return response.data;
  },
};

// Topics API
export const topicsApi = {
  getCategories: async () => {
    const response = await api.get<ApiResponse<any[]>>('/topics/categories');
    return response.data;
  },

  getTopics: async (params?: { category?: string; difficulty?: string; search?: string; page?: number; limit?: number }) => {
    const response = await api.get<PaginatedResponse<any>>('/topics', { params });
    return response.data;
  },

  getTopic: async (id: string) => {
    const response = await api.get<ApiResponse<any>>(`/topics/${id}`);
    return response.data;
  },

  getTrending: async (limit?: number) => {
    const response = await api.get<ApiResponse<any[]>>('/topics/trending', { params: { limit } });
    return response.data;
  },

  createTopic: async (data: { title: string; description: string; difficulty: string; categoryId?: string }) => {
    const response = await api.post<ApiResponse<any>>('/topics', data);
    return response.data;
  },
};

// Debates API
export const debatesApi = {
  create: async (data: {
    topicId?: string;
    customTopicTitle?: string;
    customTopicDescription?: string;
    userPosition: string;
    difficulty: string;
    debateStyle: string;
    aiProvider?: string;
    aiModel?: string;
  }) => {
    const response = await api.post<ApiResponse<any>>('/debates', data);
    return response.data;
  },

  getAll: async (page?: number, limit?: number) => {
    const response = await api.get<PaginatedResponse<any>>('/debates', { params: { page, limit } });
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get<ApiResponse<any>>(`/debates/${id}`);
    return response.data;
  },

  getMessages: async (id: string) => {
    const response = await api.get<ApiResponse<any[]>>(`/debates/${id}/messages`);
    return response.data;
  },

  sendMessage: async (id: string, content: string) => {
    const response = await api.post<ApiResponse<{ userMessage: any; aiMessage: any }>>(`/debates/${id}/messages`, { content });
    return response.data;
  },

  sendMessageStream: (id: string, content: string) => {
    const token = localStorage.getItem('accessToken');
    return fetch(`${API_BASE_URL}/debates/${id}/messages/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    });
  },

  end: async (id: string) => {
    const response = await api.post<ApiResponse<{ summary: any; stats: any }>>(`/debates/${id}/end`);
    return response.data;
  },

  getStats: async (id: string) => {
    const response = await api.get<ApiResponse<any>>(`/debates/${id}/stats`);
    return response.data;
  },

  getSummary: async (id: string) => {
    const response = await api.get<ApiResponse<any>>(`/debates/${id}/summary`);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<any>>(`/debates/${id}`);
    return response.data;
  },
};

// AI API
export const aiApi = {
  getProviders: async () => {
    const response = await api.get<ApiResponse<any[]>>('/ai/providers');
    return response.data;
  },

  getOllamaStatus: async () => {
    const response = await api.get<ApiResponse<{ name: string; connected: boolean; models: string[] }>>('/ai/ollama/status');
    return response.data;
  },

  getOllamaModels: async () => {
    const response = await api.get<ApiResponse<string[]>>('/ai/ollama/models');
    return response.data;
  },

  getProviderModels: async (provider: string) => {
    const response = await api.get<ApiResponse<string[]>>(`/ai/providers/${provider}/models`);
    return response.data;
  },

  testProvider: async (provider: string, apiKey?: string, baseUrl?: string) => {
    const response = await api.post<ApiResponse<{ provider: string; connected: boolean }>>(`/ai/providers/${provider}/test`, { apiKey, baseUrl });
    return response.data;
  },
};
