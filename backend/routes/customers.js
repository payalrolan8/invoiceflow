import express from 'express';
import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import Invoice from '../models/Invoice.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);

// ── helper: derive status from invoice data ───────────────────────────────────
function deriveStatus(customerId, unpaidSet, lastPaidMap) {
  const id = String(customerId);

  if (unpaidSet.has(id)) return 'active';
  if (!lastPaidMap[id]) return 'pending';

  const daysSinceLastPaid = (Date.now() - lastPaidMap[id]) / (1000 * 60 * 60 * 24);
  if (daysSinceLastPaid <= 90) return 'active';

  return 'inactive';
}

// ── GET /api/customers ────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const customers = await Customer.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    const uid = req.user._id;

    const paidTotals = await Invoice.aggregate([
      { $match: { status: 'paid', createdBy: uid } },
      { $group: { _id: '$customer', totalPaid: { $sum: '$total' } } },
    ]);
    const paidMap = {};
    for (const row of paidTotals) paidMap[String(row._id)] = row.totalPaid;

    const unpaidInvoices = await Invoice.aggregate([
      {
        $match: {
          createdBy: uid,
          status: { $in: ['pending', 'sent', 'draft', 'overdue'] },
        },
      },
      { $group: { _id: '$customer' } },
    ]);
    const unpaidSet = new Set(unpaidInvoices.map((r) => String(r._id)));

    const lastPaid = await Invoice.aggregate([
      { $match: { status: 'paid', createdBy: uid } },
      { $group: { _id: '$customer', lastPaidAt: { $max: '$updatedAt' } } },
    ]);
    const lastPaidMap = {};
    for (const row of lastPaid) lastPaidMap[String(row._id)] = new Date(row.lastPaidAt).getTime();

    const result = customers.map((c) => ({
      ...c,
      totalPaid: paidMap[String(c._id)] ?? 0,
      status: deriveStatus(c._id, unpaidSet, lastPaidMap),
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/customers/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    }).lean();
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });

    const cid = new mongoose.Types.ObjectId(req.params.id);
    const uid = req.user._id;

    const [agg] = await Invoice.aggregate([
      { $match: { customer: cid, createdBy: uid, status: 'paid' } },
      { $group: { _id: null, totalPaid: { $sum: '$total' } } },
    ]);

    const unpaidCount = await Invoice.countDocuments({
      customer: cid,
      createdBy: uid,
      status: { $in: ['pending', 'sent', 'draft', 'overdue'] },
    });

    const [lastPaidAgg] = await Invoice.aggregate([
      { $match: { customer: cid, createdBy: uid, status: 'paid' } },
      { $group: { _id: null, lastPaidAt: { $max: '$updatedAt' } } },
    ]);

    const unpaidSet = new Set(unpaidCount > 0 ? [String(req.params.id)] : []);
    const lastPaidMap = lastPaidAgg
      ? { [String(req.params.id)]: new Date(lastPaidAgg.lastPaidAt).getTime() }
      : {};

    res.json({
      success: true,
      data: {
        ...customer,
        totalPaid: agg?.totalPaid ?? 0,
        status: deriveStatus(req.params.id, unpaidSet, lastPaidMap),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/customers ───────────────────────────────────────────────────────
// ── POST /api/customers ───────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { invoice: inv, ...customerData } = req.body;
    const customer = await Customer.create({ ...customerData, createdBy: req.user._id });
    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
});
// ── PUT /api/customers/:id ────────────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const { name, email, phone, company, address } = req.body;
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { name, email, phone, company, address },
      { new: true, runValidators: true }
    ).lean();
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/customers/:id ─────────────────────────────────────────────────
// Also deletes all invoices belonging to this customer
router.delete('/:id', async (req, res, next) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });

    // Delete all invoices for this customer first
    await Invoice.deleteMany({
      customer: customer._id,
      createdBy: req.user._id,
    });

    // Then delete the customer
    await customer.deleteOne();

    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

export default router;