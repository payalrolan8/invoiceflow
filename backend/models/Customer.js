// invoiceflow-backend/models/Customer.js
import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String, required: [true, 'Name is required'], trim: true,
    },
    email: {
      type: String, required: [true, 'Email is required'],
      unique: true, lowercase: true, trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Enter a valid email'],
    },
    phone:   { type: String, trim: true, default: '' },
    company: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['active', 'pending', 'inactive'],
      default: 'active',
    },
    totalInvoices: { type: Number, default: 0 },
    totalPaid:     { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Customer', customerSchema);