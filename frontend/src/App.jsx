// src/App.jsx
import { useState } from 'react';
import './styles/global.css';

import { useAuth }      from './context/AuthContext';
import Sidebar          from './components/Sidebar';
import Topbar           from './components/Topbar';
import Dashboard        from './pages/Dashboard';
import Customers        from './pages/Customers';
import Invoices         from './pages/Invoices';
import CustomerDetail   from './pages/CustomerDetail';
import Reminders        from './pages/Reminders';
import LoginPage        from './pages/LoginPage';
import RegisterPage     from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

export default function App() {
  const { user, loading, logout } = useAuth();

  const [page,           setPage]           = useState('login');
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [detailCustomer, setDetailCustomer] = useState(null);

  // While checking token / fetching user
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

  // ── Auth pages ────────────────────────────────────────────────────────────
  if (!user) {
    if (page === 'register')        return <RegisterPage     onNavigate={setPage} />;
    if (page === 'forgot-password') return <ForgotPasswordPage onNavigate={setPage} />;
    return <LoginPage onNavigate={setPage} />;
  }

  // ── App pages ─────────────────────────────────────────────────────────────
  function handleNav(id) {
    setPage(id);
    setDetailCustomer(null);
    setSidebarOpen(false);
  }

  function handleViewCustomer(id) {
    setDetailCustomer(id);
    setPage('customers');
  }

  function renderPage() {
    if (page === 'customers' && detailCustomer) {
      return <CustomerDetail customerId={detailCustomer} onBack={() => setDetailCustomer(null)} />;
    }
    if (page === 'customers')  return <Customers onView={handleViewCustomer} />;
    if (page === 'invoices')   return <Invoices />;
    if (page === 'reminders')  return <Reminders />;
    return <Dashboard />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar activePage={page} onNav={handleNav} open={sidebarOpen} />

      <div className="main-content">
        <Topbar
          onMenuClick={() => setSidebarOpen((v) => !v)}
          onLogout={() => { logout(); setPage('login'); }}
        />
        <main style={{ padding: 24, flex: 1 }}>{renderPage()}</main>
      </div>

    </div>
  );
}