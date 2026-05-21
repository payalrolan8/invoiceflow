// invoiceflow-backend/models/Invoice.js
import mongoose from 'mongoose';

const lineItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity:    { type: Number, required: true, min: 1 },
  unitPrice:   { type: Number, required: true, min: 0 },
  total:       { type: Number, required: true },
});

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      // uniqueness enforced via compound index below
    },

    // 🔗 Which CUSTOMER is this invoice for?
    customer: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Customer',
      required: [true, 'Customer is required'],
    },

    // 🔗 Which USER created this invoice?
    createdBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'User is required'],
    },

    status: {
      type:    String,
      enum:    ['draft', 'sent', 'pending', 'paid', 'overdue', 'cancelled'],
      default: 'pending',
    },

    issueDate: {
      type:    Date,
      default: Date.now,
    },
    dueDate: {
      type:     Date,
      required: [true, 'Due date is required'],
    },

    lineItems: {
      type:    [lineItemSchema],
      default: [],
    },

    subtotal:  { type: Number, default: 0 },
    tax:       { type: Number, default: 0 },   // tax rate as percentage e.g. 18 = 18%
    taxAmount: { type: Number, default: 0 },
    total:     { type: Number, default: 0 },

    notes: { type: String, default: '' },

    reminderSentAt: { type: Date,   default: null },
    resendEmailId:  { type: String, default: null }, // Resend email ID for webhook matching
    openedAt:       { type: Date,   default: null }, // populated by /webhook when email is opened
  },
  { timestamps: true }
);

// ✅ Invoice number unique PER USER (not globally)
// Each user gets their own INV-0001, INV-0002 etc.
invoiceSchema.index({ invoiceNumber: 1, createdBy: 1 }, { unique: true });

// ✅ Auto-generate invoice number before saving
invoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    // Count only THIS user's invoices so each user starts from INV-0001
    const count = await mongoose.model('Invoice').countDocuments({
      createdBy: this.createdBy,
    });
    this.invoiceNumber = `INV-${String(count + 1).padStart(4, '0')}`;
  }

  // Recalculate totals from line items every save
  this.subtotal  = this.lineItems.reduce((sum, item) => sum + item.total, 0);
  this.taxAmount = parseFloat(((this.subtotal * this.tax) / 100).toFixed(2));
  this.total     = parseFloat((this.subtotal + this.taxAmount).toFixed(2));

  next();
});

export default mongoose.model('Invoice', invoiceSchema);