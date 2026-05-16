// src/pages/Customers.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './Customers.module.css';
import { Card, CardBody } from '../components/Card';
import { PlusIcon, SearchIcon } from '../components/Icons';
import InvoiceDrawer from '../components/InvoiceDrawer';
import {
  getCustomers, createCustomer, updateCustomer, updateCustomerStatus,
} from '../api/customers';
import { getInvoices } from '../api/invoices';

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(amount) {
  if (amount == null || amount === 0) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(amount);
}

const STATUS_META = {
  active:   { label: 'Active',   color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
  pending:  { label: 'Pending',  color: '#f97316', bg: 'rgba(249,115,22,0.12)'  },
  inactive: { label: 'Inactive', color: '#cbd5e1', bg: 'rgba(203,213,225,0.12)' },
};

const FILTER_COLORS = {
  All:      { bg: 'var(--blue)',  text: '#fff' },
  Active:   { bg: '#22c55e',      text: '#fff' },
  Pending:  { bg: '#f97316',      text: '#fff' },
  Inactive: { bg: '#6b7280',      text: '#fff' },
};

const INV_BADGE = {
  paid:      { color: 'var(--green)',  bg: 'var(--green-bg)'       },
  pending:   { color: 'var(--orange)', bg: 'var(--orange-bg)'      },
  overdue:   { color: 'var(--red)',    bg: 'var(--red-bg)'         },
  draft:     { color: 'var(--text2)',  bg: 'rgba(107,114,128,0.1)' },
  sent:      { color: '#60a5fa',       bg: 'rgba(59,130,246,0.12)' },
  cancelled: { color: 'var(--text3)',  bg: 'rgba(74,86,106,0.15)'  },
};

// ── Country codes ──────────────────────────────────────────────────────────

const COUNTRY_CODES = [
  { code: '+91',  flag: '🇮🇳', name: 'India',          digits: 10 },
  { code: '+1',   flag: '🇺🇸', name: 'USA / Canada',   digits: 10 },
  { code: '+44',  flag: '🇬🇧', name: 'UK',             digits: 10 },
  { code: '+61',  flag: '🇦🇺', name: 'Australia',      digits: 9  },
  { code: '+971', flag: '🇦🇪', name: 'UAE',            digits: 9  },
  { code: '+65',  flag: '🇸🇬', name: 'Singapore',      digits: 8  },
  { code: '+60',  flag: '🇲🇾', name: 'Malaysia',       digits: 9  },
  { code: '+49',  flag: '🇩🇪', name: 'Germany',        digits: 10 },
  { code: '+33',  flag: '🇫🇷', name: 'France',         digits: 9  },
  { code: '+81',  flag: '🇯🇵', name: 'Japan',          digits: 10 },
  { code: '+86',  flag: '🇨🇳', name: 'China',          digits: 11 },
  { code: '+55',  flag: '🇧🇷', name: 'Brazil',         digits: 11 },
  { code: '+27',  flag: '🇿🇦', name: 'South Africa',   digits: 9  },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria',        digits: 10 },
  { code: '+92',  flag: '🇵🇰', name: 'Pakistan',       digits: 10 },
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh',     digits: 10 },
  { code: '+94',  flag: '🇱🇰', name: 'Sri Lanka',      digits: 9  },
  { code: '+977', flag: '🇳🇵', name: 'Nepal',          digits: 10 },
];

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function getStatus(c) { return c.status || 'active'; }

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

const FILTER_OPTIONS = ['All', 'Active', 'Pending', 'Inactive'];
const SORT_OPTIONS = [
  { value: 'newest',  label: 'Newest first'  },
  { value: 'oldest',  label: 'Oldest first'  },
  { value: 'name_az', label: 'Name A → Z'    },
  { value: 'name_za', label: 'Name Z → A'    },
  { value: 'billed',  label: 'Highest billed'},
];

function todayDate() { return new Date().toISOString().split('T')[0]; }
const EMPTY_LINE = () => ({ description: '', quantity: 1, unitPrice: '', total: 0 });
const EMPTY_FORM = {
  name: '', email: '', phoneCode: '+91', phone: '', company: '', address: '',
  inv_issueDate: todayDate(), inv_dueDate: '',
  inv_tax: '0', inv_notes: '', inv_lineItems: [EMPTY_LINE()],
};

// ── PhoneInput ─────────────────────────────────────────────────────────────

function PhoneInput({ codeValue, phoneValue, onCodeChange, onPhoneChange, touched }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = COUNTRY_CODES.find((c) => c.code === codeValue) || COUNTRY_CODES[0];

  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const digits = phoneValue.replace(/\D/g, '').length;
  const isValid = digits === selected.digits;
  const showError = touched && phoneValue.length > 0 && !isValid;

  return (
    <div className={styles.phoneWrap} ref={ref}>
      <div className={`${styles.phoneRow} ${showError ? styles.phoneRowError : ''}`}>
        <button
          type="button"
          className={styles.codeBtn}
          onClick={() => setOpen((o) => !o)}
        >
          <span>{selected.flag}</span>
          <span className={styles.codeText}>{selected.code}</span>
          <span className={styles.codeChevron}>▾</span>
        </button>
        <div className={styles.codeDivider} />
        <input
          type="tel"
          className={styles.phoneInput}
          placeholder={`${'0'.repeat(selected.digits)} (${selected.digits} digits)`}
          value={phoneValue}
          onChange={(e) => onPhoneChange(e.target.value.replace(/[^\d\s\-]/g, ''))}
          maxLength={selected.digits + 3}
        />
        {phoneValue.length > 0 && (
          <span className={`${styles.phoneCheck} ${isValid ? styles.phoneValid : styles.phoneInvalid}`}>
            {isValid ? '✓' : `${digits}/${selected.digits}`}
          </span>
        )}
      </div>
      {showError && (
        <span className={styles.fieldErr}>
          Must be {selected.digits} digits for {selected.name}
        </span>
      )}
      {open && (
        <div className={styles.codeMenu}>
          {COUNTRY_CODES.map((c) => (
            <button
              key={c.code}
              type="button"
              className={`${styles.codeOption} ${c.code === codeValue ? styles.codeOptionActive : ''}`}
              onClick={() => { onCodeChange(c.code); setOpen(false); }}
            >
              <span className={styles.codeFlag}>{c.flag}</span>
              <span className={styles.codeName}>{c.name}</span>
              <span className={styles.codeNum}>{c.code}</span>
              {c.code === codeValue && <span className={styles.codeCheck}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Status Cell ────────────────────────────────────────────────────────────

function StatusCell({ customer, onChange }) {
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);
  const current = getStatus(customer);
  const meta = STATUS_META[current];

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  async function pick(val) {
    if (val === current) { setOpen(false); return; }
    setSaving(true); setOpen(false);
    try { const updated = await updateCustomerStatus(customer._id, val); onChange(updated); }
    finally { setSaving(false); }
  }

  return (
    <div className={styles.statusCell} ref={ref}>
      <button className={styles.statusBadge}
        style={{ color: meta.color, background: meta.bg }}
        onClick={() => setOpen((v) => !v)} disabled={saving}>
        <span className={styles.dot} style={{ background: meta.color }} />
        {saving ? '…' : meta.label}
        <span className={styles.caret}>▾</span>
      </button>
      {open && (
        <div className={styles.dropdown}>
          {Object.entries(STATUS_META).map(([val, m]) => (
            <button key={val}
              className={`${styles.dropItem} ${val === current ? styles.dropItemActive : ''}`}
              onClick={() => pick(val)}>
              <span className={styles.dot} style={{ background: m.color }} />
              {m.label}
              {val === current && <span className={styles.checkmark}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Customer Form Modal ────────────────────────────────────────────────────

function CustomerModal({ customer, onClose, onSaved }) {
  const isEdit = !!customer;

  const [activeTab, setActiveTab] = useState('details');
  const [drawerInvoice, setDrawerInvoice] = useState(null);
  const [drawerMode,    setDrawerMode]    = useState('view');
  const [invoices,   setInvoices]   = useState([]);
  const [invLoading, setInvLoading] = useState(false);

  // Parse existing phone into code + number for edit mode
  function parsePhone(raw) {
    if (!raw) return { code: '+91', number: '' };
    const match = COUNTRY_CODES.find((c) => raw.startsWith(c.code));
    if (match) return { code: match.code, number: raw.slice(match.code.length).trim() };
    return { code: '+91', number: raw };
  }

  const parsedPhone = isEdit ? parsePhone(customer.phone) : { code: '+91', number: '' };

  const [form, setForm] = useState(isEdit ? {
    name:      customer.name    || '',
    email:     customer.email   || '',
    phoneCode: parsedPhone.code,
    phone:     parsedPhone.number,
    company:   customer.company || '',
    address:   customer.address || '',
    inv_issueDate: todayDate(), inv_dueDate: '',
    inv_tax: '0', inv_notes: '', inv_lineItems: [EMPTY_LINE()],
  } : { ...EMPTY_FORM, inv_lineItems: [EMPTY_LINE()] });

  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (!isEdit) return;
    setInvLoading(true);
    getInvoices({})
      .then((all) => setInvoices(all.filter((i) => {
        const cid = typeof i.customer === 'object' ? i.customer?._id : i.customer;
        return cid === customer._id;
      })))
      .catch(() => {})
      .finally(() => setInvLoading(false));
  }, [isEdit, customer?._id]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setTouched((p) => ({ ...p, [name]: true }));
    if (error) setError(null);
  }

  function setLine(idx, field, raw) {
    setForm((f) => {
      const items = f.inv_lineItems.map((l, i) => {
        if (i !== idx) return l;
        const updated = { ...l, [field]: raw };
        const qty   = parseFloat(field === 'quantity'  ? raw : updated.quantity)  || 0;
        const price = parseFloat(field === 'unitPrice' ? raw : updated.unitPrice) || 0;
        updated.total = parseFloat((qty * price).toFixed(2));
        return updated;
      });
      return { ...f, inv_lineItems: items };
    });
  }
  function addLine()       { setForm((f) => ({ ...f, inv_lineItems: [...f.inv_lineItems, EMPTY_LINE()] })); }
  function removeLine(idx) { setForm((f) => ({ ...f, inv_lineItems: f.inv_lineItems.filter((_, i) => i !== idx) })); }

  const subtotal = form.inv_lineItems.reduce((s, l) => s + (l.total || 0), 0);
  const taxAmt   = parseFloat(((subtotal * (parseFloat(form.inv_tax) || 0)) / 100).toFixed(2));
  const invTotal = parseFloat((subtotal + taxAmt).toFixed(2));

  function getPhoneDigits() {
    return form.phone.replace(/\D/g, '').length;
  }
  function getExpectedDigits() {
    return COUNTRY_CODES.find((c) => c.code === form.phoneCode)?.digits ?? 10;
  }
  function isPhoneValid() {
    if (!form.phone) return true; // phone is optional
    return getPhoneDigits() === getExpectedDigits();
  }

  function validate() {
    if (!form.name.trim())  return 'Full name is required.';
    if (!form.email.trim()) return 'Email address is required.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return 'Enter a valid email address.';
    if (form.phone && !isPhoneValid()) {
      const cc = COUNTRY_CODES.find((c) => c.code === form.phoneCode);
      return `Phone number must be ${cc?.digits ?? 10} digits for ${cc?.name ?? 'selected country'}.`;
    }
    if (!isEdit) {
      if (!form.inv_dueDate) return 'Invoice due date is required.';
      if (!form.inv_lineItems.length) return 'Add at least one line item.';
      if (form.inv_lineItems.some((l) => !l.description.trim())) return 'All line items need a description.';
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true); setError(null);
    try {
      // Combine code + number into full phone string
      const fullPhone = form.phone ? `${form.phoneCode} ${form.phone}` : '';
      const cp = {
        name: form.name, email: form.email,
        phone: fullPhone,
        company: form.company, address: form.address,
      };
      const ip = !isEdit ? {
        issueDate: form.inv_issueDate, dueDate: form.inv_dueDate,
        tax: parseFloat(form.inv_tax) || 0, notes: form.inv_notes,
        lineItems: form.inv_lineItems.map((l) => ({
          description: l.description,
          quantity:    parseFloat(l.quantity)  || 1,
          unitPrice:   parseFloat(l.unitPrice) || 0,
          total:       l.total,
        })),
      } : null;
      const saved = isEdit
        ? await updateCustomer(customer._id, cp)
        : await createCustomer({ ...cp, invoice: ip });
      onSaved(saved, isEdit);
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  function handleInvoiceSaved(updated) {
    setInvoices((prev) => prev.map((i) => i._id === updated._id ? updated : i));
    setDrawerInvoice(updated);
  }

  function openInvoiceView(inv) {
    setActiveTab(inv._id);
    setDrawerInvoice(inv);
    setDrawerMode('view');
  }

  function openInvoiceEdit(e, inv) {
    e.preventDefault();
    setActiveTab(inv._id);
    setDrawerInvoice(inv);
    setDrawerMode('edit');
  }

  function closeDrawer() {
    setDrawerInvoice(null);
    setDrawerMode('view');
  }

  const nameErr  = touched.name  && !form.name.trim();
  const emailErr = touched.email && !/^\S+@\S+\.\S+$/.test(form.email);

  const tabs = [
    { id: 'details', label: 'Customer Details' },
    ...(isEdit ? invoices.map((inv) => ({
      id: inv._id, label: `#${inv.invoiceNumber}`, badge: inv.status,
    })) : []),
  ];

  return (
    <>
      <div className={styles.fullscreenOverlay}
        onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className={styles.fullscreenModal}>

          {/* Header */}
          <div className={styles.fsHeader}>
            <div>
              <h2 className={styles.fsTitle}>
                {isEdit ? `Edit — ${customer.name}` : 'New Customer & Invoice'}
              </h2>
              <p className={styles.fsSub}>
                {isEdit
                  ? `${invoices.length} invoice${invoices.length !== 1 ? 's' : ''} · click a tab to view · double-click to edit`
                  : 'Customer info + linked invoice created together'}
              </p>
            </div>
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>

          {/* Tabs (edit mode only) */}
          {isEdit && (
            <div className={styles.modalTabs}>
              {tabs.map((t) => {
                const badge = t.badge ? INV_BADGE[t.badge] : null;
                const isInvTab = t.id !== 'details';
                const isActiveTab = activeTab === t.id;
                return (
                  <button key={t.id}
                    className={`${styles.modalTab} ${isActiveTab ? styles.modalTabActive : ''}`}
                    onClick={() => {
                      if (!isInvTab) {
                        setActiveTab('details');
                        setDrawerInvoice(null);
                        setDrawerMode('view');
                      } else {
                        const inv = invoices.find((i) => i._id === t.id);
                        if (inv) openInvoiceView(inv);
                      }
                    }}>
                    {t.label}
                    {badge && (
                      <span className={styles.tabBadge}
                        style={{ color: badge.color, background: badge.bg }}>
                        {cap(t.badge)}
                      </span>
                    )}
                    {isActiveTab && isInvTab && drawerInvoice && drawerMode === 'edit' && (
                      <span className={styles.tabEditHint}>✎</span>
                    )}
                  </button>
                );
              })}
              {invLoading && <span className={styles.invLoadingMsg}>Loading invoices…</span>}
            </div>
          )}

          {error && <div className={styles.errorInModal}>⚠ {error}</div>}

          {/* ── Customer Details tab ── */}
          {activeTab === 'details' && (
            <form onSubmit={handleSubmit} className={styles.fsBody} noValidate>
              <div className={styles.fsCols}>

                {/* LEFT — customer fields */}
                <div className={styles.fsCol}>
                  <div className={styles.sectionDivider}><span>Customer Details</span></div>

                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Full Name <span className={styles.req}>*</span></label>
                      <input name="name" value={form.name} onChange={handleChange} autoFocus
                        placeholder="Priya Mehta"
                        className={`${styles.input} ${nameErr ? styles.inputErr : ''}`} />
                      {nameErr && <span className={styles.fieldErr}>Name is required</span>}
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Email Address <span className={styles.req}>*</span></label>
                      <input name="email" type="email" value={form.email} onChange={handleChange}
                        placeholder="priya@company.com"
                        className={`${styles.input} ${emailErr ? styles.inputErr : ''}`} />
                      {emailErr && <span className={styles.fieldErr}>Enter a valid email</span>}
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Phone Number</label>
                      <PhoneInput
                        codeValue={form.phoneCode}
                        phoneValue={form.phone}
                        onCodeChange={(code) => setForm((f) => ({ ...f, phoneCode: code }))}
                        onPhoneChange={(val) => {
                          setForm((f) => ({ ...f, phone: val }));
                          setTouched((t) => ({ ...t, phone: true }));
                        }}
                        touched={touched.phone}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Company</label>
                      <input name="company" value={form.company} onChange={handleChange}
                        placeholder="TechVista Pvt Ltd" className={styles.input} />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Address</label>
                    <input name="address" value={form.address} onChange={handleChange}
                      placeholder="Koramangala, Bengaluru" className={styles.input} />
                  </div>
                </div>

                {/* RIGHT — invoice (create only) */}
                {!isEdit && (
                  <div className={styles.fsCol}>
                    <div className={styles.sectionDivider}><span>Invoice Details</span></div>

                    <div className={styles.formRow}>
                      <div className={styles.field}>
                        <label className={styles.label}>Issue Date</label>
                        <input type="date" name="inv_issueDate" value={form.inv_issueDate}
                          onChange={handleChange} className={styles.input} />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Due Date <span className={styles.req}>*</span></label>
                        <input type="date" name="inv_dueDate" value={form.inv_dueDate}
                          onChange={handleChange} className={styles.input}
                          placeholder="Select due date" />
                      </div>
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Line Items <span className={styles.req}>*</span></label>
                      <div className={styles.lineItems}>
                        <div className={styles.lineHeaderRow}>
                          <span>Description</span>
                          <span style={{ textAlign: 'center' }}>Qty</span>
                          <span>Unit Price (₹)</span>
                          <span style={{ textAlign: 'right' }}>Total</span>
                          <span />
                        </div>
                        {form.inv_lineItems.map((line, idx) => (
                          <div key={idx} className={styles.lineRow}>
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
                              disabled={form.inv_lineItems.length === 1} title="Remove">✕</button>
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
                        <span>Tax&nbsp;
                          <input className={styles.taxInput} type="number" min="0" max="100" step="0.5"
                            name="inv_tax" value={form.inv_tax} onChange={handleChange} />%
                        </span>
                        <span>₹{taxAmt.toLocaleString('en-IN')}</span>
                      </div>
                      <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                        <span>Total</span><span>₹{invTotal.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Notes</label>
                      <textarea name="inv_notes" value={form.inv_notes} onChange={handleChange}
                        rows={3} placeholder="Payment terms, bank details…" className={styles.textarea} />
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.fsFooter}>
                <button type="button" className={styles.btnGhost} onClick={onClose}>Cancel</button>
                <button type="submit" className={styles.btnBlue} disabled={saving}>
                  {saving
                    ? <><span className={styles.spinner} /> Saving…</>
                    : isEdit ? 'Save Customer' : '+ Add Customer & Invoice'}
                </button>
              </div>
            </form>
          )}

          {/* ── Invoice tab ── */}
          {activeTab !== 'details' && (
            <div className={styles.invTabBody}>
              <div className={styles.invTabList}>
                {invoices.map((inv) => {
                  const badge = INV_BADGE[inv.status] || INV_BADGE.draft;
                  const isActive = drawerInvoice?._id === inv._id;
                  return (
                    <div key={inv._id}
                      className={`${styles.invTabRow} ${isActive ? styles.invTabRowActive : ''}`}
                      onClick={() => openInvoiceView(inv)}
                      onDoubleClick={(e) => openInvoiceEdit(e, inv)}
                      title="Click to view · Double-click to edit">
                      <span className={styles.invTabNum}>#{inv.invoiceNumber}</span>
                      <span className={styles.invTabBadge}
                        style={{ color: badge.color, background: badge.bg }}>
                        {cap(inv.status)}
                      </span>
                      <span className={styles.invTabTotal}>
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(inv.total || 0)}
                      </span>
                      <span className={styles.invTabHint}>
                        {isActive && drawerMode === 'edit'
                          ? '✎ editing'
                          : isActive
                          ? '▸ viewing'
                          : 'click · dbl-click to edit'}
                      </span>
                    </div>
                  );
                })}
                {invoices.length === 0 && !invLoading && (
                  <div className={styles.invEmpty}>No invoices found for this customer.</div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {drawerInvoice && (
        <InvoiceDrawer
          invoice={drawerInvoice}
          initialMode={drawerMode}
          onClose={closeDrawer}
          onSaved={handleInvoiceSaved}
        />
      )}
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function Customers({ onView }) {
  const [customers, setCustomers] = useState([]);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('All');
  const [sort,      setSort]      = useState('newest');
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [modal,     setModal]     = useState(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    getCustomers()
      .then(setCustomers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const processed = customers
    .filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.name?.toLowerCase().includes(q)    ||
        c.email?.toLowerCase().includes(q)   ||
        c.company?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
      );
    })
    .filter((c) => filter === 'All' ? true : getStatus(c) === filter.toLowerCase())
    .sort((a, b) => {
      if (sort === 'newest')  return new Date(b.createdAt) - new Date(a.createdAt);
      if (sort === 'oldest')  return new Date(a.createdAt) - new Date(b.createdAt);
      if (sort === 'name_az') return a.name.localeCompare(b.name);
      if (sort === 'name_za') return b.name.localeCompare(a.name);
      if (sort === 'billed')  return (b.totalPaid || 0) - (a.totalPaid || 0);
      return 0;
    });

  function getCount(f) {
    if (f === 'All') return customers.length;
    return customers.filter((c) => getStatus(c) === f.toLowerCase()).length;
  }

  function handleSaved(saved, isEdit) {
    if (isEdit) setCustomers((prev) => prev.map((c) => (c._id === saved._id ? saved : c)));
    else        setCustomers((prev) => [saved, ...prev]);
  }

  function handleStatusChange(updated) {
    setCustomers((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
  }

  return (
    <div className={styles.page}>

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Customers</h1>
          <p className={styles.pageSubtitle}>
            {loading
              ? 'Loading…'
              : `${processed.length} of ${customers.length} customer${customers.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button className={styles.btnBlue} onClick={() => setModal('add')}>
          <PlusIcon /> Add Customer
        </button>
      </div>

      {error && <div className={styles.errorBanner}>⚠ {error}</div>}

      <Card>
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}><SearchIcon /></span>
            <input type="text" placeholder="Search name, email, company…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput} />
            {search && (
              <button className={styles.clearSearch} onClick={() => setSearch('')} title="Clear">✕</button>
            )}
          </div>

          <div className={styles.toolbarRight}>
            <div className={styles.pills}>
              {FILTER_OPTIONS.map((f) => {
                const count = getCount(f);
                const isActive = filter === f;
                const colors = FILTER_COLORS[f];
                return (
                  <button
                    key={f}
                    className={`${styles.pill} ${isActive ? styles.pillActive : ''}`}
                    style={isActive ? { background: colors.bg, borderColor: colors.bg, color: colors.text } : {}}
                    onClick={() => setFilter(f)}
                  >
                    {!isActive && f !== 'All' && (
                      <span className={styles.pillDot}
                        style={{ background: STATUS_META[f.toLowerCase()]?.color }} />
                    )}
                    {f}
                    {count > 0 && (
                      <span
                        className={styles.pillCount}
                        style={isActive
                          ? { background: 'rgba(255,255,255,0.25)', color: colors.text }
                          : {}}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <select className={styles.sortSelect} value={sort}
              onChange={(e) => setSort(e.target.value)}>
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
                  <th>Name</th><th>Email</th><th>Phone</th>
                  <th>Company</th><th>Status</th><th>Total Billed</th><th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1,2,3,4,5].map((i) => (
                    <tr key={i}>
                      {[1,2,3,4,5,6,7].map((j) => (
                        <td key={j}><div className={styles.skeleton} /></td>
                      ))}
                    </tr>
                  ))
                ) : processed.length > 0 ? (
                  processed.map((c) => (
                    <tr key={c._id} className={styles.row}>
                      <td className={styles.name}><Highlight text={c.name} query={search} /></td>
                      <td className={styles.muted}><Highlight text={c.email} query={search} /></td>
                      <td className={styles.muted}>{c.phone || '—'}</td>
                      <td className={styles.muted}>
                        <Highlight text={c.company || ''} query={search} />
                        {!c.company && '—'}
                      </td>
                      <td><StatusCell customer={c} onChange={handleStatusChange} /></td>
                      <td className={styles.amount}>{fmt(c.totalPaid)}</td>
                      <td className={styles.actions}>
                        <button className={styles.viewBtn} onClick={() => onView?.(c._id)}>
                          👁 View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className={styles.empty}>
                      {search ? `No customers match "${search}"` : 'No customers found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {modal && (
        <CustomerModal
          customer={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}