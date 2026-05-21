// src/components/InvoiceDrawer.jsx
import { useState, useEffect, useRef } from 'react';
import StatusBadge from './StatusBadge';
import { updateInvoice, updateInvoiceStatus } from '../api/invoices';
import styles from './InvoiceDrawer.module.css';

function fmt(amount) {
  if (amount == null) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function toInputDate(iso) {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

function cap(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const STATUSES = ['draft', 'sent', 'pending', 'paid', 'overdue', 'cancelled'];
const EMPTY_LINE = () => ({ description: '', quantity: 1, unitPrice: '', total: 0 });

const STATUS_COLOR = {
  paid:      { color: 'var(--green)',  bg: 'var(--green-bg)'       },
  pending:   { color: 'var(--orange)', bg: 'var(--orange-bg)'      },
  overdue:   { color: 'var(--red)',    bg: 'var(--red-bg)'         },
  draft:     { color: 'var(--text2)',  bg: 'rgba(107,114,128,0.1)' },
  sent:      { color: '#60a5fa',       bg: 'rgba(59,130,246,0.12)' },
  cancelled: { color: 'var(--text3)',  bg: 'rgba(74,86,106,0.15)'  },
};

// ── StatusDropdown ─────────────────────────────────────────────────────────

function StatusDropdown({ status, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const meta = STATUS_COLOR[status] || STATUS_COLOR.draft;

  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className={styles.statusWrap}>
      <button
        type="button"
        className={styles.statusBtn}
        style={{ color: meta.color, background: meta.bg }}
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
      >
        <span className={styles.dot} style={{ background: meta.color }} />
        {cap(status)}
        {!disabled && <span className={styles.chevron}>▾</span>}
      </button>
      {open && (
        <div className={styles.statusMenu}>
          {STATUSES.map((s) => {
            const m = STATUS_COLOR[s];
            return (
              <button
                key={s}
                type="button"
                className={`${styles.statusOption} ${s === status ? styles.statusOptionActive : ''}`}
                onClick={() => { onChange(s); setOpen(false); }}
              >
                <span className={styles.dot} style={{ background: m.color }} />
                {cap(s)}
                {s === status && <span className={styles.check}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── ViewMode ───────────────────────────────────────────────────────────────

function ViewMode({ invoice, onEdit }) {
  const subtotal = invoice.lineItems?.reduce((s, l) => s + (l.total || 0), 0) ?? 0;
  const taxAmt   = parseFloat(((subtotal * (invoice.tax || 0)) / 100).toFixed(2));
  const total    = invoice.total ?? parseFloat((subtotal + taxAmt).toFixed(2));
  const customer = typeof invoice.customer === 'object' ? invoice.customer : null;

  return (
    <div className={styles.viewBody}>

      {/* ── Meta grid ── */}
      <div className={styles.viewMeta}>
        {[
          { label: 'Invoice',  value: `#${invoice.invoiceNumber}`, mono: true },
          { label: 'Issued',   value: fmtDate(invoice.issueDate) },
          { label: 'Due',      value: fmtDate(invoice.dueDate) },
        ].map(({ label, value, mono }) => (
          <div key={label} className={styles.viewMetaRow}>
            <span className={styles.viewLabel}>{label}</span>
            <span className={`${styles.viewValue} ${mono ? styles.mono : ''}`}>{value}</span>
          </div>
        ))}
        <div className={styles.viewMetaRow}>
          <span className={styles.viewLabel}>Status</span>
          <span
            className={styles.statusPill}
            style={{
              color: STATUS_COLOR[invoice.status]?.color,
              background: STATUS_COLOR[invoice.status]?.bg,
            }}
          >
            <span className={styles.dot} style={{ background: STATUS_COLOR[invoice.status]?.color }} />
            {cap(invoice.status)}
          </span>
        </div>
      </div>

      {/* ── Customer ── */}
      {customer && (
        <div className={styles.viewSection}>
          <div className={styles.viewSectionTitle}>Customer</div>
          <div className={styles.customerCard}>
            <div className={styles.customerAvatar}>{customer.name?.charAt(0).toUpperCase()}</div>
            <div className={styles.customerInfo}>
              <div className={styles.customerName}>{customer.name}</div>
              {customer.company && <div className={styles.customerSub}>{customer.company}</div>}
              <div className={styles.customerSub}>{customer.email}</div>
              {customer.phone && <div className={styles.customerSub}>{customer.phone}</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── Line items ── */}
      <div className={styles.viewSection}>
        <div className={styles.viewSectionTitle}>Line Items</div>
        <div className={styles.lineTable}>
          <div className={styles.lineTableHeader}>
            <span>Description</span>
            <span style={{ textAlign: 'center' }}>Qty</span>
            <span style={{ textAlign: 'right' }}>Unit Price</span>
            <span style={{ textAlign: 'right' }}>Total</span>
          </div>
          {invoice.lineItems?.map((l, i) => (
            <div key={i} className={`${styles.lineTableRow} ${styles.fadeInRow}`} style={{ animationDelay: `${i * 40}ms` }}>
              <span className={styles.lineDesc}>{l.description}</span>
              <span style={{ textAlign: 'center', color: 'var(--text2)' }}>{l.quantity}</span>
              <span style={{ textAlign: 'right', color: 'var(--text2)' }}>{fmt(l.unitPrice)}</span>
              <span style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(l.total)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Totals ── */}
      <div className={styles.viewTotals}>
        <div className={styles.viewTotalRow}>
          <span>Subtotal</span><span>{fmt(subtotal)}</span>
        </div>
        {invoice.tax > 0 && (
          <div className={styles.viewTotalRow}>
            <span>Tax ({invoice.tax}%)</span>
            <span>{fmt(taxAmt)}</span>
          </div>
        )}
        <div className={`${styles.viewTotalRow} ${styles.viewGrandTotal}`}>
          <span>Total</span>
          <span className={styles.grandTotalAmt}>{fmt(total)}</span>
        </div>
      </div>

      {/* ── Notes ── */}
      {invoice.notes && (
        <div className={styles.viewSection}>
          <div className={styles.viewSectionTitle}>Notes</div>
          <div className={styles.viewNotes}>{invoice.notes}</div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className={styles.viewFooter}>
        <button className={styles.btnBlue} onClick={onEdit}>
          <span className={styles.editIcon}>✎</span> Edit Invoice
        </button>
      </div>
    </div>
  );
}

// ── EditMode ───────────────────────────────────────────────────────────────

function EditMode({ invoice, onSaved, onCancel }) {
  const customer = typeof invoice.customer === 'object' ? invoice.customer : null;

  const [form, setForm] = useState({
    status:    invoice.status    ?? 'draft',
    issueDate: toInputDate(invoice.issueDate),
    dueDate:   toInputDate(invoice.dueDate),
    tax:       invoice.tax       ?? 0,
    notes:     invoice.notes     ?? '',
    lineItems: invoice.lineItems?.length
      ? invoice.lineItems.map((l) => ({ ...l }))
      : [EMPTY_LINE()],
  });

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  function set(field, val) { setForm((f) => ({ ...f, [field]: val })); }

  function setLine(idx, field, raw) {
    setForm((f) => {
      const items = f.lineItems.map((l, i) => {
        if (i !== idx) return l;
        const updated = { ...l, [field]: raw };
        const qty   = parseFloat(field === 'quantity'  ? raw : updated.quantity)  || 0;
        const price = parseFloat(field === 'unitPrice' ? raw : updated.unitPrice) || 0;
        updated.total = parseFloat((qty * price).toFixed(2));
        return updated;
      });
      return { ...f, lineItems: items };
    });
  }

  function addLine() { setForm((f) => ({ ...f, lineItems: [...f.lineItems, EMPTY_LINE()] })); }
  function removeLine(idx) { setForm((f) => ({ ...f, lineItems: f.lineItems.filter((_, i) => i !== idx) })); }

  const subtotal = form.lineItems.reduce((s, l) => s + (l.total || 0), 0);
  const taxAmt   = parseFloat(((subtotal * (parseFloat(form.tax) || 0)) / 100).toFixed(2));
  const total    = parseFloat((subtotal + taxAmt).toFixed(2));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!form.dueDate) { setError('Due date is required.'); return; }
    if (!form.lineItems.length) { setError('Add at least one line item.'); return; }
    if (form.lineItems.some((l) => !l.description.trim())) {
      setError('All line items need a description.'); return;
    }
    setSaving(true);
    try {
      const payload = {
        customer:  typeof invoice.customer === 'object' ? invoice.customer._id : invoice.customer,
        status:    form.status,
        issueDate: form.issueDate,
        dueDate:   form.dueDate,
        tax:       parseFloat(form.tax) || 0,
        notes:     form.notes,
        lineItems: form.lineItems.map((l) => ({
          description: l.description,
          quantity:    parseFloat(l.quantity)  || 1,
          unitPrice:   parseFloat(l.unitPrice) || 0,
          total:       l.total,
        })),
      };
      const saved = await updateInvoice(invoice._id, payload);
      onSaved({ ...saved, customer: customer ?? saved.customer });
    } catch (err) {
      setError(err.message ?? 'Something went wrong.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className={styles.editBody} noValidate>

      {error && (
        <div className={styles.formError}>
          <span className={styles.errorIcon}>⚠</span> {error}
        </div>
      )}

      {customer && (
        <div className={styles.editSection}>
          <div className={styles.editSectionTitle}>Customer</div>
          <div className={styles.customerCard}>
            <div className={styles.customerAvatar}>{customer.name?.charAt(0).toUpperCase()}</div>
            <div className={styles.customerInfo}>
              <div className={styles.customerName}>{customer.name}</div>
              {customer.company && <div className={styles.customerSub}>{customer.company}</div>}
              <div className={styles.customerSub}>{customer.email}</div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.editSection}>
        <div className={styles.editSectionTitle}>Status</div>
        <StatusDropdown status={form.status} onChange={(s) => set('status', s)} />
      </div>

      <div className={styles.editSection}>
        <div className={styles.editSectionTitle}>Dates</div>
        <div className={styles.dateRow}>
          <div className={styles.dateField}>
            <label className={styles.editLabel}>Issue Date</label>
            <input type="date" className={styles.input}
              value={form.issueDate} onChange={(e) => set('issueDate', e.target.value)} />
          </div>
          <div className={styles.dateField}>
            <label className={styles.editLabel}>Due Date <span className={styles.req}>*</span></label>
            <input type="date" className={styles.input}
              value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
          </div>
        </div>
      </div>

      <div className={styles.editSection}>
        <div className={styles.editSectionTitle}>Line Items</div>
        <div className={styles.lineItems}>
          <div className={styles.lineHeaderRow}>
            <span>Description</span>
            <span style={{ textAlign: 'center' }}>Qty</span>
            <span>Unit Price</span>
            <span style={{ textAlign: 'right' }}>Total</span>
            <span />
          </div>
          {form.lineItems.map((line, idx) => (
            <div key={idx} className={`${styles.lineRow} ${styles.fadeInRow}`} style={{ animationDelay: `${idx * 30}ms` }}>
              <input className={styles.lineDesc} placeholder="e.g. Web Development"
                value={line.description}
                onChange={(e) => setLine(idx, 'description', e.target.value)} />
              <input className={styles.lineQty} type="number" min="1" placeholder="1"
                value={line.quantity}
                onChange={(e) => setLine(idx, 'quantity', e.target.value)} />
              <input className={styles.linePrice} type="number" min="0" step="0.01" placeholder="0.00"
                value={line.unitPrice}
                onChange={(e) => setLine(idx, 'unitPrice', e.target.value)} />
              <span className={styles.lineTotal}>₹{Number(line.total).toLocaleString('en-IN')}</span>
              <button type="button" className={styles.removeBtn}
                onClick={() => removeLine(idx)}
                disabled={form.lineItems.length === 1} title="Remove">✕</button>
            </div>
          ))}
          <button type="button" className={styles.addLineBtn} onClick={addLine}>
            + Add line item
          </button>
        </div>
      </div>

      <div className={styles.totalsBox}>
        <div className={styles.totalRow}>
          <span>Subtotal</span><span>₹{subtotal.toLocaleString('en-IN')}</span>
        </div>
        <div className={styles.totalRow}>
          <span>
            Tax&nbsp;
            <input className={styles.taxInput} type="number" min="0" max="100" step="0.5"
              value={form.tax} onChange={(e) => set('tax', e.target.value)} />%
          </span>
          <span>₹{taxAmt.toLocaleString('en-IN')}</span>
        </div>
        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
          <span>Total</span>
          <span className={styles.grandTotalAmt}>₹{total.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div className={styles.editSection}>
        <div className={styles.editSectionTitle}>Notes</div>
        <textarea className={styles.textarea} rows={3}
          value={form.notes} onChange={(e) => set('notes', e.target.value)}
          placeholder="Payment terms, bank details…" />
      </div>

      <div className={styles.editFooter}>
        <button type="button" className={styles.btnGhost} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.btnBlue} disabled={saving}>
          {saving
            ? <><span className={styles.spinner} /> Saving…</>
            : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

// ── Main Drawer ────────────────────────────────────────────────────────────

export default function InvoiceDrawer({ invoice, initialMode = 'view', onClose, onSaved, onDelete }) {
  const [mode, setMode]       = useState(initialMode);
  const [current, setCurrent] = useState(invoice);
  const [animating, setAnimating] = useState(false);
  const prevIdRef = useRef(null);

  useEffect(() => {
    if (invoice?._id !== prevIdRef.current) {
      prevIdRef.current = invoice?._id;
      setMode(initialMode);
    }
    setCurrent(invoice);
  }, [invoice?._id, initialMode]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleSaved(updated) {
    setCurrent(updated);
    setMode('view');
    onSaved?.(updated);
  }

  function switchMode(newMode) {
    if (newMode === mode) return;
    setAnimating(true);
    setTimeout(() => {
      setMode(newMode);
      setAnimating(false);
    }, 160);
  }

  const isEdit = mode === 'edit';

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.drawer}>

        {/* ── Sticky Header ── */}
        <div className={styles.drawerHeader}>
          <div className={styles.drawerTitleGroup}>
            <span className={styles.drawerInvNum}>#{current.invoiceNumber}</span>
            <span
              className={styles.statusChip}
              style={{
                color: STATUS_COLOR[current.status]?.color,
                background: STATUS_COLOR[current.status]?.bg,
              }}
            >
              <span className={styles.dot} style={{ background: STATUS_COLOR[current.status]?.color }} />
              {cap(current.status)}
            </span>
          </div>

          <div className={styles.drawerHeaderActions}>
            <div className={styles.modePill}>
              <button
                className={`${styles.modeBtn} ${!isEdit ? styles.modeBtnActive : ''}`}
                onClick={() => switchMode('view')}
                title="View"
              >
                👁 View
              </button>
              <button
                className={`${styles.modeBtn} ${isEdit ? styles.modeBtnActive : ''}`}
                onClick={() => switchMode('edit')}
                title="Edit"
              >
                ✎ Edit
              </button>
            </div>

            {onDelete && (
              <button
                className={styles.drawerDeleteBtn}
                onClick={() => onDelete(current)}
                title="Delete invoice"
              >
                🗑
              </button>
            )}

            <button className={styles.closeBtn} onClick={onClose} title="Close (Esc)">✕</button>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className={`${styles.drawerBody} ${animating ? styles.bodyFadeOut : styles.bodyFadeIn}`}>
          {!isEdit ? (
            <ViewMode invoice={current} onEdit={() => switchMode('edit')} />
          ) : (
            <EditMode
              invoice={current}
              onSaved={handleSaved}
              onCancel={() => switchMode('view')}
            />
          )}
        </div>
      </div>
    </>
  );
}