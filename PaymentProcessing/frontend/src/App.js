import { useState } from 'react';
import Dashboard from './components/DashboardEnhance';
import OnboardingWizard from './components/OnboardingWizard';
import AdminApp from './admin/AdminApp';

function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem('tallyn-session') || 'null'); } catch { return null; }
  });

  const handleLogin = (nextSession) => {
    window.localStorage.setItem('tallyn-session', JSON.stringify(nextSession));
    setSession(nextSession);
  };

  const handleLogout = () => {
    window.localStorage.removeItem('tallyn-session');
    setSession(null);
  };

  // Admin is a fully separate login/session (see AdminApp), never mixed with the
  // customer session above - keeping it a plain path check avoids pulling in a
  // router just for this one extra route.
  if (window.location.pathname.startsWith('/admin')) {
    return <AdminApp />;
  }

  return session ? <Dashboard session={session} onLogout={handleLogout} /> : <OnboardingWizard onLogin={handleLogin} />;
}

export default App;
