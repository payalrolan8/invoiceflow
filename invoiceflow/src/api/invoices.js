// src/api/invoices.js  [CORRECTED]
import { api } from './client';

export const getInvoices = ({ status, search } = {}) => {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.append('status', status);
  if (search) params.append('search', search);
  const qs = params.toString();
  return api.get(`/invoices${qs ? `?${qs}` : ''}`);
};

export const getInvoice = (id) => api.get(`/invoices/${id}`);

export const getInvoiceStats = () => api.get('/invoices/stats');

export const createInvoice = (data) => api.post('/invoices', data);

export const updateInvoice = (id, data) => api.put(`/invoices/${id}`, data);

export const updateInvoiceStatus = (id, status) =>
  api.patch(`/invoices/${id}/status`, { status });

// BUG FIXED: was pointing to `/invoices/${id}/remind` which does not exist on the backend.
// Reminder sending is handled by the dedicated /api/reminders routes.
// Use sendReminder from api/reminders.js instead.

export const deleteInvoice = (id) => api.delete(`/invoices/${id}`);