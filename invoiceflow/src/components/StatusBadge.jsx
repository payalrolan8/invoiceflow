// src/components/StatusBadge.jsx

import styles from './StatusBadge.module.css';

const CONFIG = {
  Draft:      { color: 'var(--text2)',   bg: 'rgba(107,114,128,0.1)' },
  Sent:       { color: 'var(--blue)',    bg: 'var(--blue-bg)'   },
  Pending:    { color: 'var(--orange)',  bg: 'var(--orange-bg)' },
  Paid:       { color: 'var(--green)',   bg: 'var(--green-bg)'  },
  Overdue:    { color: 'var(--red)',     bg: 'var(--red-bg)'    },
  Cancelled:  { color: 'var(--text2)',   bg: 'rgba(107,114,128,0.12)' },
};

export default function StatusBadge({ status }) {
  const cfg = CONFIG[status] ?? CONFIG.Draft;
  return (
    <span
      className={styles.badge}
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {status}
    </span>
  );
}