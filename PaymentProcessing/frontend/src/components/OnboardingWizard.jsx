import { useState } from 'react';
import { FiCheckCircle, FiLock, FiLogIn, FiShield, FiUser } from 'react-icons/fi';
import { apiRequest } from '../services/api';
import './OnboardingWizard.css';

const steps = ['Welcome', 'Sign up', 'Profile', 'Link account', 'Verify', 'Set TPIN', 'Complete'];
const initial = { email: '', password: '', confirmPassword: '', firstName: '', lastName: '', phoneNumber: '', bankName: 'HDFC BANK', accountNumber: '', accountHolderName: '', otp: '', tpin: '', confirmTpin: '' };
const passwordRules = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) }
];
const supportedBanks = ['HDFC BANK', 'ICICI BANK', 'STATE BANK OF INDIA', 'AXIS BANK'];

export default function OnboardingWizard({ onLogin }) {
  const [mode, setMode] = useState('onboarding');
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initial);
  const [customerId, setCustomerId] = useState(null);
  const [phoneHint, setPhoneHint] = useState('');
  const [developmentOtp, setDevelopmentOtp] = useState('');
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm((v) => ({ ...v, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        onLogin(await apiRequest('/onboarding/login', { method: 'POST', body: JSON.stringify(form) }));
        return;
      }
      if (step === 0) { setStep(1); return; }
      if (step === 1) {
        if (form.password !== form.confirmPassword) throw new Error('Passwords do not match.');
        if (!passwordRules.every((rule) => rule.test(form.password))) {
          throw new Error('Password does not meet all the requirements above.');
        }
        const r = await apiRequest('/onboarding/signup', { method: 'POST', body: JSON.stringify(form) });
        setCustomerId(r.customerId);
        setStep(2);
        return;
      }
      if (step === 2) {
        await apiRequest(`/onboarding/${customerId}/profile`, { method: 'PUT', body: JSON.stringify(form) });
        setStep(3);
        return;
      }
      if (step === 3) {
        const r = await apiRequest(`/onboarding/${customerId}/link-account`, { method: 'POST', body: JSON.stringify({ bankName: form.bankName }) });
        setPhoneHint(r.phoneHint || '');
        setDevelopmentOtp(r.developmentOtp || '');
        setStep(4);
        return;
      }
      if (step === 4) {
        await apiRequest(`/onboarding/${customerId}/verify`, { method: 'POST', body: JSON.stringify({ otp: form.otp }) });
        setStep(5);
        return;
      }
      if (step === 5) {
        if (form.tpin !== form.confirmTpin) throw new Error('TPIN entries do not match.');
        await apiRequest(`/onboarding/${customerId}/set-tpin`, { method: 'POST', body: JSON.stringify({ tpin: form.tpin }) });
        setStep(6);
        return;
      }
      setMode('login');
    } catch (err) {
      setError(err.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const skipAccount = async () => {
    setError('');
    setBusy(true);
    try {
      await apiRequest(`/onboarding/${customerId}/complete`, { method: 'POST' });
      setStep(6);
    } catch (err) {
      setError(err.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const fields = mode === 'login'
    ? [['email', 'Email address', 'email'], ['password', 'Password', 'password']]
    : step === 1
      ? [['email', 'Email address', 'email'], ['password', 'Create password (8+ characters)', 'password'], ['confirmPassword', 'Confirm password', 'password']]
      : step === 2
        ? [['firstName', 'First name'], ['lastName', 'Last name'], ['phoneNumber', 'Phone number']]
        : step === 3
          ? [['bankName', 'Bank name']]
          : step === 4
            ? [['otp', '6-digit verification code']]
            : step === 5
              ? [['tpin', '6-digit TPIN', 'password'], ['confirmTpin', 'Confirm TPIN', 'password']]
              : [];

  const title = mode === 'login' ? 'Welcome back' : steps[step];
  const description = mode === 'login'
    ? 'Log in to access your Tallyn dashboard.'
    : step === 1
      ? 'Create your secure Tallyn account.'
      : step === 3
        ? 'Link an existing bank account, or skip and add one later from Home.'
        : step === 6
          ? 'Your account is ready. Sign in to continue.'
          : 'Complete this secure step to continue.';

  return (
    <main className="onboarding-shell">
      <section className="onboarding-brand">
        <div className="onboarding-logo">T</div>
        <h1>Tallyn</h1>
        <p>Simple, secure payments made personal.</p>
        <ol>
          {steps.map((s, i) => (
            <li key={s} className={mode === 'onboarding' && i <= step ? 'done' : ''}>
              {i < step ? <FiCheckCircle /> : <span>{i + 1}</span>}
              {s}
            </li>
          ))}
        </ol>
      </section>
      <section className="onboarding-card">
        <div className="onboarding-icon">
          {mode === 'login' ? <FiLogIn /> : step === 6 ? <FiCheckCircle /> : step === 5 ? <FiLock /> : <FiUser />}
        </div>
        <h2>{title}</h2>
        <p>{description}</p>
        <form onSubmit={submit}>
          {fields.map(([name, placeholder, type]) => (
            <label key={name}>
              {placeholder}
              {name === 'bankName' ? (
                <select name={name} value={form[name]} onChange={change} required>
                  {supportedBanks.map((bank) => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              ) : (
                <input
                  name={name}
                  type={type || 'text'}
                  minLength={name.includes('password') ? '8' : undefined}
                  inputMode={name.includes('tpin') ? 'numeric' : undefined}
                  value={form[name]}
                  onChange={change}
                  onFocus={name === 'password' ? () => setPasswordFocused(true) : undefined}
                  onBlur={name === 'password' ? () => setPasswordFocused(false) : undefined}
                  required
                />
              )}
              {name === 'password' && passwordFocused && (
                <div className="password-hints">
                  {passwordRules.map((rule) => (
                    <div key={rule.label} className={rule.test(form.password) ? 'ok' : ''}>
                      {rule.test(form.password) ? '✓' : '•'} {rule.label}
                    </div>
                  ))}
                </div>
              )}
            </label>
          ))}
          {mode === 'onboarding' && step === 3 && (
            <button type="button" className="onboarding-skip" onClick={skipAccount} disabled={busy}>
              Skip for now — add a bank account later from Home
            </button>
          )}
          {step === 4 && phoneHint && (
            <small className="dev-otp">Verification code sent to {phoneHint}</small>
          )}
          {step === 4 && developmentOtp && (
            <small className="dev-otp">SMS delivery isn't available right now — use this code: <strong>{developmentOtp}</strong></small>
          )}
          {step === 6 && <div className="complete-note"><FiShield /> Registration complete.</div>}
          {error && <p className="onboarding-error">{error}</p>}
          <button disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : step === 6 ? 'Go to login' : step === 0 ? 'Get started' : 'Continue'}
          </button>
        </form>
        <button className="onboarding-link" onClick={() => { setMode(mode === 'login' ? 'onboarding' : 'login'); setStep(0); }}>
          {mode === 'login' ? 'Create an account' : 'Already have an account? Log in'}
        </button>
      </section>
    </main>
  );
}