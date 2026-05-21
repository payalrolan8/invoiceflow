// src/components/ProtectedRoute.jsx
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, onRedirect }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#0f1117', color: '#fff', fontSize: 16,
      }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    onRedirect?.();
    return null;
  }

  return children;
}