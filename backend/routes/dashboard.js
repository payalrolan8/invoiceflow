import express from 'express';
import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const [invoiceStats] = await Invoice.aggregate([
      { $match: { createdBy: req.user._id } },
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

    const totalCustomers = await Customer.countDocuments({ createdBy: req.user._id });

    const recentInvoices = await Invoice.find({ createdBy: req.user._id })
      .populate('customer', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    const defaultStats = {
      totalRevenue: 0, outstanding: 0, overdueAmount: 0,
      totalInvoices: 0, paidCount: 0, pendingCount: 0, overdueCount: 0,
    };

    res.json({
      stats: { ...(invoiceStats || defaultStats), totalCustomers },
      recentInvoices,
    });
  } catch (err) {
    next(err);
  }
});

export default router;