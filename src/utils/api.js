import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: BASE_URL, timeout: 10000 });

// ── Sensor ────────────────────────────────────────────────────
export const getLatest  = ()       => api.get('/api/sensor/latest');

// ── History ───────────────────────────────────────────────────
export const getHistory = (params) => api.get('/api/history', { params });
export const getExport  = (params) => api.get('/api/history/export', { params });
export const getHistoryDates = (params) => api.get('/api/history/dates', { params });
export const getHistoryDateNodes = (date, params) => api.get(`/api/history/dates/${date}/nodes`, { params });

// ── Alerts ────────────────────────────────────────────────────
export const getAlerts    = (params) => api.get('/api/alerts', { params });
export const resolveAlert = (id)     => api.patch(`/api/alerts/${id}/resolve`);

// ── Control ───────────────────────────────────────────────────
export const getControl    = ()       => api.get('/api/control');
export const postControl   = (data)   => api.post('/api/control', data);

// ── Water Usage ───────────────────────────────────────────────
export const getWaterUsage       = ()       => api.get('/api/water-usage');
export const getWaterUsageConfig = ()       => api.get('/api/water-usage/config');
export const saveWaterUsageConfig = (data)  => api.post('/api/water-usage/config', data);
export const snapshotWaterUsage   = (data)  => api.post('/api/water-usage/snapshot', data);

// ── Energy Reset ──────────────────────────────────────────────
export const getEnergyReset  = ()     => api.get('/api/energy-reset');
export const postEnergyReset = (data) => api.post('/api/energy-reset', data);

export default api;
