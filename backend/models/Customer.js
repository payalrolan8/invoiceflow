// invoiceflow-backend/models/Customer.js
import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, 'Name is required'],
      trim:     true,
    },
    email: {
      type:      String,
      required:  [true, 'Email is required'],
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, 'Enter a valid email'],
    },
    phone: {
      type:    String,
      trim:    true,
      default: '',
    },
    company: {
      type:    String,
      trim:    true,
      default: '',
    },
    address: {
      type:    String,
      trim:    true,
      default: '',
    },
    status: {
      type:    String,
      enum:    ['active', 'pending', 'inactive'],
      default: 'active',
    },
    totalInvoices: {
      type:    Number,
      default: 0,
    },
    totalPaid: {
      type:    Number,
      default: 0,
    },

    // 🔗 Which USER owns this customer?
    createdBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'User is required'],
    },
  },
  { timestamps: true }
);

// ✅ Email must be unique PER USER (not globally)
// This allows two different users to have the same customer email
customerSchema.index({ email: 1, createdBy: 1 }, { unique: true });

export default mongoose.model('Customer', customerSchema);