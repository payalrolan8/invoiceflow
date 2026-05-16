// src/components/Sidebar.jsx
import { useEffect, useState, useRef } from 'react';
import styles from './Sidebar.module.css';
import {
  DashboardIcon,
  CustomersIcon,
  InvoicesIcon,
  BellIcon,
  SettingsIcon,
} from './Icons';
import { getInvoiceStats, getInvoices } from '../api/invoices';

const ICON_MAP = { DashboardIcon, CustomersIcon, InvoicesIcon, BellIcon, SettingsIcon };

// ── App identity ──────────────────────────────────────────────────────────
const APP_CONFIG = {
  name: 'InvoiceFlow',
  abbr: 'IF',
};

// ── Static nav shape (badges injected dynamically) ────────────────────────
const NAV_MAIN_BASE = [
  { id: 'dashboard', label: 'Dashboard', icon: 'DashboardIcon' },
  { id: 'customers', label: 'Customers', icon: 'CustomersIcon' },
  { id: 'invoices',  label: 'Invoices',  icon: 'InvoicesIcon' },
  { id: 'reminders', label: 'Reminders', icon: 'BellIcon'     },
];

const NAV_BOTTOM = [
  { id: 'settings', label: 'Settings', icon: 'SettingsIcon' },
];

// ── Nav item ──────────────────────────────────────────────────────────────
function NavItem({ id, label, icon, badge, activePage, onNav, onSettingsClick }) {
  const IconComp = ICON_MAP[icon];
  const isSettings = id === 'settings';

  const handleClick = () => {
    if (isSettings) {
      onSettingsClick?.();
    } else {
      onNav(id);
    }
  };

  return (
    <div
      className={`${styles.navItem} ${activePage === id ? styles.active : ''}`}
      onClick={handleClick}
    >
      <IconComp />
      {label}
      {badge > 0 && <span className={styles.badge}>{badge}</span>}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────
export default function Sidebar({ activePage, onNav, open }) {
  const [badges, setBadges] = useState({ invoices: null, reminders: null });
  const [showComingSoon, setShowComingSoon] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    async function fetchBadges() {
      try {
        const [stats, allInvoices] = await Promise.all([
          getInvoiceStats(),
          getInvoices(),
        ]);

        const invoiceBadge = (stats.pendingCount ?? 0) + (stats.overdueCount ?? 0);

        const reminderBadge = allInvoices.filter(
          (inv) => (inv.status === 'overdue' || inv.status === 'pending') && !inv.reminderSentAt
        ).length;

        setBadges({ invoices: invoiceBadge, reminders: reminderBadge });
      } catch (err) {
        console.error('[Sidebar] badge fetch failed:', err.message);
      }
    }

    fetchBadges();
  }, [activePage]);

  const handleSettingsClick = () => {
    setShowComingSoon(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowComingSoon(false), 3000);
  };

  const navItems = NAV_MAIN_BASE.map((item) => ({
    ...item,
    badge: badges[item.id] ?? null,
  }));

  return (
    <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>

      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>{APP_CONFIG.abbr}</div>
        <span className={styles.logoName}>{APP_CONFIG.name}</span>
      </div>

      {/* Main nav */}
      <div className={styles.navSection}>
        <p className={styles.navLabel}>Main</p>
        {navItems.map((item) => (
          <NavItem key={item.id} {...item} activePage={activePage} onNav={onNav} />
        ))}
      </div>

      {/* Bottom nav */}
      <div className={styles.footer}>
        {NAV_BOTTOM.map((item) => (
          <div key={item.id} style={{ position: 'relative' }}>
            <NavItem
              {...item}
              activePage={activePage}
              onNav={onNav}
              onSettingsClick={handleSettingsClick}
            />
            {item.id === 'settings' && showComingSoon && (
              <div style={{
                position: 'absolute',
                bottom: 'calc(100% + 6px)',
                left: 8, right: 8,
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '7px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                boxShadow: '0 -2px 12px rgba(0,0,0,0.2)',
                animation: 'fadeIn 0.2s ease',
                zIndex: 200,
              }}>
                <span style={{ fontSize: 13 }}>🚀</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>
                  Coming Soon
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

    </aside>
  );
}