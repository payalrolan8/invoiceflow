import express from 'express';
import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import { sendInvoiceReminder } from '../config/email.js';

const router = express.Router();

// GET /api/invoices — list all (filter by status, search by number/customer)
router.get('/', async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status && status !== 'all') query.status = status;

    let invoices = await Invoice.find(query)
      .populate('customer', 'name email company')
      .sort({ createdAt: -1 });

    if (search) {
      const s = search.toLowerCase();
      invoices = invoices.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(s) ||
          inv.customer?.name?.toLowerCase().includes(s) ||
          inv.customer?.email?.toLowerCase().includes(s)
      );
    }

    res.json({ success: true, data: invoices });
  } catch (err) {
    next(err);
  }
});

// GET /api/invoices/stats — MUST be before /:id
router.get('/stats', async (req, res, next) => {
  try {
    const [invoiceStats] = await Invoice.aggregate([
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalRevenue:  { $sum: { $cond: [{ $eq: ['$status', 'paid'] },    '$total', 0] } },
          outstanding:   { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$total', 0] } },
          overdueAmount: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, '$total', 0] } },
          paidCount:     { $sum: { $cond: [{ $eq: ['$status', 'paid'] },    1, 0] } },
          pendingCount:  { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          overdueCount:  { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
        },
      },
    ]);

    const defaultStats = {
      totalInvoices: 0, totalRevenue: 0, outstanding: 0,
      overdueAmount: 0, paidCount: 0, pendingCount: 0, overdueCount: 0,
    };

    res.json({ success: true, data: invoiceStats || defaultStats });
  } catch (err) {
    next(err);
  }
});

// GET /api/invoices/:id
router.get('/:id', async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('customer');
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
});

// POST /api/invoices
router.post('/', async (req, res, next) => {
  try {
    const { customer: customerId, lineItems = [], ...rest } = req.body;

    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });

    const processedItems = lineItems.map((item) => ({
      ...item,
      total: parseFloat((item.quantity * item.unitPrice).toFixed(2)),
    }));

    const invoice = await Invoice.create({
      customer: customerId,
      lineItems: processedItems,
      ...rest,
    });

    await Customer.findByIdAndUpdate(customerId, { $inc: { totalInvoices: 1 } });

    const populated = await invoice.populate('customer', 'name email company');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
});

// PUT /api/invoices/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { lineItems, ...rest } = req.body;
    const update = { ...rest };

    if (lineItems) {
      update.lineItems = lineItems.map((item) => ({
        ...item,
        total: parseFloat((item.quantity * item.unitPrice).toFixed(2)),
      }));
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    Object.assign(invoice, update);
    await invoice.save();

    if (rest.status === 'paid' && invoice.status !== 'paid') {
      await Customer.findByIdAndUpdate(invoice.customer, {
        $inc: { totalPaid: invoice.total },
      });
    }

    const populated = await invoice.populate('customer', 'name email company');
    res.json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/invoices/:id/status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['draft', 'sent', 'pending', 'paid', 'overdue', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status value' });
    }

    const invoice = await Invoice.findById(req.params.id).populate('customer', 'name email');
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    const wasPaid = invoice.status === 'paid';
    const nowPaid = status === 'paid';

    invoice.status = status;
    await invoice.save();

    // Keep customer totalPaid in sync
    if (!wasPaid && nowPaid) {
      await Customer.findByIdAndUpdate(invoice.customer._id, {
        $inc: { totalPaid: invoice.total },
      });
    } else if (wasPaid && !nowPaid) {
      await Customer.findByIdAndUpdate(invoice.customer._id, {
        $inc: { totalPaid: -invoice.total },
      });
    }

    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
});

// POST /api/invoices/:id/remind
router.post('/:id/remind', async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('customer');
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    if (invoice.status === 'paid') {
      return res.status(400).json({ success: false, error: 'Invoice is already paid — no reminder needed' });
    }

    await sendInvoiceReminder(invoice);
    invoice.reminderSentAt = new Date();
    await invoice.save();

    res.json({ success: true, message: `Reminder sent to ${invoice.customer.email}` });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    await Customer.findByIdAndUpdate(invoice.customer, { $inc: { totalInvoices: -1 } });
    await invoice.deleteOne();

    res.json({ success: true, message: 'Invoice deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;