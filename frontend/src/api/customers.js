import { api } from './client';

export const getCustomers         = ()           => api.get('/customers');
export const getCustomer          = (id)         => api.get(`/customers/${id}`);
export const createCustomer       = (data)       => api.post('/customers', data);
export const updateCustomer       = (id, data)   => api.put(`/customers/${id}`, data);
export const updateCustomerStatus = (id, status) => api.patch(`/customers/${id}/status`, { status });
export const deleteCustomer       = (id)         => api.delete(`/customers/${id}`);