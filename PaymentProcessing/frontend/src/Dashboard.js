import { useEffect, useMemo, useState } from 'react';
import './Dashboard.css';
import { apiRequest } from './services/api';
import SupportChatbot from './SupportChatbot';

const initialFormState = {
  sourceAccountId: '',
  destinationAccountId: '',
  amount: '',
  currency: 'INR',
  referenceNumber: '',
  remarks: ''
};

function currency(amount) {
  const value = Number(amount || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
}

function formatDateTime(input) {
  if (!input) {
    return 'N/A';
  }

  const date = new Date(input);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getPaymentCategory(payment) {
  const text = `${payment.remarks || ''} ${payment.referenceNumber || ''}`.toLowerCase();
  if (text.includes('bill')) return 'Bill Payments';
  if (text.includes('shop') || text.includes('amazon') || text.includes('purchase')) return 'Shopping';
  if (text.includes('movie') || text.includes('netflix') || text.includes('entertain')) return 'Entertainment';
  return 'UPI Payments';
}

function classifyTransaction(payment) {
  const status = String(payment.status || '').toUpperCase();
  if (status === 'FAILED') {
    return { sign: '-', className: '' };
  }
  if (status === 'COMPLETED') {
    return { sign: '-', className: '' };
  }
  return { sign: '-', className: '' };
}

function Dashboard() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('This Month');
  const [activeModal, setActiveModal] = useState('');
  const [formState, setFormState] = useState(initialFormState);
  const [scheduleDate, setScheduleDate] = useState('');
  const [groupSplit, setGroupSplit] = useState({ amount: '', members: '' });
  const [toast, setToast] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isSupportChatOpen, setIsSupportChatOpen] = useState(false);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  };

  const loadPayments = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/payments');
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load payments');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const searchedPayments = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      return payments;
    }
    return payments.filter((payment) => {
      const haystack = `${payment.paymentId} ${payment.referenceNumber || ''} ${payment.remarks || ''} ${payment.sourceAccountId || ''} ${payment.destinationAccountId || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [payments, searchText]);

  const recentPayments = useMemo(() => {
    return [...searchedPayments]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5);
  }, [searchedPayments]);

  const upcomingPayments = useMemo(() => {
    return payments
      .filter((payment) => String(payment.remarks || '').includes('[Scheduled:'))
      .slice(0, 2);
  }, [payments]);

  const spendingStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const previousMonth = (currentMonth + 11) % 12;

    const activeMonth = selectedMonth === 'Last Month' ? previousMonth : currentMonth;
    const filtered = payments.filter((payment) => {
      const date = new Date(payment.createdAt || Date.now());
      return date.getMonth() === activeMonth;
    });

    const categoryTotals = {
      'UPI Payments': 0,
      'Bill Payments': 0,
      Shopping: 0,
      Entertainment: 0,
      Others: 0
    };

    for (const payment of filtered) {
      const amount = Number(payment.amount || 0);
      const category = getPaymentCategory(payment);
      if (categoryTotals[category] !== undefined) {
        categoryTotals[category] += amount;
      } else {
        categoryTotals.Others += amount;
      }
    }

    const total = Object.values(categoryTotals).reduce((sum, value) => sum + value, 0);
    const baseline = total > 0 ? total : 1;

    return {
      total,
      items: [
        { label: 'UPI Payments', amount: categoryTotals['UPI Payments'], pct: Math.round((categoryTotals['UPI Payments'] / baseline) * 100) },
        { label: 'Bill Payments', amount: categoryTotals['Bill Payments'], pct: Math.round((categoryTotals['Bill Payments'] / baseline) * 100) },
        { label: 'Shopping', amount: categoryTotals.Shopping, pct: Math.round((categoryTotals.Shopping / baseline) * 100) },
        { label: 'Entertainment', amount: categoryTotals.Entertainment, pct: Math.round((categoryTotals.Entertainment / baseline) * 100) },
        { label: 'Others', amount: categoryTotals.Others, pct: Math.round((categoryTotals.Others / baseline) * 100) }
      ]
    };
  }, [payments, selectedMonth]);

  const handleQuickAction = (action) => {
    if (action === 'account') {
      showToast('Account details panel coming next.');
      return;
    }
    if (action === 'makePayment') {
      setActiveModal('payment');
      return;
    }
    if (action === 'checkBalance') {
      const totalOut = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      showToast(`Total payments tracked: ${currency(totalOut)}`);
      return;
    }
    if (action === 'schedulePayment') {
      setActiveModal('schedule');
      return;
    }
    if (action === 'groupSplit') {
      setActiveModal('groupSplit');
    }
  };

  const closeModal = () => {
    setActiveModal('');
    setFormState(initialFormState);
    setScheduleDate('');
    setGroupSplit({ amount: '', members: '' });
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const createPayment = async (mode) => {
    setSubmitting(true);
    try {
      let remarks = formState.remarks;
      if (mode === 'schedule' && scheduleDate) {
        remarks = `${remarks || ''} [Scheduled:${scheduleDate}]`.trim();
      }
      const payload = {
        sourceAccountId: Number(formState.sourceAccountId),
        destinationAccountId: Number(formState.destinationAccountId),
        amount: Number(formState.amount),
        currency: formState.currency || 'INR',
        referenceNumber: formState.referenceNumber,
        remarks
      };
      await apiRequest('/payments', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast(mode === 'schedule' ? 'Payment scheduled.' : 'Payment created.');
      closeModal();
      await loadPayments();
    } catch (err) {
      setError(err.message || 'Failed to submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  const perHead = useMemo(() => {
    const amount = Number(groupSplit.amount || 0);
    const members = Number(groupSplit.members || 0);
    if (!amount || !members) return 0;
    return amount / members;
  }, [groupSplit]);

  const donutStyle = useMemo(() => {
    const values = spendingStats.items.map((item) => item.pct);
    const a = values[0];
    const b = a + values[1];
    const c = b + values[2];
    const d = c + values[3];
    return {
      background: `conic-gradient(#4762ff 0% ${a}%, #7c57ff ${a}% ${b}%, #ff8a24 ${b}% ${c}%, #f7aa2a ${c}% ${d}%, #697499 ${d}% 100%)`
    };
  }, [spendingStats]);

  return (
    <div className="smartpay-app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">S</div>
          <span>Tallyn</span>
        </div>

        <nav className="menu">
          <button className="menu-item active">Dashboard</button>
          <button className="menu-item">Payments</button>
          <button className="menu-item">Transactions</button>
          <button className="menu-item">Beneficiaries</button>
          <button className="menu-item">Analytics</button>
          <button className="menu-item">Rewards</button>
          <button className="menu-item">Settings</button>
        </nav>

        <div className="invite-card">
          <h4>Invite &amp; Earn</h4>
          <p>Invite your friends and earn exciting rewards</p>
          <button>Invite Now</button>
        </div>

        <div
          className="support"
          role="button"
          tabIndex={0}
          onClick={() => setIsSupportChatOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setIsSupportChatOpen(true);
            }
          }}
        >
          <span className="support-icon">🎧</span>
          <div>
            <div className="support-title">Need Help?</div>
            <div className="support-subtitle">24/7 Support</div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="search-wrap">
            <span className="search-icon">⌕</span>
            <input
              placeholder="Search by name, payment ID, account..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
            <kbd>Ctrl K</kbd>
          </div>

          <div className="top-right">
            <div className="icon-btn">🔔<span className="badge">3</span></div>
            <div className="icon-btn">💬</div>
            <div className="profile">
              <div className="avatar">SG</div>
              <div>
                <div className="name">Soumitha G</div>
                <div className="plan">Premium Member</div>
              </div>
            </div>
          </div>
        </header>

        <section className="hero-head">
          <h1>Good Morning, Soumitha! 👋</h1>
          <p>Here&apos;s what&apos;s happening with your account today.</p>
        </section>

        <section className="top-grid">
          <article className="quick-actions card">
            <div className="card-title-row">
              <h3>Quick Actions</h3>
              <button className="link-btn">Customize</button>
            </div>
            <div className="actions-grid">
              <button className="action action-btn a1" onClick={() => handleQuickAction('account')}>👤<span>Account</span></button>
              <button className="action action-btn a2" onClick={() => handleQuickAction('makePayment')}>💸<span>Make Payment</span></button>
              <button className="action action-btn a3" onClick={() => handleQuickAction('checkBalance')}>👁<span>Check Balance</span></button>
              <button className="action action-btn a4" onClick={() => handleQuickAction('schedulePayment')}>📅<span>Schedule Payment</span></button>
              <button className="action action-btn a5" onClick={() => handleQuickAction('groupSplit')}>👥<span>Group Split</span></button>
            </div>
          </article>
        </section>

        <section className="middle-grid">
          <article className="card">
            <div className="card-title-row">
              <h3>Recent Transactions</h3>
              <button className="link-btn">View All</button>
            </div>

            {loading && <p className="empty-note">Loading payments...</p>}
            {!loading && error && <p className="empty-note error-note">{error}</p>}
            {!loading && !error && recentPayments.length === 0 && <p className="empty-note">No payments found.</p>}

            {!loading && !error && recentPayments.length > 0 && (
              <div className="tx-list">
                {recentPayments.map((payment) => {
                  const txType = classifyTransaction(payment);
                  return (
                    <div className="tx-row" key={payment.paymentId}>
                      <span>
                        Ref {payment.referenceNumber || `PAY-${payment.paymentId}`}
                        <br />
                        <small>{payment.status} • {formatDateTime(payment.createdAt)}</small>
                      </span>
                      <strong className={txType.className}>{txType.sign} {currency(payment.amount)}</strong>
                    </div>
                  );
                })}
              </div>
            )}

            <button className="view-more">View All Transactions →</button>
          </article>

          <article className="card">
            <div className="card-title-row">
              <h3>Spending Overview</h3>
              <select className="month-btn" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
                <option>This Month</option>
                <option>Last Month</option>
              </select>
            </div>

            <div className="spend-row">
              <div className="donut-wrap">
                <div className="donut" style={donutStyle}>
                  <div className="donut-center">
                    <small>Total Spent</small>
                    <strong>{currency(spendingStats.total)}</strong>
                  </div>
                </div>
              </div>

              <ul className="legend">
                {spendingStats.items.map((item, index) => (
                  <li key={item.label}>
                    <span className={`dot d${index + 1}`} /> {item.label}
                    <span className="legend-pct">{item.pct}%</span>
                    <b>{currency(item.amount)}</b>
                  </li>
                ))}
              </ul>
            </div>

            <div className="insight">You can compare month-wise spending using the selector above.</div>
          </article>
        </section>

        <section className="bottom-grid">
          <article className="card">
            <div className="card-title-row">
              <h3>Upcoming Payments</h3>
              <button className="link-btn">View All</button>
            </div>
            {upcomingPayments.length === 0 && <p className="empty-note">No scheduled payments yet.</p>}
            {upcomingPayments.map((payment) => (
              <div className="tx-row" key={`up-${payment.paymentId}`}>
                <span>
                  {payment.referenceNumber || `PAY-${payment.paymentId}`}
                  <br />
                  <small>{payment.remarks}</small>
                </span>
                <strong>{currency(payment.amount)}</strong>
              </div>
            ))}
          </article>

          <article className="promo-card">
            <h3>Send money instantly</h3>
            <p>Anytime, anywhere with Tallyn</p>
            <button>Make a Payment →</button>
          </article>
        </section>

        {toast && <div className="toast-msg">{toast}</div>}

        {activeModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-card" onClick={(event) => event.stopPropagation()}>
              {activeModal !== 'groupSplit' && (
                <>
                  <h3>{activeModal === 'payment' ? 'Make Payment' : 'Schedule Payment'}</h3>
                  <div className="form-grid">
                    <input name="sourceAccountId" placeholder="Source Account ID" value={formState.sourceAccountId} onChange={handleFormChange} />
                    <input name="destinationAccountId" placeholder="Destination Account ID" value={formState.destinationAccountId} onChange={handleFormChange} />
                    <input name="amount" placeholder="Amount" type="number" value={formState.amount} onChange={handleFormChange} />
                    <input name="currency" placeholder="Currency" value={formState.currency} onChange={handleFormChange} />
                    <input name="referenceNumber" placeholder="Reference Number" value={formState.referenceNumber} onChange={handleFormChange} />
                    <input name="remarks" placeholder="Remarks" value={formState.remarks} onChange={handleFormChange} />
                    {activeModal === 'schedule' && (
                      <input type="date" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} />
                    )}
                  </div>
                  <div className="modal-actions">
                    <button className="secondary-btn" onClick={closeModal}>Cancel</button>
                    <button className="primary-btn" disabled={submitting} onClick={() => createPayment(activeModal)}>
                      {submitting ? 'Submitting...' : activeModal === 'payment' ? 'Create Payment' : 'Schedule'}
                    </button>
                  </div>
                </>
              )}

              {activeModal === 'groupSplit' && (
                <>
                  <h3>Group Split</h3>
                  <div className="form-grid">
                    <input
                      type="number"
                      placeholder="Total Amount"
                      value={groupSplit.amount}
                      onChange={(event) => setGroupSplit((prev) => ({ ...prev, amount: event.target.value }))}
                    />
                    <input
                      type="number"
                      placeholder="Number of People"
                      value={groupSplit.members}
                      onChange={(event) => setGroupSplit((prev) => ({ ...prev, members: event.target.value }))}
                    />
                  </div>
                  <p className="split-result">Per person: <strong>{currency(perHead)}</strong></p>
                  <div className="modal-actions">
                    <button className="secondary-btn" onClick={closeModal}>Close</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      <SupportChatbot isOpen={isSupportChatOpen} onClose={() => setIsSupportChatOpen(false)} hideFab />
    </div>
  );
}

export default Dashboard;
