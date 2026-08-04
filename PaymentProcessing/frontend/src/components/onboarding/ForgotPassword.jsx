import { useState } from 'react';
import { FiLock, FiMail, FiCheckCircle } from 'react-icons/fi';
import { apiRequest } from '../../services/api';
import Shell from './Shell';

export default function ForgotPassword({ onBackToLogin }) {
  const [phase, setPhase] = useState('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const requestCode = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await apiRequest('/onboarding/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
      setPhase('otp');
    } catch (err) {
      setError(err.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirmOtp = (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code sent to your email.');
      return;
    }
    setError('');
    setPhase('reset');
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setError('');
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await apiRequest('/onboarding/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, otp, newPassword })
      });
      setPhase('done');
    } catch (err) {
      setError(err.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (phase === 'request') {
    return (
      <Shell icon={<FiMail />} title="Forgot password" description="Enter your email and we'll send a verification code.">
        <form onSubmit={requestCode}>
          <label>
            Email address
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {error && <p className="onboarding-error">{error}</p>}
          <button disabled={busy}>{busy ? 'Please wait…' : 'Send code'}</button>
        </form>
        <button className="onboarding-link" onClick={onBackToLogin}>Back to login</button>
      </Shell>
    );
  }

  if (phase === 'otp') {
    return (
      <Shell icon={<FiMail />} title="Enter verification code" description="We sent a 6-digit code to your email.">
        <form onSubmit={confirmOtp}>
          <label>
            6-digit verification code
            <input inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} required />
          </label>
          {error && <p className="onboarding-error">{error}</p>}
          <button>Continue</button>
        </form>
        <button className="onboarding-link" onClick={onBackToLogin}>Back to login</button>
      </Shell>
    );
  }

  if (phase === 'reset') {
    return (
      <Shell icon={<FiLock />} title="Set a new password" description="Choose a new password for your account.">
        <form onSubmit={resetPassword}>
          <label>
            New password (8+ characters)
            <input type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </label>
          <label>
            Confirm new password
            <input type="password" minLength={8} value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required />
          </label>
          {error && <p className="onboarding-error">{error}</p>}
          <button disabled={busy}>{busy ? 'Please wait…' : 'Reset password'}</button>
        </form>
        <button className="onboarding-link" onClick={onBackToLogin}>Back to login</button>
      </Shell>
    );
  }

  return (
    <Shell icon={<FiCheckCircle />} title="Password updated" description="Your password has been reset successfully.">
      <div className="complete-note"><FiCheckCircle /> You can now log in with your new password.</div>
      <button className="onboarding-link" onClick={onBackToLogin}>Back to login</button>
    </Shell>
  );
}
