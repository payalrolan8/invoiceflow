// invoiceflow-backend/server.js
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import errorHandler from './middleware/errorHandler.js';

import dashboardRoutes from './routes/dashboard.js';
import customerRoutes  from './routes/customers.js';
import invoiceRoutes   from './routes/invoices.js';
import reminderRoutes  from './routes/reminders.js';

const app  = express();
const PORT = process.env.PORT || 5000;

connectDB();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ── Webhook ONLY — must be before express.json() ──────────────────────────────
// The /webhook route inside reminderRoutes uses express.raw() to read the raw
// Buffer that Resend POSTs. If express.json() runs first it consumes the stream
// and req.body becomes undefined inside the webhook handler.
// We pin just this one path so no other reminder route is affected.
app.post('/api/reminders/webhook', express.raw({ type: 'application/json' }), reminderRoutes);

// ── JSON body parsing for everything else ─────────────────────────────────────
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'InvoiceFlow API is running 🚀', timestamp: new Date() });
});

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/invoices',  invoiceRoutes);
app.use('/api/reminders', reminderRoutes); // all other reminder routes get parsed JSON here

app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🚀 InvoiceFlow API running at http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});