import { useState } from 'react';
import { apiRequest } from '../../services/api';
import Shell from './Shell';

const initial = { email: '', password: '' };

export default function Login({ onLogin, onSwitchToSignup, onForgotPassword }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const change = (event) => setForm((v) => ({ ...v, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const session = await apiRequest('/onboarding/login', { method: 'POST', body: JSON.stringify(form) });
      onLogin(session);
    } catch (err) {
      setError(err.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell pageHeading="Login" title="Welcome back" description="Log in to access your Tallyn dashboard.">
      <form onSubmit={submit}>
        <label>
          Email address
          <input name="email" type="email" value={form.email} onChange={change} required />
        </label>
        <label>
          Password
          <input name="password" type="password" value={form.password} onChange={change} required />
        </label>
        <div className="onboarding-link-row">
          <button type="button" onClick={onForgotPassword}>Forgot password?</button>
        </div>
        {error && <p className="onboarding-error">{error}</p>}
        <button disabled={busy}>{busy ? 'Please wait…' : 'Log in'}</button>
      </form>
      <button className="onboarding-link" onClick={onSwitchToSignup}>New here? Register</button>
    </Shell>
  );
}
