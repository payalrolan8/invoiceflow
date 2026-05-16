// src/pages/CustomerDetail.jsx
import { useState, useEffect, useRef } from 'react';
import styles from './CustomerDetail.module.css';
import InvoiceDrawer from '../components/InvoiceDrawer';
import { getCustomers } from '../api/customers';
import { getInvoices } from '../api/invoices';

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

// ── Main Page ──────────────────────────────────────────────────────────────

export default function CustomerDetail({ customerId, onBack }) {
  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [filter,   setFilter]   = useState('all');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // Drawer state
  const [drawerInvoice, setDrawerInvoice] = useState(null);
  const [drawerMode,    setDrawerMode]    = useState('view');

  // double-click timer
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

  // Single click → open drawer in view mode
  function handleRowClick(inv) {
    if (clickTimer.current) return;
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      setDrawerInvoice(inv);
      setDrawerMode('view');
    }, 200);
  }

  // Double click → open drawer in edit mode
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

  const filtered = filter === 'all' ? invoices : invoices.filter((i) => i.status === filter);

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
            <span className={styles.statusBadge} style={{ color: statusMeta.color, background: statusMeta.bg }}>
              <span className={styles.dot} style={{ background: statusMeta.color }} />
              {statusMeta.label}
            </span>
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
              {/* Table header */}
              <div className={styles.invoiceTableHead}>
                <span>Invoice #</span>
                <span>Issued</span>
                <span>Due</span>
                <span>Status</span>
                <span style={{ textAlign: 'right' }}>Amount</span>
                <span />
              </div>

              {/* Table rows */}
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* Invoice Drawer */}
      {drawerInvoice && (
        <InvoiceDrawer
          invoice={drawerInvoice}
          initialMode={drawerMode}
          onClose={closeDrawer}
          onSaved={handleInvoiceUpdated}
        />
      )}
    </>
  );
}