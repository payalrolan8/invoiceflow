// src/components/StatCard.jsx
import styles from './StatCard.module.css';
import { TrendUpIcon, TrendDownIcon } from './Icons';

/**
 * Props:
 *  label      – string
 *  value      – string  e.g. "₹4,20,000"
 *  color      – CSS var name e.g. "var(--blue)"
 *  change     – string  e.g. "+12.4%"
 *  trend      – "up" | "down" | null
 */
export default function StatCard({ label, value, color, change, trend }) {
  const trendColor =
    trend === 'up'   ? 'var(--green)'  :
    trend === 'down' ? 'var(--red)'    :
    'var(--text2)';

  return (
    <div className={styles.card}>
      <div className={styles.label}>
        <span className={styles.dot} style={{ background: color }} />
        {label}
      </div>
      <div className={styles.value}>{value}</div>
      {change && (
        <div className={styles.change} style={{ color: trendColor }}>
          {trend === 'up'   && <TrendUpIcon />}
          {trend === 'down' && <TrendDownIcon />}
          {change}
        </div>
      )}
    </div>
  );
}