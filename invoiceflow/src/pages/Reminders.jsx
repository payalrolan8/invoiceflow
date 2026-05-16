// src/pages/Reminders.jsx
import { useEffect, useState, useCallback } from 'react';
import styles from './Reminders.module.css';
import StatCard from '../components/StatCard';
import { sendReminder, sendAllReminders } from '../api/reminders';
import { getInvoices } from '../api/invoices';

function fmt(amount) {
  return '₹' + Number(amount ?? 0).toLocaleString('en-IN');
}

function fmtDateShort(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function fmtDateLong(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fillTemplate(template, inv) {
  return template
    .replace(/\{customerName\}/g, inv.customer?.name ?? '')
    .replace(/\{invoiceNumber\}/g, inv.invoiceNumber ?? '')
    .replace(/\{amount\}/g, fmt(inv.total))
    .replace(/\{dueDate\}/g, fmtDateLong(inv.dueDate));
}

function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className={`${styles.toast} ${type === 'error' ? styles.toastError : styles.toastSuccess}`}>
      {type === 'error' ? '✕' : '✓'} {msg}
    </div>
  );
}

function EmailModal({ inv, defaultSubject, defaultBody, onClose, onSend }) {
  const [subject,   setSubject]   = useState(() => fillTemplate(defaultSubject, inv));
  const [body,      setBody]      = useState(() => fillTemplate(defaultBody, inv));
  const [sending,   setSending]   = useState(false);
  const [sent,      setSent]      = useState(false);
  const [sendError, setSendError] = useState('');

  async function handleSend() {
    setSending(true);
    setSendError('');
    try {
      await onSend(inv._id, subject, body);
      setSent(true);
    } catch (e) {
      setSendError(e.message || 'Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (sent) {
    return (
      <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>✉ Reminder Email</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>
                Sent to <strong style={{ color: 'var(--text)' }}>{inv.customer?.name}</strong>
                {' · '}
                <span style={{ color: 'var(--blue)' }}>{inv.customer?.email}</span>
              </div>
            </div>
            <button className={styles.modalClose} onClick={onClose}>✕</button>
          </div>
          <div className={styles.successScreen}>
            <div className={styles.successIcon}>✓</div>
            <div className={styles.successTitle}>Email Sent Successfully!</div>
            <div className={styles.successDetails}>
              <div className={styles.successRow}>
                <span className={styles.successLabel}>To</span>
                <span className={styles.successValue}>{inv.customer?.name} &lt;{inv.customer?.email}&gt;</span>
              </div>
              <div className={styles.successRow}>
                <span className={styles.successLabel}>Invoice</span>
                <span className={styles.successValue}>{inv.invoiceNumber}</span>
              </div>
              <div className={styles.successRow}>
                <span className={styles.successLabel}>Amount</span>
                <span className={styles.successValue}>{fmt(inv.total)}</span>
              </div>
              <div className={styles.successRow}>
                <span className={styles.successLabel}>Subject</span>
                <span className={styles.successValue}>{subject}</span>
              </div>
            </div>
            <p style={{ color: 'var(--text2)', fontSize: 13, margin: 0 }}>
              The reminder has been delivered to the customer's inbox.
            </p>
          </div>
          <div className={styles.modalFooter}>
            <button className={styles.btnBlue} onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>✉ Compose Reminder Email</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>
              Sending to <strong style={{ color: 'var(--text)' }}>{inv.customer?.name}</strong>
              {' · '}
              <span style={{ color: 'var(--blue)' }}>{inv.customer?.email}</span>
            </div>
          </div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.invoiceStrip}>
          <div className={styles.stripItem}>
            <span className={styles.stripLabel}>Invoice</span>
            <span className={styles.stripVal} style={{ fontFamily: "'Space Mono', monospace" }}>
              {inv.invoiceNumber}
            </span>
          </div>
          <div className={styles.stripDivider} />
          <div className={styles.stripItem}>
            <span className={styles.stripLabel}>Amount Due</span>
            <span className={styles.stripVal} style={{ color: 'var(--orange)', fontWeight: 700 }}>
              {fmt(inv.total)}
            </span>
          </div>
          <div className={styles.stripDivider} />
          <div className={styles.stripItem}>
            <span className={styles.stripLabel}>Due Date</span>
            <span className={styles.stripVal}>{fmtDateLong(inv.dueDate)}</span>
          </div>
          <div className={styles.stripDivider} />
          <div className={styles.stripItem}>
            <span className={styles.stripLabel}>Status</span>
            <span className={styles.stripVal} style={{
              color: inv.status === 'overdue' ? 'var(--red)' : 'var(--orange)',
              textTransform: 'capitalize',
            }}>
              {inv.status}
            </span>
          </div>
        </div>
        <div className={styles.field}>
          <label>To</label>
          <div className={styles.toField}>
            <span className={styles.toAvatar}>
              {(inv.customer?.name ?? 'U')[0].toUpperCase()}
            </span>
            <span style={{ fontWeight: 500 }}>{inv.customer?.name}</span>
            <span style={{ color: 'var(--text3)', fontSize: 12 }}>&lt;{inv.customer?.email}&gt;</span>
          </div>
        </div>
        <div className={styles.field}>
          <label>Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject…"
          />
        </div>
        <div className={styles.field}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label>Message</label>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              Edit freely — this is what the customer will receive
            </span>
          </div>
          <textarea
            className={styles.textarea}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={9}
          />
        </div>
        {sendError && (
          <div className={styles.sendError}>✕ {sendError}</div>
        )}
        <div className={styles.modalFooter}>
          <button className={styles.btnGhost} onClick={onClose}>Cancel</button>
          <button
            className={styles.btnBlue}
            onClick={handleSend}
            disabled={sending || !subject.trim() || !body.trim()}
          >
            {sending ? <span className={styles.spinner} /> : '📤'}
            {sending ? 'Sending…' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
}

const FILTERS = [
  { key: 'all',     label: 'All'           },
  { key: 'overdue', label: 'Overdue'       },
  { key: 'pending', label: 'Pending'       },
  { key: 'sent',    label: 'Reminder Sent' },
];

const UNPAID_STATUSES = ['sent', 'pending', 'overdue'];

function applyFilter(inv, filter) {
  if (filter.has('all')) return true;

  const wantSent    = filter.has('sent');
  const wantOverdue = filter.has('overdue');
  const wantPending = filter.has('pending');

  if (wantSent && !wantOverdue && !wantPending)
    return !!inv.reminderSentAt;

  if (wantOverdue && wantSent && !wantPending)
    return inv.status === 'overdue' && !!inv.reminderSentAt;

  if (wantPending && wantSent && !wantOverdue)
    return inv.status === 'pending' && !!inv.reminderSentAt;

  if (wantOverdue && wantPending && wantSent)
    return true;

  if (wantOverdue && !wantPending && !wantSent)
    return inv.status === 'overdue' && !inv.reminderSentAt;

  if (wantPending && !wantOverdue && !wantSent)
    return inv.status === 'pending' && !inv.reminderSentAt;

  if (wantOverdue && wantPending && !wantSent)
    return (inv.status === 'overdue' || inv.status === 'pending') && !inv.reminderSentAt;

  return false;
}

export default function Reminders() {
  const [queue,      setQueue]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [sending,    setSending]    = useState({});
  const [sendingAll, setSendingAll] = useState(false);
  const [toast,      setToast]      = useState(null);
  const [composeInv, setComposeInv] = useState(null);
  const [filter,     setFilter]     = useState(new Set(['all']));

  const [subject, setSubject] = useState('Reminder: Invoice {invoiceNumber} due on {dueDate}');
  const [body,    setBody]    = useState(
    'Hi {customerName},\n\nThis is a friendly reminder that invoice {invoiceNumber} for {amount} is due on {dueDate}.\n\nPlease arrange payment at your earliest convenience.\n\nThanks,\nInvoiceFlow'
  );

  const notify = (msg, type = 'success') => setToast({ msg, type });

  function toggleFilter(key) {
    if (key === 'all') { setFilter(new Set(['all'])); return; }
    setFilter(prev => {
      const next = new Set(prev);
      next.delete('all');
      if (next.has(key)) { next.delete(key); if (next.size === 0) next.add('all'); }
      else next.add(key);
      return next;
    });
  }

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const all    = await getInvoices();
      const unpaid = all.filter((inv) => UNPAID_STATUSES.includes(inv.status));
      unpaid.sort((a, b) => {
        if (a.status === 'overdue' && b.status !== 'overdue') return -1;
        if (b.status === 'overdue' && a.status !== 'overdue') return  1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
      setQueue(unpaid);
    } catch (e) { setError(e.message); }
    finally     { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSend(invoiceId, customSubject, customBody) {
    setSending((s) => ({ ...s, [invoiceId]: true }));
    try {
      const res = await sendReminder(invoiceId, customSubject, customBody);
      notify(res.message ?? 'Reminder sent!');
      await load();
    } catch (e) { notify(e.message, 'error'); throw e; }
    finally     { setSending((s) => ({ ...s, [invoiceId]: false })); }
  }

  async function handleSendAll() {
    setSendingAll(true);
    try {
      const res = await sendAllReminders();
      notify(res.message ?? 'Reminders sent!');
      await load();
    } catch (e) { notify(e.message, 'error'); }
    finally     { setSendingAll(false); }
  }

  const totalOverdue  = queue.filter((inv) => inv.status === 'overdue').length;
  const totalPending  = queue.filter((inv) => inv.status === 'pending').length;
  const remindersSent = queue.filter((inv) => !!inv.reminderSentAt).length;
  const totalAmount   = queue.reduce((sum, inv) => sum + (inv.total ?? 0), 0);
  const filteredQueue = queue.filter((inv) => applyFilter(inv, filter));

  const counts = {
    all:     queue.length,
    overdue: totalOverdue,
    pending: totalPending,
    sent:    remindersSent,
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>Reminders</div>
          <div className={styles.pageSubtitle}>Track and send payment reminders</div>
        </div>
        <button
          className={styles.btnBlue}
          onClick={handleSendAll}
          disabled={sendingAll || queue.length === 0}
        >
          {sendingAll ? <span className={styles.spinner} /> : '📤'}
          {sendingAll ? 'Sending…' : 'Send All Pending'}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.statsGrid}>
        <StatCard label="Reminders Sent" value={String(remindersSent)} color="var(--blue)"   />
        <StatCard label="Overdue"         value={String(totalOverdue)}  color="var(--red)"    />
        <StatCard label="Pending"         value={String(totalPending)}  color="var(--orange)" />
        <StatCard label="Total Unpaid"    value={fmt(totalAmount)}      color="var(--green)"  />
      </div>

      <div className={styles.section}>

        {/* ── Single header row: title LEFT · pills CENTER/RIGHT · count FAR RIGHT ── */}
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>📋 Reminder Queue</span>

          <div className={styles.filterTabs}>
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                className={`${styles.filterTab} ${filter.has(key) ? styles.filterTabActive : ''} ${styles[`filterTab_${key}`] || ''}`}
                onClick={() => toggleFilter(key)}
              >
                {label}
                <span className={styles.filterBadge}>
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>

          <span className={styles.sectionCount}>
            {filteredQueue.length} invoice{filteredQueue.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className={styles.tableWrap}>
          {loading ? (
            <div className={styles.loadingMsg}>Loading reminders…</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Invoice</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Last Reminder</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.empty}>
                      {filter.has('all')
                        ? '🎉 No pending reminders — all caught up!'
                        : 'No invoices in selected categories.'}
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map((inv) => {
                    const isSending = sending[inv._id];
                    const isOverdue = inv.status === 'overdue';
                    return (
                      <tr key={inv._id}>
                        <td>
                          <div className={styles.name}>{inv.customer?.name ?? '—'}</div>
                          <div className={styles.muted}>{inv.customer?.email ?? ''}</div>
                        </td>
                        <td className={styles.idCell}>{inv.invoiceNumber}</td>
                        <td className={styles.amount}>{fmt(inv.total)}</td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            <span className={styles.statusBadge} style={{
                              color:      isOverdue ? 'var(--red)'    : 'var(--orange)',
                              background: isOverdue ? 'var(--red-bg)' : 'var(--orange-bg)',
                              cursor: 'default', pointerEvents: 'none',
                            }}>
                              {isOverdue ? 'Overdue' : 'Pending'}
                            </span>
                            {inv.reminderSentAt && (
                              <span className={styles.statusBadge} style={{
                                color: 'var(--green)', background: 'var(--green-bg)',
                                cursor: 'default', pointerEvents: 'none',
                              }}>
                                ✓ Sent
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={styles.muted}>
                          {inv.reminderSentAt ? fmtDateShort(inv.reminderSentAt) : '—'}
                        </td>
                        <td>
                          <button
                            className={styles.btnEmail}
                            disabled={isSending}
                            onClick={() => setComposeInv(inv)}
                          >
                            {isSending ? <span className={styles.spinnerBlue} /> : '✉'}
                            {isSending ? 'Sending…' : 'Email'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {composeInv && (
        <EmailModal
          inv={composeInv}
          defaultSubject={subject}
          defaultBody={body}
          onClose={() => setComposeInv(null)}
          onSend={handleSend}
        />
      )}

      {toast && (
        <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />
      )}
    </div>
  );
}