import { useState } from 'react';
import { adminApiRequest } from '../services/adminApi';

function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const session = await adminApiRequest('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      onLogin(session);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '360px', margin: '4rem auto', padding: '2rem', border: '1px solid #ddd', borderRadius: '10px' }}>
      <h2 style={{ marginTop: 0 }}>Tallyn Admin</h2>
      <p style={{ color: '#666' }}>Review and resolve refund tickets raised by customers.</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <input
          type="email"
          placeholder="Admin email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc' }}
        />
        {error && <p style={{ color: '#dc3545', margin: 0 }}>{error}</p>}
        <button type="submit" disabled={submitting} style={{ padding: '0.6rem', borderRadius: '6px', background: '#1a73e8', color: '#fff', border: 'none', cursor: 'pointer' }}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

export default AdminLogin;
