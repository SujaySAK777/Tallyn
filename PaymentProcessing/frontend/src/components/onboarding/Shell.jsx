import { FiCheckCircle } from 'react-icons/fi';
import './onboarding.css';

export default function Shell({ pageHeading, icon, title, description, steps, activeStep, children }) {
  return (
    <main className="onboarding-shell">
      <header className="onboarding-topbar">
        <div className="onboarding-logo">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 17.5L14 21.5L26 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 17.5L14 21.5L11.5 12.5L26 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
          </svg>
        </div>
        <span className="onboarding-brand-name">Tallyn</span>
      </header>

      {steps && (
        <ol className="onboarding-hstepper">
          {steps.map((label, index) => (
            <li key={label} className={index <= activeStep ? 'done' : ''}>
              <span className="hstep-marker">{index < activeStep ? <FiCheckCircle /> : index + 1}</span>
              <span className="hstep-label">{label}</span>
            </li>
          ))}
        </ol>
      )}

      {pageHeading && <h1 className="onboarding-page-heading">{pageHeading}</h1>}

      <section className="onboarding-card">
        {icon && <div className="onboarding-icon">{icon}</div>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        {children}
      </section>
    </main>
  );
}
