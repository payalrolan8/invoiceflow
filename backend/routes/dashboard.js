// routes/dashboard.js  [CORRECTED]
import express from 'express';
import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    // BUG FIXED: backend was missing paidCount, pendingCount, outstanding,
    // overdueAmount, overdueCount — all of which Dashboard.jsx reads from stats.
    // totalCustomers was also returned outside stats{} but frontend reads stats.totalCustomers.
    const [invoiceStats] = await Invoice.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue:  { $sum: { $cond: [{ $eq: ['$status', 'paid'] },    '$total', 0] } },
          outstanding:   { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$total', 0] } },
          overdueAmount: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, '$total', 0] } },
          totalInvoices: { $sum: 1 },
          paidCount:     { $sum: { $cond: [{ $eq: ['$status', 'paid'] },    1, 0] } },
          pendingCount:  { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          overdueCount:  { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
        },
      },
    ]);

    const totalCustomers = await Customer.countDocuments();

    const recentInvoices = await Invoice.find()
      .populate('customer', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    const defaultStats = {
      totalRevenue: 0, outstanding: 0, overdueAmount: 0,
      totalInvoices: 0, paidCount: 0, pendingCount: 0, overdueCount: 0,
    };

    res.json({
      // BUG FIXED: totalCustomers is now inside stats so frontend can read stats.totalCustomers
      stats: { ...(invoiceStats || defaultStats), totalCustomers },
      recentInvoices,
    });
  } catch (err) {
    next(err);
  }
});

export default router;