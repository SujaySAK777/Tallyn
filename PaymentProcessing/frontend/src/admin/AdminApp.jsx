import { useState } from 'react';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';

function AdminApp() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem('tallyn-admin-session') || 'null'); } catch { return null; }
  });

  const handleLogin = (nextSession) => {
    window.localStorage.setItem('tallyn-admin-session', JSON.stringify(nextSession));
    setSession(nextSession);
  };

  const handleLogout = () => {
    window.localStorage.removeItem('tallyn-admin-session');
    setSession(null);
  };

  return session ? <AdminDashboard session={session} onLogout={handleLogout} /> : <AdminLogin onLogin={handleLogin} />;
}

export default AdminApp;
