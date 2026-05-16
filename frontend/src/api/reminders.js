// src/api/reminders.js
import { api } from './client';

/** Fetch reminder queue + stats */
export const getReminders = () => api.get('/reminders');

/**
 * Send a single reminder for one invoice.
 * FIX: accepts customSubject and customBody from the compose modal
 * so the user's edited email content is actually sent.
 */
export const sendReminder = (invoiceId, subject, body) =>
  api.post(`/reminders/${invoiceId}/send`, { subject, body });

/** Bulk-send reminders to all eligible pending/overdue invoices */
export const sendAllReminders = () => api.post('/reminders/send-all', {});