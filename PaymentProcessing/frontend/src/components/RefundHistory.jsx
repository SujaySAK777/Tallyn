import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../services/api';

// Customer-facing vocabulary is OPEN / REJECTED / REFUNDED. The backend ticket status
// is PENDING/APPROVED/REJECTED - APPROVED is shown as REFUNDED here because approve()
// moves the money in the same step, so by the time a customer sees APPROVED the refund
// has already happened.
function toDisplayStatus(status) {
  if (status === 'PENDING') return 'OPEN';
  if (status === 'APPROVED') return 'REFUNDED';
  return status; // REJECTED
}

function statusClassName(displayStatus) {
  if (displayStatus === 'OPEN') return 'status-pending';
  if (displayStatus === 'REFUNDED') return 'status-refunded';
  return 'status-failed';
}

const TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'OPEN', label: 'Open' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'REFUNDED', label: 'Refunded' }
];

function typeLabel(type) {
  if (type === 'MERCHANT_REFUND_REQUEST') return 'Merchant Refund';
  if (type === 'WRONG_PAYMENT') return 'Wrong Payment';
  return '—';
}

function RefundHistory({ currency, payments = [], viewerAccountId, onTicketRaised }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');

  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');
  const [paymentSearchOpen, setPaymentSearchOpen] = useState(false);
  const [newTicketType, setNewTicketType] = useState('');
  const [newTicketReason, setNewTicketReason] = useState('');
  const [raising, setRaising] = useState(false);
  const [raiseError, setRaiseError] = useState('');

  const load = async (options = {}) => {
    const { silent = false } = options;
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const data = await apiRequest('/refund-requests/mine');
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      if (!silent) {
        setError(err.message || 'Unable to load refund history.');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    load();
    // Admin approvals/rejections happen in a separate session (the admin panel), so the
    // only way this screen finds out is by polling - matches the same pattern Dashboard.js
    // already uses for payments/notifications.
    const pollInterval = window.setInterval(() => load({ silent: true }), 15000);
    return () => window.clearInterval(pollInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const decorated = useMemo(
    () => tickets.map((ticket) => ({ ...ticket, displayStatus: toDisplayStatus(ticket.status) })),
    [tickets]
  );

  const visible = activeTab === 'ALL' ? decorated : decorated.filter((ticket) => ticket.displayStatus === activeTab);

  // Only payments the viewer sent, that are COMPLETED, and don't already have a
  // ticket sitting OPEN - matches the rules PaymentController/RefundRequestService enforce.
  const eligiblePayments = useMemo(() => {
    const paymentIdsWithOpenTicket = new Set(
      decorated.filter((ticket) => ticket.displayStatus === 'OPEN').map((ticket) => String(ticket.paymentId))
    );
    return payments.filter((payment) => (
      String(payment.sourceAccountId) === String(viewerAccountId)
      && payment.status === 'COMPLETED'
      && !paymentIdsWithOpenTicket.has(String(payment.paymentId))
    ));
  }, [payments, viewerAccountId, decorated]);

  const paymentLabel = (payment) => (
    `${payment.referenceNumber} — ${currency ? currency(payment.amount, payment.currency) : `${payment.currency} ${payment.amount}`}`
  );

  const selectedPayment = eligiblePayments.find((payment) => String(payment.paymentId) === String(selectedPaymentId)) || null;

  const searchResults = useMemo(() => {
    const query = paymentSearchQuery.trim().toLowerCase();
    if (!query) return eligiblePayments;
    return eligiblePayments.filter((payment) => (
      String(payment.referenceNumber).toLowerCase().includes(query)
      || String(payment.amount).includes(query)
    ));
  }, [eligiblePayments, paymentSearchQuery]);

  const choosePayment = (payment) => {
    setSelectedPaymentId(String(payment.paymentId));
    setPaymentSearchQuery(paymentLabel(payment));
    setPaymentSearchOpen(false);
  };

  const clearChosenPayment = () => {
    setSelectedPaymentId('');
    setPaymentSearchQuery('');
    setPaymentSearchOpen(true);
  };

  const handleRaiseTicket = async () => {
    if (!selectedPaymentId) {
      setRaiseError('Choose a payment first.');
      return;
    }
    if (!newTicketType) {
      setRaiseError('Choose a category before raising the request.');
      return;
    }
    setRaising(true);
    setRaiseError('');
    try {
      const params = new URLSearchParams({ reason: newTicketReason, type: newTicketType });
      await apiRequest(`/payments/${selectedPaymentId}/refund-requests?${params.toString()}`, { method: 'POST' });
      setSelectedPaymentId('');
      setPaymentSearchQuery('');
      setNewTicketType('');
      setNewTicketReason('');
      await load();
      onTicketRaised?.();
    } catch (err) {
      setRaiseError(err.message || 'Unable to raise a refund ticket right now.');
    } finally {
      setRaising(false);
    }
  };

  return (
    <div>
      <section className="premium-card" aria-label="Raise a refund ticket">
        <div className="receipt-section-title">Raise a ticket</div>

        {eligiblePayments.length === 0 && (
          <p>No completed payments available to raise a ticket for right now.</p>
        )}

        {eligiblePayments.length > 0 && (
          <div>
            <div style={{ marginBottom: '0.5rem', position: 'relative' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Payment</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Search by reference number or amount..."
                  value={paymentSearchQuery}
                  onChange={(event) => {
                    setPaymentSearchQuery(event.target.value);
                    setSelectedPaymentId('');
                    setPaymentSearchOpen(true);
                  }}
                  onFocus={() => setPaymentSearchOpen(true)}
                  onBlur={() => window.setTimeout(() => setPaymentSearchOpen(false), 150)}
                  style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid #ccc' }}
                />
                {selectedPayment && (
                  <button type="button" onClick={clearChosenPayment} aria-label="Clear chosen payment">✕</button>
                )}
              </div>

              {paymentSearchOpen && (
                <div style={{
                  position: 'absolute', zIndex: 5, top: '100%', left: 0, right: 0,
                  background: 'var(--surface, #fff)', border: '1px solid #ccc', borderRadius: '8px',
                  marginTop: '0.25rem', maxHeight: '220px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
                }}>
                  {searchResults.length === 0 && (
                    <div style={{ padding: '0.5rem 0.75rem', color: '#888' }}>No matching payments.</div>
                  )}
                  {searchResults.map((payment) => (
                    <div
                      key={payment.paymentId}
                      onClick={() => choosePayment(payment)}
                      style={{ padding: '0.5rem 0.75rem', cursor: 'pointer' }}
                      onMouseDown={(event) => event.preventDefault()}
                    >
                      {paymentLabel(payment)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>What is this refund about?</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem',
                  borderRadius: '8px', border: newTicketType === 'MERCHANT_REFUND_REQUEST' ? '2px solid #1a73e8' : '1px solid #ccc',
                  cursor: 'pointer'
                }}>
                  <input
                    type="radio"
                    name="newTicketType"
                    value="MERCHANT_REFUND_REQUEST"
                    checked={newTicketType === 'MERCHANT_REFUND_REQUEST'}
                    onChange={() => setNewTicketType('MERCHANT_REFUND_REQUEST')}
                  />
                  Merchant (Shopping, Food, Entertainment, Bill Payment)
                </label>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem',
                  borderRadius: '8px', border: newTicketType === 'WRONG_PAYMENT' ? '2px solid #1a73e8' : '1px solid #ccc',
                  cursor: 'pointer'
                }}>
                  <input
                    type="radio"
                    name="newTicketType"
                    value="WRONG_PAYMENT"
                    checked={newTicketType === 'WRONG_PAYMENT'}
                    onChange={() => setNewTicketType('WRONG_PAYMENT')}
                  />
                  Others (Wrong Payment)
                </label>
              </div>
            </div>

            <textarea
              placeholder="Remarks - tell us what happened"
              value={newTicketReason}
              onChange={(event) => setNewTicketReason(event.target.value)}
              rows={3}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #ccc', resize: 'vertical' }}
            />

            <button
              type="button"
              className="primary-btn"
              disabled={raising}
              onClick={handleRaiseTicket}
              style={{ marginTop: '0.6rem', borderRadius: '8px', width: 'auto', whiteSpace: 'nowrap' }}
            >
              {raising ? 'Submitting...' : 'Raise a ticket'}
            </button>
          </div>
        )}
        {raiseError && <p className="error-msg">{raiseError}</p>}
      </section>

      <section className="premium-card" aria-label="Refund ticket history">
        <div className="receipt-section-title">Your refund tickets</div>

        <div className="history-status-filter" style={{ marginBottom: '1rem' }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? 'active' : ''}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && <p>Loading refund history...</p>}
        {error && <p className="error-msg">{error}</p>}
        {!loading && visible.length === 0 && <p>No refund tickets in this view.</p>}

        {!loading && visible.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--c-n-100)' }}>
              <th style={{ padding: '0.5rem' }}>Payment Ref</th>
              <th style={{ padding: '0.5rem' }}>Amount</th>
              <th style={{ padding: '0.5rem' }}>Type</th>
              <th style={{ padding: '0.5rem' }}>Reason</th>
              <th style={{ padding: '0.5rem' }}>Requested</th>
              <th style={{ padding: '0.5rem' }}>Status</th>
              <th style={{ padding: '0.5rem' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((ticket) => (
              <tr key={ticket.requestId} style={{ borderBottom: '1px solid var(--c-n-100)' }}>
                <td style={{ padding: '0.5rem' }}>{ticket.referenceNumber}</td>
                <td style={{ padding: '0.5rem' }}>{currency ? currency(ticket.amount, ticket.currency) : `${ticket.currency} ${ticket.amount}`}</td>
                <td style={{ padding: '0.5rem' }}>{typeLabel(ticket.type)}</td>
                <td style={{ padding: '0.5rem' }}>{ticket.reason || '—'}</td>
                <td style={{ padding: '0.5rem' }}>{ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : '—'}</td>
                <td style={{ padding: '0.5rem' }}>
                  <span className={`status-pill ${statusClassName(ticket.displayStatus)}`}>{ticket.displayStatus}</span>
                </td>
                <td style={{ padding: '0.5rem' }}>
                  {ticket.displayStatus === 'REJECTED' ? (ticket.rejectionReason || 'No reason given') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </section>
    </div>
  );
}

export default RefundHistory;
