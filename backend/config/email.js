import nodemailer from 'nodemailer';

let transporter = null;

const getTransporter = () => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASS) {
    throw new Error('Email credentials not configured. Set GMAIL_USER and GMAIL_APP_PASS in your .env');
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
       family: 4,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS,
      },
    });
  }
  return transporter;
};

export const sendInvoiceReminder = async (invoice, customSubject, customBody) => {
  const mailer   = getTransporter();
  const customer = invoice.customer;
  const due = new Date(invoice.dueDate).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const isOverdue = invoice.status === 'overdue';

  const subject = customSubject?.trim() || (
    isOverdue
      ? `Overdue Invoice ${invoice.invoiceNumber} — Action Required`
      : `Reminder: Invoice ${invoice.invoiceNumber} Due on ${due}`
  );

  let html;
  if (customBody?.trim()) {
    const bodyHtml = customBody.trim().replace(/\n/g, '<br>');
    html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
        <h2 style="color:${isOverdue ? '#ef4444' : '#6366f1'}">
          ${isOverdue ? '⚠️ Payment Overdue' : '📄 Payment Reminder'}
        </h2>
        <p>${bodyHtml}</p>
        <div style="background:#f9fafb;padding:20px;border-radius:8px;margin:20px 0">
          <div style="font-size:12px;color:#6b7280">AMOUNT DUE</div>
          <div style="font-size:28px;font-weight:700">₹${invoice.total.toLocaleString('en-IN')}</div>
        </div>
      </div>`;
  } else {
    html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:${isOverdue ? '#ef4444' : '#6366f1'}">
          ${isOverdue ? '⚠️ Payment Overdue' : '📄 Payment Reminder'}
        </h2>
        <p>Hi <strong>${customer.name}</strong>,</p>
        <p>${isOverdue
          ? `Invoice <strong>${invoice.invoiceNumber}</strong> is now <strong>overdue</strong>. Please arrange payment immediately.`
          : `Invoice <strong>${invoice.invoiceNumber}</strong> is due on <strong>${due}</strong>.`
        }</p>
        <div style="background:#f9fafb;padding:20px;border-radius:8px;margin:20px 0">
          <div style="font-size:12px;color:#6b7280">AMOUNT DUE</div>
          <div style="font-size:28px;font-weight:700">₹${invoice.total.toLocaleString('en-IN')}</div>
        </div>
        <p>If you have already paid, please ignore this message.</p>
        <p>Thanks,<br/><strong>InvoiceFlow</strong></p>
      </div>`;
  }

  const info = await mailer.sendMail({
    from: `"InvoiceFlow" <${process.env.GMAIL_USER}>`,
    to:   customer.email,
    subject,
    html,
  });

  return info;
};