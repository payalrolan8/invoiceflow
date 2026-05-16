// invoiceflow-backend/routes/customers.js
import express from 'express';
import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import Invoice from '../models/Invoice.js';

const router = express.Router();

// ── GET /api/customers ────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 }).lean();

    const paidTotals = await Invoice.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: '$customer', totalPaid: { $sum: '$total' } } },
    ]);

    const paidMap = {};
    for (const row of paidTotals) paidMap[String(row._id)] = row.totalPaid;

    const result = customers.map((c) => ({
      ...c,
      totalPaid: paidMap[String(c._id)] ?? 0,
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/customers/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id).lean();
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });

    const [agg] = await Invoice.aggregate([
      { $match: { customer: new mongoose.Types.ObjectId(req.params.id), status: 'paid' } },
      { $group: { _id: null, totalPaid: { $sum: '$total' } } },
    ]);

    res.json({ success: true, data: { ...customer, totalPaid: agg?.totalPaid ?? 0 } });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/customers ───────────────────────────────────────────────────────
// Creates the customer + a linked pending invoice using form-supplied invoice data.
router.post('/', async (req, res, next) => {
  try {
    const { invoice: inv, ...customerData } = req.body;

    // 1. Create the customer
    const customer = await Customer.create(customerData);

    // 2. Build due date fallback
    const dueDate = inv?.dueDate
      ? new Date(inv.dueDate)
      : (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d; })();

    // 3. Build line items — support both array (rich form) and single item (legacy)
    let lineItems;
    if (Array.isArray(inv?.lineItems) && inv.lineItems.length > 0) {
      lineItems = inv.lineItems.map((l) => {
        const qty   = parseFloat(l.quantity)  || 1;
        const price = parseFloat(l.unitPrice) || 0;
        return {
          description: l.description || 'Services Rendered',
          quantity:    qty,
          unitPrice:   price,
          total:       parseFloat((qty * price).toFixed(2)),
        };
      });
    } else {
      lineItems = [{ description: 'Services Rendered', quantity: 1, unitPrice: 0, total: 0 }];
    }

    // 4. Create the linked pending invoice
    await Invoice.create({
      customer:  customer._id,
      status:    'pending',
      issueDate: inv?.issueDate ? new Date(inv.issueDate) : new Date(),
      dueDate,
      lineItems,
      tax:   parseFloat(inv?.tax) || 0,
      notes: inv?.notes || '',
    });

    // 4. Bump the customer invoice counter
    customer.totalInvoices = 1;
    await customer.save();

    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/customers/:id ────────────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const { name, email, phone, company, address } = req.body;
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, company, address },
      { new: true, runValidators: true }
    ).lean();
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/customers/:id/status ──────────────────────────────────────────
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['active', 'pending', 'inactive'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: `Status must be one of: ${allowed.join(', ')}` });
    }
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).lean();
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/customers/:id ─────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

export default router;