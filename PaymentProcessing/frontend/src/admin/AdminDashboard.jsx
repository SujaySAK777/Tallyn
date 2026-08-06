import { useEffect, useState } from 'react';
import { adminApiRequest } from '../services/adminApi';

function typeLabel(type) {
  if (type === 'MERCHANT_REFUND_REQUEST') return 'Merchant Refund';
  if (type === 'WRONG_PAYMENT') return 'Wrong Payment';
  return '—';
}

function AdminDashboard({ session, onLogout }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioningId, setActioningId] = useState(null);
  const [rejectReasonById, setRejectReasonById] = useState({});

  const loadTickets = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApiRequest('/admin/refund-requests?status=PENDING');
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load refund tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApprove = async (requestId) => {
    setActioningId(requestId);
    setError('');
    try {
      await adminApiRequest(`/admin/refund-requests/${requestId}/approve`, { method: 'POST' });
      await loadTickets();
    } catch (err) {
      setError(err.message || 'Unable to approve this ticket.');
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (requestId) => {
    setActioningId(requestId);
    setError('');
    try {
      await adminApiRequest(`/admin/refund-requests/${requestId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReasonById[requestId] || '' })
      });
      await loadTickets();
    } catch (err) {
      setError(err.message || 'Unable to reject this ticket.');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '2rem auto', padding: '0 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Refund Tickets</h2>
          <p style={{ color: '#666', margin: '0.25rem 0 0' }}>Signed in as {session.email}</p>
        </div>
        <div>
          <button type="button" onClick={loadTickets} style={{ marginRight: '0.5rem' }}>Refresh</button>
          <button type="button" onClick={onLogout}>Log out</button>
        </div>
      </div>

      {error && <p style={{ color: '#dc3545' }}>{error}</p>}
      {loading && <p>Loading pending tickets...</p>}
      {!loading && tickets.length === 0 && <p>No pending refund tickets right now.</p>}

      {!loading && tickets.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '0.5rem' }}>Payment Ref</th>
              <th style={{ padding: '0.5rem' }}>Amount</th>
              <th style={{ padding: '0.5rem' }}>Type</th>
              <th style={{ padding: '0.5rem' }}>Reason</th>
              <th style={{ padding: '0.5rem' }}>Requested</th>
              <th style={{ padding: '0.5rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.requestId} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem' }}>{ticket.referenceNumber}</td>
                <td style={{ padding: '0.5rem' }}>{ticket.currency} {ticket.amount}</td>
                <td style={{ padding: '0.5rem' }}>{typeLabel(ticket.type)}</td>
                <td style={{ padding: '0.5rem' }}>{ticket.reason || '—'}</td>
                <td style={{ padding: '0.5rem' }}>{ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : '—'}</td>
                <td style={{ padding: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '220px' }}>
                    <button
                      type="button"
                      disabled={actioningId === ticket.requestId}
                      onClick={() => handleApprove(ticket.requestId)}
                      style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem' }}
                    >
                      Approve
                    </button>
                    <input
                      type="text"
                      placeholder="Rejection reason"
                      value={rejectReasonById[ticket.requestId] || ''}
                      onChange={(event) => setRejectReasonById((prev) => ({ ...prev, [ticket.requestId]: event.target.value }))}
                      style={{ padding: '0.3rem', borderRadius: '6px', border: '1px solid #ccc' }}
                    />
                    <button
                      type="button"
                      disabled={actioningId === ticket.requestId}
                      onClick={() => handleReject(ticket.requestId)}
                      style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem' }}
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AdminDashboard;
