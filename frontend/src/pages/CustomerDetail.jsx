// src/pages/CustomerDetail.jsx
import { useState, useEffect, useRef } from 'react';
import styles from './CustomerDetail.module.css';
import InvoiceDrawer from '../components/InvoiceDrawer';
import { getCustomers, updateCustomer, deleteCustomer } from '../api/customers';
import { getInvoices, deleteInvoice } from '../api/invoices';

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(amount) {
  if (amount == null || amount === 0) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(amount);
}

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

const STATUS_META = {
  active:   { label: 'Active',   color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
  pending:  { label: 'Pending',  color: '#f97316', bg: 'rgba(249,115,22,0.12)'  },
  inactive: { label: 'Inactive', color: '#cbd5e1', bg: 'rgba(203,213,225,0.12)' },
};

const INV_BADGE = {
  paid:      { color: '#10B981', bg: 'rgba(16,185,129,0.12)'      },
  pending:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'      },
  overdue:   { color: '#EF4444', bg: 'rgba(239,68,68,0.12)'       },
  draft:     { color: 'var(--text2)', bg: 'rgba(107,114,128,0.1)' },
  sent:      { color: '#60a5fa', bg: 'rgba(59,130,246,0.12)'      },
  cancelled: { color: 'var(--text3)', bg: 'rgba(74,86,106,0.15)'  },
};

const FILTERS = ['all', 'draft', 'sent', 'pending', 'paid', 'overdue', 'cancelled'];

// ── Edit Customer Modal ────────────────────────────────────────────────────

function EditCustomerModal({ customer, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:    customer.name    || '',
    email:   customer.email   || '',
    phone:   customer.phone   || '',
    company: customer.company || '',
    address: customer.address || '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateCustomer(customer._id, form);
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className={styles.modalBackdrop} onClick={handleBackdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>Edit Customer</div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {error && <div className={styles.modalError}>⚠ {error}</div>}

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Name *</label>
              <input className={styles.fieldInput} name="name" value={form.name}
                onChange={handleChange} placeholder="Full name" autoFocus />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Company</label>
              <input className={styles.fieldInput} name="company" value={form.company}
                onChange={handleChange} placeholder="Company name" />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Email</label>
              <input className={styles.fieldInput} name="email" type="email" value={form.email}
                onChange={handleChange} placeholder="email@example.com" />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Phone</label>
              <input className={styles.fieldInput} name="phone" value={form.phone}
                onChange={handleChange} placeholder="+91 98765 43210" />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Address</label>
            <textarea className={`${styles.fieldInput} ${styles.fieldTextarea}`}
              name="address" value={form.address} onChange={handleChange}
              placeholder="Street, City, PIN" rows={3} />
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? <><span className={styles.spinnerSm} /> Saving…</> : '✓ Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Customer Confirm Modal ──────────────────────────────────────────

function DeleteConfirmModal({ customer, invoiceCount, onClose, onConfirm, deleting }) {
  function handleBackdrop(e) {
    if (e.target === e.currentTarget && !deleting) onClose();
  }

  return (
    <div className={styles.modalBackdrop} onClick={handleBackdrop}>
      <div className={`${styles.modal} ${styles.deleteModal}`}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>Delete Customer</div>
          <button className={styles.modalClose} onClick={onClose} disabled={deleting} aria-label="Close">✕</button>
        </div>

        <div className={styles.deleteBody}>
          <div className={styles.deleteIcon}>🗑</div>
          <p className={styles.deleteHeading}>
            Delete <strong>{customer.name}</strong>?
          </p>
          <p className={styles.deleteSubtext}>
            This will permanently delete the customer
            {invoiceCount > 0
              ? <> and their <strong>{invoiceCount} invoice{invoiceCount !== 1 ? 's' : ''}</strong>.</>
              : '.'
            }
            {' '}This action <strong>cannot be undone</strong>.
          </p>
        </div>

        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button className={styles.deleteBtnConfirm} onClick={onConfirm} disabled={deleting}>
            {deleting
              ? <><span className={styles.spinnerSm} /> Deleting…</>
              : '🗑 Delete Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Invoice Confirm Modal ───────────────────────────────────────────

function DeleteInvoiceModal({ invoice, onClose, onConfirm, deleting }) {
  function handleBackdrop(e) {
    if (e.target === e.currentTarget && !deleting) onClose();
  }

  return (
    <div className={styles.modalBackdrop} onClick={handleBackdrop}>
      <div className={`${styles.modal} ${styles.deleteModal}`}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>Delete Invoice</div>
          <button className={styles.modalClose} onClick={onClose} disabled={deleting} aria-label="Close">✕</button>
        </div>

        <div className={styles.deleteBody}>
          <div className={styles.deleteIcon}>🗑</div>
          <p className={styles.deleteHeading}>
            Delete <strong>#{invoice.invoiceNumber}</strong>?
          </p>
          <p className={styles.deleteSubtext}>
            This will permanently delete this invoice.
            {' '}This action <strong>cannot be undone</strong>.
          </p>
        </div>

        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button className={styles.deleteBtnConfirm} onClick={onConfirm} disabled={deleting}>
            {deleting
              ? <><span className={styles.spinnerSm} /> Deleting…</>
              : '🗑 Delete Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function CustomerDetail({ customerId, onBack }) {
  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [filter,   setFilter]   = useState('all');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const [editOpen,   setEditOpen]   = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  const [deleteInvoiceTarget,  setDeleteInvoiceTarget]  = useState(null);
  const [deletingInvoice,      setDeletingInvoice]      = useState(false);

  const [drawerInvoice, setDrawerInvoice] = useState(null);
  const [drawerMode,    setDrawerMode]    = useState('view');

  const clickTimer = useRef(null);

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    Promise.all([getCustomers(), getInvoices({})])
      .then(([customers, allInvoices]) => {
        const found = customers.find((c) => c._id === customerId);
        if (!found) throw new Error('Customer not found');
        setCustomer(found);
        setInvoices(
          allInvoices
            .filter((inv) => {
              const cid = typeof inv.customer === 'object' ? inv.customer?._id : inv.customer;
              return cid === customerId;
            })
            .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate))
        );
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [customerId]);

  function handleInvoiceUpdated(updated) {
    setInvoices((prev) => prev.map((i) => i._id === updated._id ? updated : i));
    setDrawerInvoice(updated);
  }

  function handleCustomerSaved(updated) {
    setCustomer((prev) => ({ ...prev, ...updated }));
  }

  async function handleDeleteConfirm() {
    setDeleting(true);
    try {
      await deleteCustomer(customer._id);
      setDeleteOpen(false);
      onBack();
    } catch (err) {
      setDeleting(false);
      setDeleteOpen(false);
      setError(err.message || 'Failed to delete customer.');
    }
  }

  async function handleDeleteInvoiceConfirm() {
    if (!deleteInvoiceTarget) return;
    setDeletingInvoice(true);
    try {
      await deleteInvoice(deleteInvoiceTarget._id);
      setInvoices((prev) => prev.filter((i) => i._id !== deleteInvoiceTarget._id));
      if (drawerInvoice?._id === deleteInvoiceTarget._id) {
        setDrawerInvoice(null);
        setDrawerMode('view');
      }
      setDeleteInvoiceTarget(null);
    } catch (err) {
      setError(err.message || 'Failed to delete invoice.');
      setDeleteInvoiceTarget(null);
    } finally {
      setDeletingInvoice(false);
    }
  }

  function handleRowClick(inv) {
    if (clickTimer.current) return;
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      setDrawerInvoice(inv);
      setDrawerMode('view');
    }, 200);
  }

  function handleRowDoubleClick(e, inv) {
    e.preventDefault();
    clearTimeout(clickTimer.current);
    clickTimer.current = null;
    setDrawerInvoice(inv);
    setDrawerMode('edit');
  }

  function closeDrawer() {
    setDrawerInvoice(null);
    setDrawerMode('view');
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}><span className={styles.spinner} /> Loading customer…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBanner}>⚠ {error}</div>
      </div>
    );
  }

  if (!customer) return null;

  const statusMeta  = STATUS_META[customer.status || 'active'];
  const totalPaid   = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
  const outstanding = invoices.filter((i) => ['pending', 'sent'].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0);
  const overdueCnt  = invoices.filter((i) => i.status === 'overdue').length;
  const lastInvoice = invoices[0] ?? null;
  const filtered    = filter === 'all' ? invoices : invoices.filter((i) => i.status === filter);

  return (
    <>
      <div className={styles.page}>

        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={onBack}>← Back to Customers</button>
          <span className={styles.breadcrumb}>Customers / <span>{customer.name}</span></span>
        </div>

        <div className={styles.content}>

          {/* Hero */}
          <div className={styles.hero}>
            <div className={styles.avatar}>{initials(customer.name)}</div>
            <div className={styles.heroInfo}>
              <div className={styles.heroName}>{customer.name}</div>
              <div className={styles.heroSub}>
                {[customer.company, customer.email, customer.phone].filter(Boolean).join('  ·  ')}
              </div>
            </div>
            <div className={styles.heroRight}>
              <span className={styles.statusBadge} style={{ color: statusMeta.color, background: statusMeta.bg }}>
                <span className={styles.dot} style={{ background: statusMeta.color }} />
                {statusMeta.label}
              </span>
              <button className={styles.editCustomerBtn} onClick={() => setEditOpen(true)}>
                ✎ Edit
              </button>
              <button className={styles.deleteCustomerBtn} onClick={() => setDeleteOpen(true)}>
                🗑 Delete
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total Invoices</div>
              <div className={styles.statValue}>{invoices.length}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total Paid</div>
              <div className={`${styles.statValue} ${styles.green}`}>{fmt(totalPaid)}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Outstanding</div>
              <div className={`${styles.statValue} ${outstanding > 0 ? styles.orange : ''}`}>{fmt(outstanding)}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Overdue</div>
              <div className={`${styles.statValue} ${overdueCnt > 0 ? styles.red : ''}`}>
                {overdueCnt > 0 ? `${overdueCnt} invoice${overdueCnt > 1 ? 's' : ''}` : '—'}
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>Email</div>
              <div className={styles.infoValue}>{customer.email || '—'}</div>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>Phone</div>
              <div className={styles.infoValue}>{customer.phone || '—'}</div>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>Company</div>
              <div className={styles.infoValue}>{customer.company || '—'}</div>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>Address</div>
              <div className={styles.infoValue}>{customer.address || '—'}</div>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>Member Since</div>
              <div className={styles.infoValue}>{fmtDate(customer.createdAt)}</div>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>Last Invoice</div>
              <div className={styles.infoValue}>{lastInvoice ? fmtDate(lastInvoice.issueDate) : '—'}</div>
            </div>
          </div>

          {/* Invoices section */}
          <div className={styles.invoicesHeader}>
            <div className={styles.sectionTitle}>
              Invoices <span className={styles.sectionCount}>{invoices.length}</span>
            </div>
            <div className={styles.filters}>
              {FILTERS.map((f) => (
                <button
                  key={f}
                  className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {cap(f) || 'All'}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className={styles.empty}>
              {filter === 'all' ? 'No invoices found for this customer.' : `No ${filter} invoices.`}
            </div>
          ) : (
            <div className={styles.invoiceTable}>
              <div className={styles.invoiceTableHead}>
                <span>Invoice #</span>
                <span>Issued</span>
                <span>Due</span>
                <span>Status</span>
                <span style={{ textAlign: 'right' }}>Amount</span>
                <span />
              </div>

              {filtered.map((inv) => {
                const badge    = INV_BADGE[inv.status] || INV_BADGE.draft;
                const isActive = drawerInvoice?._id === inv._id;
                return (
                  <div
                    key={inv._id}
                    className={`${styles.invoiceRow} ${isActive ? styles.invoiceRowActive : ''}`}
                    onClick={() => handleRowClick(inv)}
                    onDoubleClick={(e) => handleRowDoubleClick(e, inv)}
                    title="Click to view · Double-click to edit"
                  >
                    <span className={styles.invNum}>#{inv.invoiceNumber}</span>
                    <span className={styles.invDate}>{fmtDate(inv.issueDate)}</span>
                    <span className={styles.invDate}>{fmtDate(inv.dueDate)}</span>
                    <span className={styles.invBadge} style={{ color: badge.color, background: badge.bg }}>
                      {cap(inv.status)}
                    </span>
                    <span className={styles.invAmount}>{fmt(inv.total)}</span>
                    <div className={styles.invActions}>
                      <button
                        className={styles.viewBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDrawerInvoice(inv);
                          setDrawerMode('view');
                        }}
                      >
                        👁 View
                      </button>
                      <button
                        className={styles.invDeleteBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteInvoiceTarget(inv);
                        }}
                        title="Delete invoice"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* Edit Customer Modal */}
      {editOpen && (
        <EditCustomerModal
          customer={customer}
          onClose={() => setEditOpen(false)}
          onSaved={handleCustomerSaved}
        />
      )}

      {/* Delete Customer Modal */}
      {deleteOpen && (
        <DeleteConfirmModal
          customer={customer}
          invoiceCount={invoices.length}
          onClose={() => setDeleteOpen(false)}
          onConfirm={handleDeleteConfirm}
          deleting={deleting}
        />
      )}

      {/* Delete Invoice Modal */}
      {deleteInvoiceTarget && (
        <DeleteInvoiceModal
          invoice={deleteInvoiceTarget}
          onClose={() => setDeleteInvoiceTarget(null)}
          onConfirm={handleDeleteInvoiceConfirm}
          deleting={deletingInvoice}
        />
      )}

      {/* Invoice Drawer */}
      {drawerInvoice && (
        <InvoiceDrawer
          invoice={drawerInvoice}
          initialMode={drawerMode}
          onClose={closeDrawer}
          onSaved={handleInvoiceUpdated}
          onDelete={(inv) => setDeleteInvoiceTarget(inv)}
        />
      )}
    </>
  );
}