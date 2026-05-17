import express from 'express';
import Invoice from '../models/Invoice.js';
import { sendInvoiceReminder } from '../config/email.js';

const router = express.Router();

// Statuses that are unpaid and need reminders
// 'sent' included — invoices marked sent to the customer are unpaid and must appear in reminders
const UNPAID_STATUSES = ['sent', 'pending', 'overdue'];

// ── Helper: auto-promote past-due invoices to overdue ────────────────────────
async function markOverdueInvoices() {
  await Invoice.updateMany(
    {
      status:  { $in: ['sent', 'pending'] },
      dueDate: { $lt: new Date() },
    },
    { $set: { status: 'overdue' } }
  );
}

// ── POST /api/reminders/webhook ───────────────────────────────────────────────
// Resend calls this when an email event occurs.
// IMPORTANT: needs raw body — express.raw() is applied in server.js for this
// path before express.json(), so req.body arrives here as a raw Buffer.
// Register in Resend dashboard → Domains → Webhooks → email.opened
router.post('/webhook', async (req, res) => {
  try {
    const event = JSON.parse(req.body);

    if (event.type === 'email.opened') {
      await Invoice.findOneAndUpdate(
        { resendEmailId: event.data.email_id },
        { openedAt: new Date() }
      );
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

// ── GET /api/reminders ────────────────────────────────────────────────────────
// Returns { queue, stats } — the shape Reminders.jsx expects
router.get('/', async (req, res, next) => {
  try {
    await markOverdueInvoices();

    const invoices = await Invoice.find({ status: { $in: UNPAID_STATUSES } })
      .populate('customer', 'name email company')
      .sort({ dueDate: 1 });

    const sent          = invoices.filter((inv) => inv.reminderSentAt).length;
    const opened        = invoices.filter((inv) => inv.openedAt).length;
    const responded     = invoices.filter((inv) => inv.reminderSentAt && inv.status === 'paid').length;
    const totalEligible = invoices.length;
    const recoveryRate  = totalEligible ? Math.round((responded / totalEligible) * 100) : 0;

    res.json({
      queue: invoices,
      stats: { sent, opened, responded, recoveryRate },
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
        const resendEmailId = await sendInvoiceReminder(invoice);
        invoice.reminderSentAt = new Date();
        invoice.resendEmailId  = resendEmailId;
        await invoice.save();
      })
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed    = results.filter((r) => r.status === 'rejected').length;

    res.json({
      success:   true,
      message:   `${succeeded} reminder${succeeded !== 1 ? 's' : ''} sent${failed ? `, ${failed} failed` : ''}!`,
      succeeded,
      failed,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/reminders/:id/send ──────────────────────────────────────────────
// Accepts optional { subject, body } from the compose modal
router.post('/:id/send', async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate(
      'customer', 'name email company'
    );
    if (!invoice)
      return res.status(404).json({ success: false, error: 'Invoice not found' });

    const { subject, body } = req.body;
    const resendEmailId = await sendInvoiceReminder(invoice, subject, body);

    invoice.reminderSentAt = new Date();
    invoice.resendEmailId  = resendEmailId;
    await invoice.save();

    res.json({ success: true, message: 'Reminder sent!', invoice });
  } catch (err) {
    next(err);
  }
});

export default router;