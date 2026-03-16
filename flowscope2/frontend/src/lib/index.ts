/**
 * FlowScope Frontend – Shared Library
 * Contains: API client, Zustand store, Socket.IO helper
 */

import axios from 'axios';
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ─── Axios API Client ─────────────────────────────────────────────────────────
export const api = axios.create({ baseURL: `${BASE}/api`, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((cfg) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('fs_token');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('fs_token');
    localStorage.removeItem('fs_user');
    window.location.href = '/auth/login';
  }
  return Promise.reject(err);
});

// ─── API Modules ──────────────────────────────────────────────────────────────
export const authApi = {
  register: (d: { email: string; name: string; password: string }) => api.post('/auth/register', d),
  login: (d: { email: string; password: string }) => api.post('/auth/login', d),
  me: () => api.get('/auth/me'),
};

export const automationsApi = {
  list: (p?: Record<string, string>) => api.get('/automations', { params: p }),
  get: (id: string) => api.get(`/automations/${id}`),
  create: (d: Record<string, unknown>) => api.post('/automations', d),
  update: (id: string, d: Record<string, unknown>) => api.put(`/automations/${id}`, d),
  delete: (id: string) => api.delete(`/automations/${id}`),
  impact: (id: string) => api.get(`/automations/${id}/impact`),
  graph: () => api.get('/automations/graph'),
  rollback: (id: string, versionId: string) => api.post(`/automations/${id}/rollback`, { versionId }),
};

export const analyticsApi = {
  metrics: () => api.get('/analytics/metrics'),
  byTool: () => api.get('/analytics/by-tool'),
  history: (days = 30) => api.get('/analytics/execution-history', { params: { days } }),
  top: () => api.get('/analytics/top'),
};

export const insightsApi = {
  list: () => api.get('/insights'),
  runFull: () => api.post('/insights/analyze/full'),
  graphIntel: () => api.get('/insights/graph-intelligence'),
  dismiss: (id: string) => api.put(`/insights/${id}/dismiss`),
};

export const discoveryApi = {
  ingest: (format: string, data: unknown) => api.post('/discovery/ingest', { format, data }),
};

// ─── Zustand Auth Store ────────────────────────────────────────────────────────
interface User { id: string; email: string; name: string; }
interface AuthStore {
  user: User | null; token: string | null;
  setAuth: (u: User, t: string) => void;
  clearAuth: () => void;
  init: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null, token: null,
  setAuth: (user, token) => {
    if (typeof window !== 'undefined') { localStorage.setItem('fs_token', token); localStorage.setItem('fs_user', JSON.stringify(user)); }
    set({ user, token });
  },
  clearAuth: () => {
    if (typeof window !== 'undefined') { localStorage.removeItem('fs_token'); localStorage.removeItem('fs_user'); }
    set({ user: null, token: null });
  },
  init: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('fs_token');
      const userStr = localStorage.getItem('fs_user');
      if (token && userStr) { try { set({ user: JSON.parse(userStr), token }); } catch {} }
    }
  },
}));

// ─── Socket.IO ────────────────────────────────────────────────────────────────
let _socket: Socket | null = null;
export const getSocket = (): Socket => {
  if (!_socket) _socket = io(BASE, { transports: ['websocket', 'polling'] });
  return _socket;
};
