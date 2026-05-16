// src/components/Card.jsx
// Generic card shell used by all pages

import styles from './Card.module.css';

export function Card({ children, className = '' }) {
  return <div className={`${styles.card} ${className}`}>{children}</div>;
}

export function CardHeader({ title, action }) {
  return (
    <div className={styles.header}>
      <span className={styles.title}>{title}</span>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardBody({ children, noPad = false }) {
  return (
    <div className={noPad ? '' : styles.body}>
      {children}
    </div>
  );
}