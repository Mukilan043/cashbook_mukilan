import axios from 'axios';
import { cacheDelByPrefix, withOfflineCache } from '../utils/offlineCache';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://happy-prosperity-production.up.railway.app';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const CACHE_KEYS = {
  cashbooks: 'cashbooks:all',
  cashbookById: (id) => `cashbooks:${id}`,
  transactions: (cashbookId, query) => `tx:${cashbookId}:${query || ''}`,
  balance: (cashbookId) => `bal:${cashbookId}`,
};

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  signup: async (userData) => {
    const response = await api.post('/auth/signup', userData);
    return response.data;
  },
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
  updateProfile: async (userData) => {
    const response = await api.put('/auth/profile', userData);
    return response.data;
  },
};

// Cashbook API
export const cashbookAPI = {
  getAll: async () => {
    return await withOfflineCache({
      key: CACHE_KEYS.cashbooks,
      fetcher: async () => {
        const response = await api.get('/cashbooks');
        return response.data;
      },
    });
  },
  getById: async (id) => {
    return await withOfflineCache({
      key: CACHE_KEYS.cashbookById(id),
      fetcher: async () => {
        const response = await api.get(`/cashbooks/${id}`);
        return response.data;
      },
    });
  },
  create: async (cashbook) => {
    const response = await api.post('/cashbooks', cashbook);
    // Invalidate cached list
    await cacheDelByPrefix('cashbooks:');
    return response.data;
  },
  update: async (id, cashbook) => {
    const response = await api.put(`/cashbooks/${id}`, cashbook);
    await cacheDelByPrefix('cashbooks:');
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/cashbooks/${id}`);
    await cacheDelByPrefix('cashbooks:');
    await cacheDelByPrefix(`tx:${id}:`);
    await cacheDelByPrefix(`bal:${id}`);
    return response.data;
  },
};

// Transaction API (requires cashbookId)
export const transactionAPI = {
  getAll: async (cashbookId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const query = params.toString();
    return await withOfflineCache({
      key: CACHE_KEYS.transactions(cashbookId, query),
      fetcher: async () => {
        const response = await api.get(`/transactions/cashbook/${cashbookId}?${query}`);
        return response.data;
      },
    });
  },
  getById: async (cashbookId, id) => {
    const response = await api.get(`/transactions/cashbook/${cashbookId}/${id}`);
    return response.data;
  },
  create: async (cashbookId, transaction) => {
    const response = await api.post(`/transactions/cashbook/${cashbookId}`, transaction);
    await cacheDelByPrefix(`tx:${cashbookId}:`);
    await cacheDelByPrefix(`bal:${cashbookId}`);
    return response.data;
  },
  update: async (cashbookId, id, transaction) => {
    const response = await api.put(`/transactions/cashbook/${cashbookId}/${id}`, transaction);
    await cacheDelByPrefix(`tx:${cashbookId}:`);
    await cacheDelByPrefix(`bal:${cashbookId}`);
    return response.data;
  },
  delete: async (cashbookId, id) => {
    const response = await api.delete(`/transactions/cashbook/${cashbookId}/${id}`);
    await cacheDelByPrefix(`tx:${cashbookId}:`);
    await cacheDelByPrefix(`bal:${cashbookId}`);
    return response.data;
  },
  getBalance: async (cashbookId) => {
    return await withOfflineCache({
      key: CACHE_KEYS.balance(cashbookId),
      fetcher: async () => {
        const response = await api.get(`/transactions/cashbook/${cashbookId}/balance`);
        return response.data;
      },
    });
  },
  generateReport: async (cashbookId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    
    const response = await api.get(`/transactions/cashbook/${cashbookId}/reports/generate?${params.toString()}`, {
      responseType: 'blob',
    });
    
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cash-book-report.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return true;
  },
};

// Assistant API
export const assistantAPI = {
  chat: async (payload) => {
    const response = await api.post('/assistant/chat', payload);
    return response.data;
  },
};

export default api;
