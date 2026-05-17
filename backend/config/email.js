import { Resend } from 'resend';

const getResend = () => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Email credentials not configured. Set RESEND_API_KEY in your .env');
  }
  return new Resend(process.env.RESEND_API_KEY);
};

export const sendInvoiceReminder = async (invoice, customSubject, customBody) => {
  const resend   = getResend();
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

  const result = await resend.emails.send({
    from:           `InvoiceFlow <${process.env.FROM_EMAIL}>`,
    to:             process.env.TEST_EMAIL || customer.email,
    subject,
    html,
    open_tracking:  true,   // ← enables Resend's built-in open tracking
  });

  // Return the Resend email ID so callers can store it on the invoice
  return result.data?.id ?? result.id;
};