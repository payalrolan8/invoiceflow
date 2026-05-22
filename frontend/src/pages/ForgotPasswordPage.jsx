// src/pages/ForgotPasswordPage.jsx
import { useState } from 'react';
import { forgotPassword } from '../api/auth';
import styles from './AuthPage.module.css';

export default function ForgotPasswordPage({ onNavigate }) {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>⚡</span>
          <span className={styles.logoText}>InvoiceFlow</span>
        </div>

        <h1 className={styles.title}>Reset password</h1>
        <p className={styles.subtitle}>
          {sent ? 'Check your inbox' : "We'll send you a reset link"}
        </p>

        {error && <div className={styles.error}>{error}</div>}

        {sent ? (
          <div className={styles.successBox}>
            If <strong>{email}</strong> is registered, a reset link is on its way.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input
                type="email"
                className={styles.input}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className={styles.footer}>
          <button className={styles.link} onClick={() => onNavigate('login')}>
            ← Back to sign in
          </button>
        </p>
      </div>
    </div>
  );
}