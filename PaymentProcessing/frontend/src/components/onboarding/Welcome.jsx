import { useEffect } from 'react';
import './onboarding.css';

export default function Welcome({ onGetStarted }) {
  useEffect(() => {
    const timer = setTimeout(onGetStarted, 3000);
    return () => clearTimeout(timer);
  }, [onGetStarted]);

  return (
    <main className="welcome-shell">
      <div className="welcome-content">
        <div className="welcome-hero">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 17.5L14 21.5L26 8" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 17.5L14 21.5L11.5 12.5L26 8" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
          </svg>
        </div>
        <h1>Tallyn</h1>
        <p>Simple, secure payments made personal.</p>
      </div>
    </main>
  );
}
