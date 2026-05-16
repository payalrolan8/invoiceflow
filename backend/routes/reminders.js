// routes/reminders.js  [CORRECTED]
import express from 'express';
import Invoice from '../models/Invoice.js';
import { sendInvoiceReminder } from '../config/email.js';

const router = express.Router();

// Statuses that are unpaid and need reminders
// FIX: added 'sent' — invoices marked as sent to the customer are unpaid and must appear in reminders
const UNPAID_STATUSES = ['sent', 'pending', 'overdue'];

// ── Helper: auto-promote past-due invoices to overdue ────────────────────────
async function markOverdueInvoices() {
  await Invoice.updateMany(
    {
      status: { $in: ['sent', 'pending'] },
      dueDate: { $lt: new Date() },
    },
    { $set: { status: 'overdue' } }
  );
}

// ── GET /api/reminders ────────────────────────────────────────────────────────
// Returns { queue, stats } — the shape Reminders.jsx expects
router.get('/', async (req, res, next) => {
  try {
    await markOverdueInvoices();

    const invoices = await Invoice.find({ status: { $in: UNPAID_STATUSES } })
      .populate('customer', 'name email company')
      .sort({ dueDate: 1 });

    const sent         = invoices.filter((inv) => inv.reminderSentAt).length;
    const responded    = invoices.filter((inv) => inv.reminderSentAt && inv.status === 'paid').length;
    const totalEligible = invoices.length;
    const recoveryRate  = totalEligible ? Math.round((responded / totalEligible) * 100) : 0;

    res.json({
      queue: invoices,
      stats: {
        sent,
        opened: sent,   // no open-tracking yet; mirrors sent count as placeholder
        responded,
        recoveryRate,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/reminders/send-all ──────────────────────────────────────────────
// Must be before /:id/send so Express doesn't match "send-all" as an id
router.post('/send-all', async (req, res, next) => {
  try {
    await markOverdueInvoices();

    const invoices = await Invoice.find({ status: { $in: UNPAID_STATUSES } })
      .populate('customer', 'name email company');

    const results = await Promise.allSettled(
      invoices.map(async (invoice) => {
        await sendInvoiceReminder(invoice);
        invoice.reminderSentAt = new Date();
        await invoice.save();
      })
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed    = results.filter((r) => r.status === 'rejected').length;

    res.json({
      success: true,
      message: `${succeeded} reminder${succeeded !== 1 ? 's' : ''} sent${failed ? `, ${failed} failed` : ''}!`,
      succeeded,
      failed,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/reminders/:id/send ──────────────────────────────────────────────
// FIX: accepts optional { subject, body } from the compose modal so the
//      user's edited email content is used instead of the hardcoded template.
router.post('/:id/send', async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate(
      'customer', 'name email company'
    );
    if (!invoice)
      return res.status(404).json({ success: false, error: 'Invoice not found' });

    const { subject, body } = req.body; // may be undefined — email.js handles fallback
    await sendInvoiceReminder(invoice, subject, body);

    invoice.reminderSentAt = new Date();
    await invoice.save();

    res.json({ success: true, message: 'Reminder sent!', invoice });
  } catch (err) {
    next(err);
  }
});

export default router;