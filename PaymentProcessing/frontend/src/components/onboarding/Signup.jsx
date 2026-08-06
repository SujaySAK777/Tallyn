import { useState } from 'react';
import { FiCheckCircle, FiShield } from 'react-icons/fi';
import { apiRequest } from '../../services/api';
import Shell from './Shell';
import TermsModal from './TermsModal';

const steps = ['Register', 'Link account', 'Set TPIN', 'Complete'];
const bankOptions = [
  'HDFC BANK',
  'ICICI BANK',
  'STATE BANK OF INDIA',
  'AXIS BANK',
  'KOTAK MAHINDRA BANK',
  'PUNJAB NATIONAL BANK',
  'BANK OF BARODA',
  'YES BANK',
  'WELLS FARGO',
  'HSBC'
];
const currencyOptions = ['INR', 'USD', 'EUR', 'GBP'];

const initial = {
  fullName: '',
  mobileNumber: '',
  email: '',
  password: '',
  confirmPassword: '',
  acceptedTerms: false,
  bankName: '',
  currency: 'INR',
  tpin: '',
  confirmTpin: ''
};

export default function Signup({ onSwitchToLogin }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initial);
  const [customerId, setCustomerId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const [emailVerified, setEmailVerified] = useState(false);
  const [emailOtpModalOpen, setEmailOtpModalOpen] = useState(false);
  const [emailOtpValue, setEmailOtpValue] = useState('');
  const [emailOtpError, setEmailOtpError] = useState('');
  const [emailOtpBusy, setEmailOtpBusy] = useState(false);

  const change = (event) => {
    const { name, type, value, checked } = event.target;
    setForm((v) => ({ ...v, [name]: type === 'checkbox' ? checked : value }));
    if (name === 'email') setEmailVerified(false);
  };

  const startEmailVerification = async () => {
    if (!form.email) {
      setError('Enter your email address first.');
      return;
    }
    setError('');
    setEmailOtpError('');
    setEmailOtpBusy(true);
    try {
      await apiRequest('/onboarding/send-email-otp', { method: 'POST', body: JSON.stringify({ email: form.email }) });
      setEmailOtpValue('');
      setEmailOtpModalOpen(true);
    } catch (err) {
      setError(err.message || 'Unable to send verification code.');
    } finally {
      setEmailOtpBusy(false);
    }
  };

  const confirmEmailOtp = async (event) => {
    event.preventDefault();
    setEmailOtpError('');
    setEmailOtpBusy(true);
    try {
      await apiRequest('/onboarding/verify-email-otp', { method: 'POST', body: JSON.stringify({ email: form.email, otp: emailOtpValue }) });
      setEmailVerified(true);
      setEmailOtpModalOpen(false);
    } catch (err) {
      setEmailOtpError(err.message || 'Invalid code.');
    } finally {
      setEmailOtpBusy(false);
    }
  };

  const submitDetails = async () => {
    if (!emailVerified) throw new Error('Please verify your email address first.');
    if (form.password !== form.confirmPassword) throw new Error('Passwords do not match.');
    if (!form.acceptedTerms) throw new Error('Please accept the Terms & Conditions to continue.');
    const [firstName, ...rest] = form.fullName.trim().split(/\s+/);
    const lastName = rest.join(' ') || firstName;
    const signupResult = await apiRequest('/onboarding/signup', {
      method: 'POST',
      body: JSON.stringify({ email: form.email, password: form.password })
    });
    await apiRequest(`/onboarding/${signupResult.customerId}/profile`, {
      method: 'PUT',
      body: JSON.stringify({ firstName, lastName, phoneNumber: form.mobileNumber })
    });
    setCustomerId(signupResult.customerId);
    setStep(1);
  };

  const submitLinkAccount = async () => {
    if (!form.bankName) throw new Error('Please select a bank to continue.');
    await apiRequest(`/onboarding/${customerId}/link-account`, {
      method: 'POST',
      body: JSON.stringify({ bankName: form.bankName, currency: form.currency || 'INR' })
    });
    setStep(2);
  };

  const skipLinkAccount = async () => {
    setError('');
    setBusy(true);
    try {
      await apiRequest(`/onboarding/${customerId}/complete`, { method: 'POST' });
      setStep(3);
    } catch (err) {
      setError(err.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const submitTpin = async () => {
    if (form.tpin !== form.confirmTpin) throw new Error('TPIN entries do not match.');
    await apiRequest(`/onboarding/${customerId}/set-tpin`, { method: 'POST', body: JSON.stringify({ tpin: form.tpin }) });
    setStep(3);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (step === 0) await submitDetails();
      else if (step === 1) await submitLinkAccount();
      else if (step === 2) await submitTpin();
      else onSwitchToLogin();
    } catch (err) {
      setError(err.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const title = step === 3 ? 'Registration complete' : steps[step];
  const description =
    step === 0 ? 'Create your secure Tallyn account.'
    : step === 1 ? 'Link a bank account now, or skip and add one later.'
    : step === 3 ? 'Your account is ready. Sign in to continue.'
    : 'Complete this secure step to continue.';

  return (
    <Shell pageHeading="Register" title={title} description={description} steps={steps} activeStep={step}>
      <form onSubmit={submit}>
        {step === 0 && (
          <div className="onboarding-form-grid">
            <label>
              Full name
              <input name="fullName" value={form.fullName} onChange={change} required />
            </label>
            <label>
              Mobile number
              <input name="mobileNumber" inputMode="numeric" value={form.mobileNumber} onChange={change} required />
            </label>
            <div className="field-span2 email-field-row">
              <label>
                Email address
                <input name="email" type="email" value={form.email} onChange={change} required />
              </label>
              <button type="button" className="email-verify-btn" onClick={startEmailVerification} disabled={emailOtpBusy || emailVerified}>
                {emailVerified ? 'Verified' : emailOtpBusy ? 'Sending…' : 'Verify'}
              </button>
            </div>
            {emailVerified && <div className="field-span2 email-verified-badge"><FiCheckCircle /> Email verified</div>}
            <label>
              Create password (8+ characters)
              <input name="password" type="password" minLength={8} value={form.password} onChange={change} required />
            </label>
            <label>
              Confirm password
              <input name="confirmPassword" type="password" minLength={8} value={form.confirmPassword} onChange={change} required />
            </label>
            <label className="field-span2 terms-checkbox-row">
              <input name="acceptedTerms" type="checkbox" checked={form.acceptedTerms} onChange={change} />
              <span>
                I agree to the <button type="button" onClick={() => setTermsOpen(true)}>Terms &amp; Conditions</button>
              </span>
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="onboarding-form-grid">
            <div className="field-span2">
              <label>Choose bank</label>
              <div className="bank-toggle-group" role="radiogroup" aria-label="Choose bank">
                {bankOptions.map((bank) => (
                  <button
                    key={bank}
                    type="button"
                    role="radio"
                    aria-checked={form.bankName === bank}
                    className={`bank-toggle-btn ${form.bankName === bank ? 'active' : ''}`}
                    onClick={() => setForm((v) => ({ ...v, bankName: bank }))}
                  >
                    {bank}
                  </button>
                ))}
              </div>
            </div>
            <div className="field-span2">
              <label>Choose currency</label>
              <div className="bank-toggle-group" role="radiogroup" aria-label="Choose account currency">
                {currencyOptions.map((currencyCode) => (
                  <button
                    key={currencyCode}
                    type="button"
                    role="radio"
                    aria-checked={(form.currency || 'INR') === currencyCode}
                    className={`bank-toggle-btn ${(form.currency || 'INR') === currencyCode ? 'active' : ''}`}
                    onClick={() => setForm((v) => ({ ...v, currency: currencyCode }))}
                  >
                    {currencyCode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-form-grid">
            <label>
              6-digit TPIN
              <input name="tpin" type="password" inputMode="numeric" minLength={6} maxLength={6} value={form.tpin} onChange={change} required />
            </label>
            <label>
              Confirm TPIN
              <input name="confirmTpin" type="password" inputMode="numeric" minLength={6} maxLength={6} value={form.confirmTpin} onChange={change} required />
            </label>
          </div>
        )}

        {step === 3 && <div className="complete-note"><FiShield /> Registration complete.</div>}

        {error && <p className="onboarding-error">{error}</p>}

        {step === 1 ? (
          <div className="onboarding-actions-row">
            <button type="button" className="onboarding-skip-btn" onClick={skipLinkAccount} disabled={busy}>Skip for now</button>
            <button disabled={busy}>{busy ? 'Please wait…' : 'Continue'}</button>
          </div>
        ) : (
          <button disabled={busy}>
            {busy ? 'Please wait…' : step === 3 ? 'Go to login' : step === 0 ? 'Create account' : 'Continue'}
          </button>
        )}
      </form>
      {step === 0 && <button className="onboarding-link" onClick={onSwitchToLogin}>Already have an account? Log in</button>}
      <TermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />

      {emailOtpModalOpen && (
        <div className="terms-modal-overlay" onClick={() => setEmailOtpModalOpen(false)}>
          <div className="terms-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Verify your email</h3>
            <p>Enter the 6-digit code we sent to <strong>{form.email}</strong>.</p>
            <form onSubmit={confirmEmailOtp} style={{ marginTop: 14, display: 'grid', gap: 12 }}>
              <input
                className="otp-modal-input"
                inputMode="numeric"
                maxLength={6}
                value={emailOtpValue}
                onChange={(e) => setEmailOtpValue(e.target.value)}
                autoFocus
                required
              />
              {emailOtpError && <p className="onboarding-error">{emailOtpError}</p>}
              <button type="submit" className="terms-modal-close" disabled={emailOtpBusy}>
                {emailOtpBusy ? 'Verifying…' : 'Confirm'}
              </button>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
