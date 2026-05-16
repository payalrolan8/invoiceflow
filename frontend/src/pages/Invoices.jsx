// src/pages/Invoices.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './Invoices.module.css';
import { Card, CardHeader, CardBody } from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import { PlusIcon, SearchIcon } from '../components/Icons';
import InvoiceDrawer from '../components/InvoiceDrawer';
import {
  getInvoices,
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
} from '../api/invoices';
import { getCustomers } from '../api/customers';

// ── Helpers ────────────────────────────────────────────────────────────────

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

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function Highlight({ text = '', query = '' }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className={styles.mark}>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

const FILTERS  = ['All', 'Draft', 'Sent', 'Pending', 'Paid', 'Overdue', 'Cancelled'];
const STATUSES = ['draft', 'sent', 'pending', 'paid', 'overdue', 'cancelled'];

const FILTER_COLORS = {
  All:       { bg: 'var(--blue)',    text: '#fff' },
  Draft:     { bg: '#6b7280',        text: '#fff' },
  Sent:      { bg: '#60a5fa',        text: '#fff' },
  Pending:   { bg: '#f97316',        text: '#fff' },
  Paid:      { bg: '#22c55e',        text: '#fff' },
  Overdue:   { bg: '#ef4444',        text: '#fff' },
  Cancelled: { bg: '#4a566a',        text: '#fff' },
};

// ── Sort options (mirrors Customers page) ──────────────────────────────────
const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest first'    },
  { value: 'oldest',     label: 'Oldest first'    },
  { value: 'due_soon',   label: 'Due date (soon)' },
  { value: 'due_late',   label: 'Due date (late)' },
  { value: 'amount_hi',  label: 'Highest amount'  },
  { value: 'amount_lo',  label: 'Lowest amount'   },
];

const EMPTY_LINE = () => ({ description: '', quantity: 1, unitPrice: '', total: 0 });

const EMPTY_FORM = {
  customer:  null,
  status:    'draft',
  issueDate: toInputDate(new Date().toISOString()),
  dueDate:   '',
  tax:       0,
  notes:     '',
  lineItems: [EMPTY_LINE()],
};

// ── StatusDropdown ─────────────────────────────────────────────────────────

function StatusDropdown({ invoice, onStatusChange }) {
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function pick(e, status) {
    e.stopPropagation();
    setOpen(false);
    if (status === invoice.status) return;
    setSaving(true);
    try {
      await updateInvoiceStatus(invoice._id, status);
      onStatusChange(invoice._id, status);
    } catch { /* silent */ } finally {
      setSaving(false);
    }
  }

  return (
    <div
      ref={ref}
      className={styles.statusWrap}
      onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
    >
      <span className={`${styles.statusTrigger} ${saving ? styles.saving : ''}`}>
        <StatusBadge status={capitalize(invoice.status)} />
        <span className={styles.chevron}>▾</span>
      </span>
      {open && (
        <div className={styles.statusMenu}>
          {STATUSES.map((s) => (
            <button
              key={s}
              className={`${styles.statusOption} ${s === invoice.status ? styles.statusOptionActive : ''}`}
              onClick={(e) => pick(e, s)}
            >
              <StatusBadge status={capitalize(s)} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── CustomerPicker ─────────────────────────────────────────────────────────

function CustomerPicker({ value, onChange }) {
  const [customers, setCustomers] = useState([]);
  const [query, setQuery]         = useState('');
  const [open, setOpen]           = useState(false);
  const [loading, setLoading]     = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setLoading(true);
    getCustomers()
      .then(setCustomers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setQuery(value?.name ?? '');
  }, [value?._id]);

  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setQuery(value?.name ?? '');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, value]);

  const filtered = customers.filter((c) => {
    const q = query.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q)
    );
  });

  function select(c) {
    onChange(c);
    setQuery(c.name);
    setOpen(false);
  }

  function clear(e) {
    e.stopPropagation();
    onChange(null);
    setQuery('');
  }

  return (
    <div ref={ref} className={styles.pickerWrap}>
      <div className={styles.pickerInputRow}>
        <span className={styles.pickerSearchIcon}>⌕</span>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={loading ? 'Loading customers…' : 'Search by name, email or company…'}
          className={styles.pickerText}
          autoComplete="off"
        />
        {value && (
          <button type="button" className={styles.pickerClear} onClick={clear} title="Clear">✕</button>
        )}
      </div>

      {value && (
        <div className={styles.pickerSelected}>
          <span className={styles.pickerAvatar}>{value.name.charAt(0).toUpperCase()}</span>
          <div className={styles.pickerMeta}>
            <span className={styles.pickerName}>{value.name}</span>
            {value.company && <span className={styles.pickerSub}>{value.company}</span>}
            <span className={styles.pickerSub}>{value.email}</span>
          </div>
        </div>
      )}

      {open && filtered.length > 0 && (
        <div className={styles.pickerMenu}>
          {filtered.slice(0, 8).map((c) => (
            <button key={c._id} type="button" className={styles.pickerOption} onClick={() => select(c)}>
              <span className={styles.pickerAvatar}>{c.name.charAt(0).toUpperCase()}</span>
              <div className={styles.pickerMeta}>
                <span className={styles.pickerName}>{c.name}</span>
                <span className={styles.pickerSub}>{[c.company, c.email].filter(Boolean).join(' · ')}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && query.length > 0 && filtered.length === 0 && (
        <div className={styles.pickerMenu}>
          <div className={styles.pickerEmpty}>No customers match "{query}"</div>
        </div>
      )}
    </div>
  );
}

// ── InvoiceModal ───────────────────────────────────────────────────────────

function InvoiceModal({ invoice, onClose, onSaved }) {
  const isEdit = !!invoice;

  const [form, setForm] = useState(() => {
    if (!invoice) return { ...EMPTY_FORM, lineItems: [EMPTY_LINE()] };
    const cust = invoice.customer && typeof invoice.customer === 'object'
      ? invoice.customer : null;
    return {
      customer:  cust,
      status:    invoice.status    ?? 'draft',
      issueDate: toInputDate(invoice.issueDate),
      dueDate:   toInputDate(invoice.dueDate),
      tax:       invoice.tax       ?? 0,
      notes:     invoice.notes     ?? '',
      lineItems: invoice.lineItems?.length
        ? invoice.lineItems.map((l) => ({ ...l }))
        : [EMPTY_LINE()],
    };
  });

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const [touchedPrices, setTouchedPrices] = useState({});

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }));
  }

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

  function addLine() {
    setForm((f) => ({ ...f, lineItems: [...f.lineItems, EMPTY_LINE()] }));
  }

  function removeLine(idx) {
    setForm((f) => ({ ...f, lineItems: f.lineItems.filter((_, i) => i !== idx) }));
  }

  const subtotal  = form.lineItems.reduce((s, l) => s + (l.total || 0), 0);
  const taxAmount = parseFloat(((subtotal * (form.tax || 0)) / 100).toFixed(2));
  const total     = parseFloat((subtotal + taxAmount).toFixed(2));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!form.customer?._id) { setError('Please select a customer.'); return; }
    if (!form.dueDate)        { setError('Due date is required.');     return; }
    if (!form.lineItems.length) { setError('Add at least one line item.'); return; }
    const hasEmptyLine = form.lineItems.some((l) => !l.description.trim() || !(parseFloat(l.unitPrice) > 0));
    if (hasEmptyLine) { setError('Each line item needs a description and a price greater than ₹0.'); return; }
    if (subtotal <= 0) { setError('Invoice total must be greater than ₹0.'); return; }

    setSaving(true);
    try {
      const payload = {
        customer:  form.customer._id,
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
      const saved = isEdit
        ? await updateInvoice(invoice._id, payload)
        : await createInvoice(payload);

      const savedWithCustomer = { ...saved, customer: form.customer };

      onSaved(savedWithCustomer, isEdit);
      onClose();
    } catch (err) {
      setError(err.message ?? 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        <div className={styles.modalHeader}>
          <h2>{isEdit ? `Edit ${invoice.invoiceNumber}` : 'New Invoice'}</h2>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        {error && <div className={styles.formError}>{error}</div>}

        <form onSubmit={submit} style={{ display: 'contents' }}>

          <div className={styles.field}>
            <label>Customer *</label>
            <CustomerPicker value={form.customer} onChange={(c) => set('customer', c)} />
          </div>

          <div className={styles.field}>
            <label>Status</label>
            <select className={styles.select} value={form.status} onChange={(e) => set('status', e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
            </select>
          </div>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label>Issue Date</label>
              <input type="date" value={form.issueDate} onChange={(e) => set('issueDate', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Due Date *</label>
              <input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} required />
            </div>
          </div>

          <div className={styles.field}>
            <label>Line Items</label>
            <div className={styles.lineItems}>
              <div className={styles.lineHeaderRow}>
                <span>Description</span>
                <span style={{ textAlign: 'center' }}>Qty</span>
                <span>Unit Price</span>
                <span style={{ textAlign: 'right' }}>Total</span>
                <span />
              </div>
              {form.lineItems.map((line, idx) => (
                <div key={idx} className={styles.lineRow}>
                  <input className={styles.lineDesc} placeholder="Description" value={line.description}
                    onChange={(e) => setLine(idx, 'description', e.target.value)} />
                  <input className={styles.lineQty} type="number" min="1" placeholder="1" value={line.quantity}
                    onChange={(e) => setLine(idx, 'quantity', e.target.value)} />
                  <div className={styles.linePriceWrap}>
                    <input
                      className={`${styles.linePrice} ${touchedPrices[idx] && !(parseFloat(line.unitPrice) > 0) ? styles.inputError : ''}`}
                      type="number" min="0" step="0.01" placeholder="0.00" value={line.unitPrice}
                      onChange={(e) => { setLine(idx, 'unitPrice', e.target.value); setTouchedPrices((t) => ({ ...t, [idx]: true })); }}
                      onBlur={() => setTouchedPrices((t) => ({ ...t, [idx]: true }))}
                    />
                    {touchedPrices[idx] && !(parseFloat(line.unitPrice) > 0) && (
                      <span className={styles.priceWarn}>Enter a price &gt; 0</span>
                    )}
                  </div>
                  <span className={styles.lineTotal}>{fmt(line.total)}</span>
                  <button type="button" className={styles.removeBtn} onClick={() => removeLine(idx)}
                    disabled={form.lineItems.length === 1} title="Remove">✕</button>
                </div>
              ))}
              <button type="button" className={styles.addLineBtn} onClick={addLine}>+ Add line item</button>
            </div>
          </div>

          <div className={styles.totalsBox}>
            <div className={styles.totalRow}>
              <span>Subtotal</span><span>{fmt(subtotal)}</span>
            </div>
            <div className={styles.totalRow}>
              <span>Tax&nbsp;
                <input className={styles.taxInput} type="number" min="0" max="100" step="0.5"
                  value={form.tax} onChange={(e) => set('tax', e.target.value)} />%
              </span>
              <span className={styles.taxAmt}>{fmt(taxAmount)}</span>
            </div>
            <div className={`${styles.totalRow} ${styles.grandTotal}`}>
              <span>Total</span><span>{fmt(total)}</span>
            </div>
          </div>

          <div className={styles.field}>
            <label>Notes</label>
            <textarea className={styles.textarea} rows={3} value={form.notes}
              onChange={(e) => set('notes', e.target.value)} placeholder="Payment terms, additional info…" />
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnGhost} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.btnBlue} disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────

function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className={styles.toast}>{message}</div>;
}

// ── Sort helper ────────────────────────────────────────────────────────────

function sortInvoices(list, sort) {
  return [...list].sort((a, b) => {
    switch (sort) {
      case 'newest':    return new Date(b.createdAt) - new Date(a.createdAt);
      case 'oldest':    return new Date(a.createdAt) - new Date(b.createdAt);
      case 'due_soon':  return new Date(a.dueDate)   - new Date(b.dueDate);
      case 'due_late':  return new Date(b.dueDate)   - new Date(a.dueDate);
      case 'amount_hi': return (b.total || 0)         - (a.total || 0);
      case 'amount_lo': return (a.total || 0)         - (b.total || 0);
      default:          return 0;
    }
  });
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function Invoices() {
  const [invoices,    setInvoices]    = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [filter,      setFilter]      = useState('All');
  const [search,      setSearch]      = useState('');
  const [sort,        setSort]        = useState('newest');   // ← NEW
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [modalInvoice, setModal]      = useState(undefined);
  const [drawer,      setDrawer]      = useState(null);
  const [toast,       setToast]       = useState(null);

  const loadAll = useCallback(() => {
    getInvoices({}).then(setAllInvoices).catch(() => {});
  }, []);

  const load = useCallback((activeFilter) => {
    setLoading(true);
    setError(null);
    const status = activeFilter === 'All' ? undefined : activeFilter.toLowerCase();
    getInvoices({ status })
      .then(setInvoices)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { load(filter); }, [filter, load]);

  // Search filter + sort applied client-side on top of status filter
  const displayed = sortInvoices(
    invoices.filter((inv) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        inv.invoiceNumber?.toString().toLowerCase().includes(q) ||
        inv.customer?.name?.toLowerCase().includes(q)          ||
        inv.customer?.email?.toLowerCase().includes(q)         ||
        inv.customer?.company?.toLowerCase().includes(q)       ||
        inv.status?.toLowerCase().includes(q)
      );
    }),
    sort,
  );

  function getCount(f) {
    if (f === 'All') return allInvoices.length;
    return allInvoices.filter((inv) => inv.status === f.toLowerCase()).length;
  }

  function handleStatusChange(id, status) {
    setInvoices((prev) => prev.map((inv) => inv._id === id ? { ...inv, status } : inv));
    setAllInvoices((prev) => prev.map((inv) => inv._id === id ? { ...inv, status } : inv));
    setDrawer((prev) => prev?._id === id ? { ...prev, status } : prev);
    setToast(`Status updated to ${capitalize(status)}`);
    load(filter);
  }

  function handleSaved(saved, isEdit) {
    if (isEdit) {
      setInvoices((prev) => prev.map((inv) => inv._id === saved._id ? saved : inv));
      setAllInvoices((prev) => prev.map((inv) => inv._id === saved._id ? saved : inv));
      setToast('Invoice updated');
    } else {
      setInvoices((prev) => [saved, ...prev]);
      setAllInvoices((prev) => [saved, ...prev]);
      setToast('Invoice created');
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Invoices</h1>
          <p className={styles.pageSubtitle}>
            {loading
              ? 'Loading…'
              : `${displayed.length} of ${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button className={styles.btnBlue} onClick={() => setModal(null)}>
          <PlusIcon /> New Invoice
        </button>
      </div>

      {error && <div className={styles.errorBanner}>⚠ {error}</div>}

      <Card>
        {/* ── Toolbar ── */}
        <div className={styles.toolbar}>
          {/* Search */}
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}><SearchIcon /></span>
            <input
              type="text"
              placeholder="Search invoice, customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
            {search && (
              <button className={styles.clearSearch} onClick={() => setSearch('')} title="Clear">✕</button>
            )}
          </div>

          {/* Filter pills + sort — right side */}
          <div className={styles.toolbarRight}>
            <div className={styles.filters}>
              {FILTERS.map((f) => {
                const count = getCount(f);
                const isActive = filter === f;
                const colors = FILTER_COLORS[f];
                return (
                  <button
                    key={f}
                    className={`${styles.filterBtn} ${isActive ? styles.active : ''}`}
                    style={isActive ? { background: colors.bg, borderColor: colors.bg, color: colors.text } : {}}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                    {count > 0 && (
                      <span
                        className={styles.filterCount}
                        style={isActive ? { background: 'rgba(255,255,255,0.25)', color: colors.text } : {}}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sort dropdown — matches Customers page */}
            <select
              className={styles.sortSelect}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <CardBody noPad>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Invoice</th><th>Customer</th><th>Issued</th>
                  <th>Due</th><th>Status</th><th>Amount</th><th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className={styles.empty}>Loading…</td></tr>
                ) : displayed.length > 0 ? (
                  displayed.map((inv) => (
                    <tr key={inv._id} className={styles.row} onClick={() => setModal(inv)} title="Click to edit">
                      <td className={styles.idCell}>
                        <Highlight text={`#${inv.invoiceNumber}`} query={search} />
                      </td>
                      <td className={styles.name}>
                        <Highlight text={inv.customer?.name ?? '—'} query={search} />
                        {inv.customer?.company && (
                          <div className={styles.muted} style={{ marginTop: 1 }}>
                            <Highlight text={inv.customer.company} query={search} />
                          </div>
                        )}
                      </td>
                      <td className={styles.muted}>{fmtDate(inv.issueDate)}</td>
                      <td className={styles.muted}>{fmtDate(inv.dueDate)}</td>
                      <td>
                        <StatusDropdown invoice={inv} onStatusChange={handleStatusChange} />
                      </td>
                      <td className={styles.amount}>{fmt(inv.total)}</td>
                      <td className={styles.actions}>
                        <button
                          className={styles.viewBtn}
                          onClick={(e) => { e.stopPropagation(); setDrawer(inv); }}
                        >
                          👁 View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className={styles.empty}>
                      {search ? `No invoices match "${search}"` : 'No invoices found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {modalInvoice !== undefined && (
        <InvoiceModal
          invoice={modalInvoice}
          onClose={() => setModal(undefined)}
          onSaved={handleSaved}
        />
      )}

      {drawer && (
        <InvoiceDrawer
          invoice={drawer}
          initialMode="view"
          onClose={() => setDrawer(null)}
          onSaved={(updated) => {
            setDrawer(updated);
            handleSaved(updated, true);
          }}
        />
      )}

      {toast && <Toast message={`✓ ${toast}`} onDone={() => setToast(null)} />}
    </div>
  );
}