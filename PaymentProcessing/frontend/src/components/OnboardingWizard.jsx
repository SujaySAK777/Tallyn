import { useState } from 'react';
import Welcome from './onboarding/Welcome';
import Login from './onboarding/Login';
import Signup from './onboarding/Signup';
import ForgotPassword from './onboarding/ForgotPassword';

export default function OnboardingWizard({ onLogin }) {
  const [screen, setScreen] = useState('welcome');

  if (screen === 'welcome') return <Welcome onGetStarted={() => setScreen('login')} />;
  if (screen === 'signup') return <Signup onSwitchToLogin={() => setScreen('login')} />;
  if (screen === 'forgot-password') return <ForgotPassword onBackToLogin={() => setScreen('login')} />;
  return (
    <Login
      onLogin={onLogin}
      onSwitchToSignup={() => setScreen('signup')}
      onForgotPassword={() => setScreen('forgot-password')}
    />
  );
}
