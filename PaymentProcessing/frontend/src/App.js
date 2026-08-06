import { useState } from 'react';
import Dashboard from './components/DashboardEnhance';
import OnboardingWizard from './components/OnboardingWizard';

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

  return session ? <Dashboard session={session} onLogout={handleLogout} /> : <OnboardingWizard onLogin={handleLogin} />;
}

export default App;
