// src/App.jsx  (updated — add Reminders page)
import { useState } from 'react';
import './styles/global.css';

import Sidebar        from './components/Sidebar';
import Topbar         from './components/Topbar';
import Dashboard      from './pages/Dashboard';
import Customers      from './pages/Customers';
import Invoices       from './pages/Invoices';
import CustomerDetail from './pages/Customerdetail';
import Reminders      from './pages/Reminders';   // ← NEW

export default function App() {
  const [page,           setPage]           = useState('dashboard');
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [detailCustomer, setDetailCustomer] = useState(null);

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
    if (page === 'reminders')  return <Reminders />;   // ← NEW
    return <Dashboard />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar activePage={page} onNav={handleNav} open={sidebarOpen} />
      <div style={{
        marginLeft: 'var(--sidebar-w)', flex: 1,
        display: 'flex', flexDirection: 'column', minHeight: '100vh',
      }}>
        <Topbar onMenuClick={() => setSidebarOpen((v) => !v)} />
        <main style={{ padding: 24, flex: 1 }}>{renderPage()}</main>
      </div>
    </div>
  );
}