// src/pages/Dashboard.jsx
import { useState, useEffect, useRef } from 'react';
import styles from './Dashboard.module.css';
import { DownloadIcon } from '../components/Icons';
import { getDashboard } from '../api/dashboard';
import { getInvoices } from '../api/invoices';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount) {
  if (amount == null) return '₹0';
  const n = Number(amount);
  if (n >= 1_00_00_000) return '₹' + (n / 1_00_00_000).toFixed(1) + 'Cr';
  if (n >= 1_00_000)    return '₹' + (n / 1_00_000).toFixed(1) + 'L';
  return '₹' + n.toLocaleString('en-IN');
}

function fmtFull(amount) {
  if (amount == null) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ── Donut Chart ───────────────────────────────────────────────────────────────

function DonutChart({ segments, size = 140, stroke = 22 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2, cy = size / 2;

  let offset = 0;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      {total === 0 ? (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      ) : (
        segments.map((seg, i) => {
          const pct = seg.value / total;
          const dash = pct * circ;
          const gap  = circ - dash;
          const el = (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset * circ}
              strokeLinecap="butt"
            />
          );
          offset += pct;
          return el;
        })
      )}
    </svg>
  );
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────

function BarChart({ bars, height = 120 }) {
  const max = Math.max(...bars.map(b => b.value), 1);
  return (
    <div className={styles.barChart} style={{ height }}>
      {bars.map((b, i) => (
        <div key={i} className={styles.barCol}>
          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{
                height: `${(b.value / max) * 100}%`,
                background: b.color || 'var(--blue)',
                animationDelay: `${i * 60}ms`,
              }}
            />
          </div>
          <div className={styles.barLabel}>{b.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Spark Line ────────────────────────────────────────────────────────────────

function SparkLine({ points, color = 'var(--blue)', width = 80, height = 32 }) {
  if (!points || points.length < 2) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points);
  const range = max - min || 1;
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * w;
    const y = pad + h - ((p - min) / range) * h;
    return `${x},${y}`;
  });
  const d = `M${coords.join('L')}`;
  const area = `M${coords[0]}L${coords.join('L')}L${pad + w},${pad + h}L${pad},${pad + h}Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`sg-${color.replace(/[^a-z]/gi,'')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace(/[^a-z]/gi,'')})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  paid:      { color: 'var(--green)',  bg: 'var(--green-bg)'  },
  pending:   { color: 'var(--orange)', bg: 'var(--orange-bg)' },
  overdue:   { color: 'var(--red)',    bg: 'var(--red-bg)'    },
  draft:     { color: 'var(--text2)',  bg: 'var(--bg3)'       },
  sent:      { color: 'var(--blue)',   bg: 'var(--blue-dim)'  },
  cancelled: { color: 'var(--text3)',  bg: 'var(--bg3)'       },
};

function Badge({ status }) {
  const s = STATUS_COLORS[status?.toLowerCase()] || STATUS_COLORS.draft;
  return (
    <span style={{
      color: s.color, background: s.bg,
      padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
      letterSpacing: '0.3px',
    }}>
      {status}
    </span>
  );
}

// ── Coming Soon Toast ─────────────────────────────────────────────────────────

// (Coming Soon dropdown rendered inline in the header — see JSX below)

// ── Main Component ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data,           setData]           = useState(null);
  const [allInvoices,    setAllInvoices]    = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [showComingSoon, setShowComingSoon] = useState(false);

  useEffect(() => {
    Promise.all([getDashboard(), getInvoices()])
      .then(([dash, invoices]) => {
        setData(dash);
        setAllInvoices(Array.isArray(invoices) ? invoices : []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleExport = () => {
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 3000);
  };

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Loading…</p>
        </div>
      </div>
      <div className={styles.statGrid}>
        {[1,2,3,4].map(i => <div key={i} className={styles.skeletonCard} />)}
      </div>
      <div className={styles.chartGrid}>
        {[1,2].map(i => <div key={i} className={styles.skeletonCard} style={{ height: 240 }} />)}
      </div>
    </div>
  );

  if (error) return (
    <div className={styles.page}>
      <div className={styles.errorBanner}>⚠ {error}</div>
    </div>
  );

  const { stats, recentInvoices = [] } = data;

  // ── Derived analytics from allInvoices ──────────────────────────────────
  const statusCounts = allInvoices.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {});

  // Monthly revenue from paid invoices (last 6 months)
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key:   `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString('en-IN', { month: 'short' }),
      value: 0,
    };
  });
  allInvoices.forEach(inv => {
    if (inv.status !== 'paid' || !inv.updatedAt) return;
    const d = new Date(inv.updatedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const m = months.find(m => m.key === key);
    if (m) m.value += inv.total || 0;
  });

  // Overdue aging buckets
  const today = new Date();
  const aging = { '0–15d': 0, '16–30d': 0, '31–60d': 0, '60d+': 0 };
  allInvoices.filter(inv => inv.status === 'overdue').forEach(inv => {
    const days = Math.floor((today - new Date(inv.dueDate)) / 86400000);
    if      (days <= 15) aging['0–15d']++;
    else if (days <= 30) aging['16–30d']++;
    else if (days <= 60) aging['31–60d']++;
    else                 aging['60d+']++;
  });

  // Collection rate
  const collectionRate = stats.totalInvoices > 0
    ? Math.round((stats.paidCount / stats.totalInvoices) * 100)
    : 0;

  // Top customers by outstanding amount
  const customerMap = {};
  allInvoices.filter(inv => ['pending','overdue'].includes(inv.status)).forEach(inv => {
    const name = inv.customer?.name || 'Unknown';
    if (!customerMap[name]) customerMap[name] = 0;
    customerMap[name] += inv.total || 0;
  });
  const topCustomers = Object.entries(customerMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const donutSegments = [
    { value: stats.paidCount,    color: 'var(--green)'  },
    { value: stats.pendingCount, color: 'var(--orange)' },
    { value: stats.overdueCount, color: 'var(--red)'    },
    { value: statusCounts.draft || 0, color: 'var(--border2)' },
  ];

  const sparkPoints = months.map(m => m.value);

  const STATS = [
    {
      label: 'Total Revenue',
      value: fmt(stats.totalRevenue),
      full:  fmtFull(stats.totalRevenue),
      color: 'var(--blue)',
      sub:   `${stats.paidCount} paid invoices`,
      trend: 'up',
      spark: sparkPoints,
      sparkColor: 'var(--blue)',
    },
    {
      label: 'Outstanding',
      value: fmt(stats.outstanding),
      full:  fmtFull(stats.outstanding),
      color: 'var(--orange)',
      sub:   `${stats.pendingCount} pending`,
      trend: 'down',
      spark: null,
    },
    {
      label: 'Overdue',
      value: fmt(stats.overdueAmount),
      full:  fmtFull(stats.overdueAmount),
      color: 'var(--red)',
      sub:   `${stats.overdueCount} invoices at risk`,
      trend: 'down',
      spark: null,
    },
    {
      label: 'Collection Rate',
      value: `${collectionRate}%`,
      full:  `${stats.paidCount} of ${stats.totalInvoices} invoices`,
      color: collectionRate >= 70 ? 'var(--green)' : 'var(--orange)',
      sub:   `${stats.totalCustomers} customers`,
      trend: collectionRate >= 70 ? 'up' : 'down',
      spark: null,
    },
  ];

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Welcome back, Admin</p>
        </div>
        <div style={{ position: 'relative' }}>
          <button className={styles.btnBlue} onClick={handleExport}>
            <DownloadIcon /> Export Data
          </button>
          {showComingSoon && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 1000,
              background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '7px 12px',
              display: 'flex', alignItems: 'center', gap: 7,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              whiteSpace: 'nowrap',
              animation: 'fadeIn 0.2s ease',
            }}>
              <span style={{ fontSize: 13 }}>🚀</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Coming Soon</span>
            </div>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className={styles.statGrid}>
        {STATS.map((s, i) => (
          <div key={s.label} className={styles.statCard} style={{ animationDelay: `${i * 60}ms` }}>
            <div className={styles.statTop}>
              <span className={styles.statLabel}>
                <span className={styles.statDot} style={{ background: s.color }} />
                {s.label}
              </span>
              {s.spark && <SparkLine points={s.spark} color={s.sparkColor} />}
            </div>
            <div className={styles.statValue} title={s.full}>{s.value}</div>
            <div className={styles.statSub} style={{
              color: s.trend === 'up' ? 'var(--green)' : s.trend === 'down' ? 'var(--red)' : 'var(--text2)'
            }}>
              {s.trend === 'up' ? '↑' : s.trend === 'down' ? '↓' : ''} {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className={styles.chartGrid}>

        {/* Monthly Revenue Bar Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <div className={styles.chartTitle}>Monthly Revenue</div>
              <div className={styles.chartSub}>Last 6 months · paid invoices</div>
            </div>
            <div className={styles.chartBig}>{fmt(stats.totalRevenue)}</div>
          </div>
          <BarChart
            bars={months.map(m => ({ label: m.label, value: m.value, color: 'var(--blue)' }))}
            height={130}
          />
        </div>

        {/* Invoice Status Donut */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <div className={styles.chartTitle}>Invoice Breakdown</div>
              <div className={styles.chartSub}>{stats.totalInvoices} total invoices</div>
            </div>
          </div>
          <div className={styles.donutWrap}>
            <div className={styles.donutCenter}>
              <DonutChart segments={donutSegments} size={140} stroke={22} />
              <div className={styles.donutInner}>
                <div className={styles.donutNum}>{stats.totalInvoices}</div>
                <div className={styles.donutLabel}>total</div>
              </div>
            </div>
            <div className={styles.donutLegend}>
              {[
                { label: 'Paid',    count: stats.paidCount,    color: 'var(--green)'  },
                { label: 'Pending', count: stats.pendingCount, color: 'var(--orange)' },
                { label: 'Overdue', count: stats.overdueCount, color: 'var(--red)'    },
                { label: 'Draft',   count: statusCounts.draft || 0, color: 'var(--border2)' },
              ].map(l => (
                <div key={l.label} className={styles.legendRow}>
                  <span className={styles.legendDot} style={{ background: l.color }} />
                  <span className={styles.legendLabel}>{l.label}</span>
                  <span className={styles.legendCount}>{l.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Overdue Aging */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <div className={styles.chartTitle}>Overdue Aging</div>
              <div className={styles.chartSub}>Days past due date</div>
            </div>
            <div className={styles.chartBig} style={{ color: 'var(--red)' }}>{stats.overdueCount}</div>
          </div>
          <div className={styles.agingList}>
            {Object.entries(aging).map(([label, count]) => {
              const pct = stats.overdueCount > 0 ? (count / stats.overdueCount) * 100 : 0;
              return (
                <div key={label} className={styles.agingRow}>
                  <span className={styles.agingLabel}>{label}</span>
                  <div className={styles.agingBar}>
                    <div className={styles.agingFill} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={styles.agingCount}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Outstanding Customers */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <div className={styles.chartTitle}>Top Outstanding</div>
              <div className={styles.chartSub}>Customers with unpaid invoices</div>
            </div>
          </div>
          <div className={styles.topList}>
            {topCustomers.length === 0 ? (
              <div className={styles.emptyState}>🎉 All caught up!</div>
            ) : (
              topCustomers.map(([name, amount], i) => {
                const maxAmt = topCustomers[0][1];
                const pct = (amount / maxAmt) * 100;
                return (
                  <div key={name} className={styles.topRow}>
                    <div className={styles.topRank}>{i + 1}</div>
                    <div className={styles.topInfo}>
                      <div className={styles.topName}>{name}</div>
                      <div className={styles.topBar}>
                        <div className={styles.topBarFill} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className={styles.topAmount}>{fmt(amount)}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Recent Activity */}
      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <div>
            <div className={styles.chartTitle}>Recent Activity</div>
            <div className={styles.chartSub}>Latest 5 invoices</div>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.length > 0 ? recentInvoices.map(inv => (
                <tr key={inv._id}>
                  <td className={styles.idCell}>#{inv.invoiceNumber}</td>
                  <td>{inv.customer?.name ?? '—'}</td>
                  <td className={styles.muted}>{fmtDate(inv.dueDate)}</td>
                  <td><Badge status={inv.status} /></td>
                  <td className={styles.amount}>{fmtFull(inv.total)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className={styles.muted} style={{ textAlign: 'center', padding: '32px 0' }}>
                    No invoices yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}