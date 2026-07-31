import { useEffect, useMemo, useState } from 'react';
import {
  FiBell,
  FiCalendar,
  FiEye,
  FiLock,
  FiMoon,
  FiSearch,
  FiSun,
  FiUser,
  FiUsers
} from 'react-icons/fi';
import { MdOutlinePayments } from 'react-icons/md';
import './Dashboard.css';
import PaymentJourney from './components/PaymentJourney';
import { apiRequest } from './services/api';
import SupportChatbot from './SupportChatbot';
import { initialFormState, languageOptions, translations } from './dashboardContent';

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
  if (status === 'FAILED' || status === 'COMPLETED') {
    return { sign: '-', className: '' };
  }
  return { sign: '-', className: '' };
}

function Dashboard() {
  const supportedBanks = ['HDFC BANK', 'ICICI BANK', 'STATE BANK OF INDIA', 'AXIS BANK'];

  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('en');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('This Month');
  const [activeModal, setActiveModal] = useState('');
  const [paymentJourneyOpen, setPaymentJourneyOpen] = useState(false);
  const [paymentJourneyStep, setPaymentJourneyStep] = useState('method');
  const [paymentJourneyMethod, setPaymentJourneyMethod] = useState('bank');
  const [formState, setFormState] = useState(initialFormState);
  const [scheduleDate, setScheduleDate] = useState('');
  const [groupSplit, setGroupSplit] = useState({ amount: '', members: '' });
  const [toast, setToast] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isSupportChatOpen, setIsSupportChatOpen] = useState(false);
  const [journeyPaymentId, setJourneyPaymentId] = useState(null);
  const [accountMode, setAccountMode] = useState('simulate');
  const [accountStep, setAccountStep] = useState('entry');
  const [accountSubmitting, setAccountSubmitting] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [createdAccount, setCreatedAccount] = useState(null);
  const [accountForm, setAccountForm] = useState({
    bankName: 'HDFC BANK',
    mobileNumber: '',
    accountHolderName: '',
    currency: 'INR',
    tpin: '',
    confirmTpin: ''
  });

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('dashboard-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
    }

    const savedLanguage = window.localStorage.getItem('dashboard-language');
    if (savedLanguage && translations[savedLanguage]) {
      setLanguage(savedLanguage);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    window.localStorage.setItem('dashboard-theme', nextTheme);
  };

  const handleLanguageChange = (event) => {
    const nextLanguage = event.target.value;
    setLanguage(nextLanguage);
    window.localStorage.setItem('dashboard-language', nextLanguage);
  };

  const t = (key) => translations[language][key] || translations.en[key] || key;

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
    return payments.filter((payment) => String(payment.remarks || '').includes('[Scheduled:')).slice(0, 2);
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

  const openPaymentJourney = () => {
    setPaymentJourneyOpen(true);
    setPaymentJourneyStep('method');
    setPaymentJourneyMethod('bank');
    setJourneyPaymentId(null);
    setActiveModal('');
    setError('');
  };

  const closePaymentJourney = () => {
    setPaymentJourneyOpen(false);
    setPaymentJourneyStep('method');
    setPaymentJourneyMethod('bank');
    setJourneyPaymentId(null);
    setFormState(initialFormState);
    setError('');
  };

  const handleQuickAction = (action) => {
    if (action === 'account') {
      openAccountFlow();
      return;
    }
    if (action === 'makePayment') {
      openPaymentJourney();
      return;
    }
    if (action === 'checkBalance') {
      const totalOut = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      showToast(`${t('totalTracked')} ${currency(totalOut)}`);
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
    setAccountError('');
    setAccountSubmitting(false);
    setAccountStep('entry');
    setCreatedAccount(null);
    setAccountForm({
      bankName: 'HDFC BANK',
      mobileNumber: '',
      accountHolderName: '',
      currency: 'INR',
      tpin: '',
      confirmTpin: ''
    });
  };

  const openAccountFlow = () => {
    setActiveModal('account');
    setAccountMode('simulate');
    setAccountStep('entry');
    setCreatedAccount(null);
    setAccountError('');
    setAccountSubmitting(false);
    setAccountForm({
      bankName: 'HDFC BANK',
      mobileNumber: '',
      accountHolderName: '',
      currency: 'INR',
      tpin: '',
      confirmTpin: ''
    });
  };

  const handleAccountFormChange = (event) => {
    const { name, value } = event.target;
    setAccountForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateMobile = (mobileNumber) => /^\d{10}$/.test(String(mobileNumber || '').trim());

  const submitAccountEntry = async () => {
    setAccountError('');

    if (!validateMobile(accountForm.mobileNumber)) {
      setAccountError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setAccountSubmitting(true);
    try {
      if (accountMode === 'simulate') {
        const payload = {
          bank_name: accountForm.bankName,
          mobile_number: accountForm.mobileNumber.trim(),
          account_holder_name: accountForm.accountHolderName.trim() || undefined,
          currency: accountForm.currency.trim() || 'INR'
        };

        const account = await apiRequest('/accounts/simulate', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        setCreatedAccount(account);
        setAccountStep('tpin');
        showToast('Account simulated. Set TPIN now or skip.');
        return;
      }

      if (!/^\d{6}$/.test(String(accountForm.tpin || '').trim())) {
        setAccountError('TPIN must be exactly 6 digits.');
        return;
      }
      if (String(accountForm.tpin || '').trim() !== String(accountForm.confirmTpin || '').trim()) {
        setAccountError('TPIN and Confirm TPIN must match.');
        return;
      }

      const activated = await apiRequest('/accounts/activate', {
        method: 'POST',
        body: JSON.stringify({
          bank_name: accountForm.bankName,
          mobile_number: accountForm.mobileNumber.trim(),
          tpin: accountForm.tpin.trim(),
          confirm_tpin: accountForm.confirmTpin.trim()
        })
      });

      setCreatedAccount(activated);
      setAccountStep('done');
      showToast('Existing account activated successfully.');
    } catch (err) {
      setAccountError(err.message || 'Unable to process account request.');
    } finally {
      setAccountSubmitting(false);
    }
  };

  const submitCreatedAccountTpin = async () => {
    setAccountError('');

    if (!createdAccount?.accountId) {
      setAccountError('Missing account reference. Please retry.');
      return;
    }
    if (!/^\d{6}$/.test(String(accountForm.tpin || '').trim())) {
      setAccountError('TPIN must be exactly 6 digits.');
      return;
    }
    if (String(accountForm.tpin || '').trim() !== String(accountForm.confirmTpin || '').trim()) {
      setAccountError('TPIN and Confirm TPIN must match.');
      return;
    }

    setAccountSubmitting(true);
    try {
      const updated = await apiRequest(`/accounts/${createdAccount.accountId}/tpin`, {
        method: 'POST',
        body: JSON.stringify({
          tpin: accountForm.tpin.trim(),
          confirm_tpin: accountForm.confirmTpin.trim()
        })
      });

      setCreatedAccount(updated);
      setAccountStep('done');
      showToast('TPIN set. Account is now ACTIVE.');
    } catch (err) {
      setAccountError(err.message || 'Unable to set TPIN.');
    } finally {
      setAccountSubmitting(false);
    }
  };

  const skipCreatedAccountTpin = () => {
    setAccountStep('done');
    showToast('TPIN skipped. Account remains INACTIVE.');
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

      const sourceAccountId = Number(formState.sourceAccountId);
      const destinationAccountId = Number(formState.destinationAccountId);
      const amount = Number(formState.amount);
      const referenceNumber = (formState.referenceNumber || formState.reference || '').trim() || `REF${Date.now()}`;

      if (!Number.isInteger(sourceAccountId) || !Number.isInteger(destinationAccountId)) {
        setError('Source and Destination must be numeric account IDs (example: 1, 2).');
        return false;
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        setError('Amount must be greater than 0.');
        return false;
      }

      const payload = {
        sourceAccountId,
        destinationAccountId,
        amount,
        currency: formState.currency || 'INR',
        referenceNumber,
        remarks
      };
      const createdPayment = await apiRequest('/payments', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setFormState((prev) => ({ ...prev, referenceNumber }));
      if (mode === 'payment' && createdPayment?.paymentId) {
        setJourneyPaymentId(createdPayment.paymentId);
      }
      showToast(mode === 'schedule' ? t('paymentScheduled') : t('paymentCreated'));
      await loadPayments();
      return true;
    } catch (err) {
      setError(err.message || 'Failed to submit payment');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const updatePaymentStatus = async (paymentId, status, remarks) => {
    return apiRequest(`/payments/${paymentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, remarks })
    });
  };

  const runJourneyStatusUpdate = async (status, remarks) => {
    if (!journeyPaymentId) {
      setError('Payment ID not found. Please retry.');
      return false;
    }

    try {
      await updatePaymentStatus(journeyPaymentId, status, remarks);
      setError('');
      return true;
    } catch (err) {
      setError(err.message || `Failed to move payment to ${status}`);
      return false;
    }
  };

  const validateJourneyPayment = () => runJourneyStatusUpdate('VALIDATED', 'Validated via UI flow');

  const processJourneyPayment = () => runJourneyStatusUpdate('PROCESSING', 'Processing via UI flow');

  const settleJourneyPayment = async () => {
    const ok = await runJourneyStatusUpdate('COMPLETED', 'Completed via UI flow');
    if (ok) {
      await loadPayments();
    }
    return ok;
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
    <div className={`smartpay-app ${theme === 'dark' ? 'dark-theme' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">S</div>
          <span>{t('appName')}</span>
        </div>

        <nav className="menu">
          <button className="menu-item active">{t('dashboard')}</button>
          <button className="menu-item">{t('payments')}</button>
          <button className="menu-item">{t('transactions')}</button>
          <button className="menu-item">{t('beneficiaries')}</button>
          <button className="menu-item">Analytics</button>
          <button className="menu-item">Rewards</button>
          <button className="menu-item">Settings</button>
        </nav>

        <div className="invite-card">
          <h4>{t('inviteTitle')}</h4>
          <p>{t('inviteText')}</p>
          <button>{t('inviteButton')}</button>
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
          <span className="support-icon"><FiLifeBuoy /></span>
          <div>
            <div className="support-title">{t('needHelp')}</div>
            <div className="support-subtitle">{t('support')}</div>
          </div>
        </div>
      </aside>

      <main className={`main-content ${paymentJourneyOpen ? 'journey-mode' : ''}`}>
        {paymentJourneyOpen && (
          <PaymentJourney
            step={paymentJourneyStep}
            method={paymentJourneyMethod}
            setMethod={setPaymentJourneyMethod}
            formState={formState}
            setFormState={setFormState}
            paymentId={journeyPaymentId}
            currency={currency}
            onClose={closePaymentJourney}
            onAuthorize={() => createPayment('payment')}
            onValidate={validateJourneyPayment}
            onProcessStatus={processJourneyPayment}
            onSettle={settleJourneyPayment}
            submitting={submitting}
            t={t}
            errorMessage={error}
            payments={payments}
            selectedDestination={formState.destinationAccountId || 'Not added yet'}
            selectedAmount={formState.amount || '0'}
            onStepChange={setPaymentJourneyStep}
          />
        )}

        {!paymentJourneyOpen && (
          <>
            <header className="topbar">
              <div className="search-wrap">
                <span className="search-icon"><FiSearch /></span>
                <input placeholder={t('searchPlaceholder')} value={searchText} onChange={(event) => setSearchText(event.target.value)} />
                <kbd>Ctrl K</kbd>
              </div>

              <div className="top-right">
                <div className="icon-btn"><FiBell /><span className="badge">3</span></div>
                <button className="icon-btn theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
                  {theme === 'light' ? <FiMoon /> : <FiSun />}
                </button>
                <select className="lang-select" value={language} onChange={handleLanguageChange} aria-label="Language selector">
                  {languageOptions.map((option) => (
                    <option key={option.code} value={option.code}>{option.label}</option>
                  ))}
                </select>
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
              <h1>{t('greeting')}</h1>
              <p>{t('greetingSub')}</p>
            </section>

            <section className="top-grid">
              <article className="quick-actions card">
                <div className="card-title-row">
                  <h3>{t('quickActions')}</h3>
                  <button className="link-btn">{t('customize')}</button>
                </div>
                <div className="actions-grid">
                  <button className="action action-btn a1" onClick={() => handleQuickAction('account')}>
                    <span className="action-icon"><FiUser /></span>
                    <span className="action-label">{t('account')}</span>
                  </button>
                  <button className="action action-btn a2" onClick={() => handleQuickAction('makePayment')}>
                    <span className="action-icon"><MdOutlinePayments /></span>
                    <span className="action-label">{t('makePayment')}</span>
                  </button>
                  <button className="action action-btn a3" onClick={() => handleQuickAction('checkBalance')}>
                    <span className="action-icon"><FiEye /></span>
                    <span className="action-label">{t('checkBalance')}</span>
                  </button>
                  <button className="action action-btn a4" onClick={() => handleQuickAction('schedulePayment')}>
                    <span className="action-icon"><FiCalendar /></span>
                    <span className="action-label">{t('schedulePayment')}</span>
                  </button>
                  <button className="action action-btn a5" onClick={() => handleQuickAction('groupSplit')}>
                    <span className="action-icon"><FiUsers /></span>
                    <span className="action-label">{t('groupSplit')}</span>
                  </button>
                </div>
              </article>
            </section>

            <section className="middle-grid">
              <article className="card">
                <div className="card-title-row">
                  <h3>{t('recentTransactions')}</h3>
                  <button className="link-btn">{t('viewAll')}</button>
                </div>

                {loading && <p className="empty-note">{t('loadingPayments')}</p>}
                {!loading && error && <p className="empty-note error-note">{error}</p>}
                {!loading && !error && recentPayments.length === 0 && <p className="empty-note">{t('noPayments')}</p>}

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

                <button className="view-more">{t('viewAll')} →</button>
              </article>

              <article className="card">
                <div className="card-title-row">
                  <h3>{t('spendingOverview')}</h3>
                  <select className="month-btn" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
                    <option>{t('thisMonth')}</option>
                    <option>{t('lastMonth')}</option>
                  </select>
                </div>

                <div className="spend-row">
                  <div className="donut-wrap">
                    <div className="donut" style={donutStyle} role="img" aria-label={`${t('totalSpent')}: ${currency(spendingStats.total)}`}>
                      <div className="donut-center">
                        <small>{t('totalSpent')}</small>
                        <strong>{currency(spendingStats.total)}</strong>
                      </div>
                    </div>
                    <span className="donut-caption">{selectedMonth}</span>
                  </div>

                  <div className="spend-breakdown" aria-label="Spending categories">
                    {spendingStats.items.map((item, index) => (
                      <div className="spend-category" key={item.label}>
                        <div className="spend-category-head">
                          <span className="spend-category-name"><span className={`dot d${index + 1}`} /> {item.label}</span>
                          <b>{currency(item.amount)}</b>
                        </div>
                        <div className="spend-progress" aria-hidden="true">
                          <span className={`spend-progress-fill d${index + 1}`} style={{ width: `${item.pct}%` }} />
                        </div>
                        <span className="legend-pct">{item.pct}% of spending</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="insight">{t('insight')}</div>
              </article>
            </section>

            <section className="bottom-grid">
              <article className="card">
                <div className="card-title-row">
                  <h3>{t('upcomingPayments')}</h3>
                  <button className="link-btn">{t('viewAll')}</button>
                </div>
                {upcomingPayments.length === 0 && <p className="empty-note">{t('noScheduled')}</p>}
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
                <h3>{t('sendMoney')}</h3>
                <p>{t('sendMoneySub')}</p>
                <button onClick={openPaymentJourney}>{t('payNow')} →</button>
              </article>
            </section>
          </>
        )}

        {toast && <div className="toast-msg">{toast}</div>}

        {activeModal === 'schedule' && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-card" onClick={(event) => event.stopPropagation()}>
              <h3>{t('schedulePaymentTitle')}</h3>
              <div className="form-grid">
                <input name="sourceAccountId" placeholder={t('sourceAccount')} value={formState.sourceAccountId} onChange={handleFormChange} />
                <input name="destinationAccountId" placeholder={t('destinationAccount')} value={formState.destinationAccountId} onChange={handleFormChange} />
                <input name="amount" placeholder={t('amount')} type="number" value={formState.amount} onChange={handleFormChange} />
                <input name="currency" placeholder={t('currency')} value={formState.currency} onChange={handleFormChange} />
                <input name="referenceNumber" placeholder={t('reference')} value={formState.referenceNumber} onChange={handleFormChange} />
                <input name="remarks" placeholder={t('remarks')} value={formState.remarks} onChange={handleFormChange} />
                <input type="date" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} />
              </div>
              <div className="modal-actions">
                <button className="secondary-btn" onClick={closeModal}>{t('reset')}</button>
                <button className="primary-btn" disabled={submitting} onClick={() => createPayment('schedule')}>
                  {submitting ? t('processing') : t('submitSchedule')}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeModal === 'groupSplit' && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-card" onClick={(event) => event.stopPropagation()}>
              <h3>{t('groupSplit')}</h3>
              <div className="form-grid">
                <input
                  type="number"
                  placeholder={t('totalAmount')}
                  value={groupSplit.amount}
                  onChange={(event) => setGroupSplit((prev) => ({ ...prev, amount: event.target.value }))}
                />
                <input
                  type="number"
                  placeholder={t('numberOfPeople')}
                  value={groupSplit.members}
                  onChange={(event) => setGroupSplit((prev) => ({ ...prev, members: event.target.value }))}
                />
              </div>
              <p className="split-result">{t('perPerson')}: <strong>{currency(perHead)}</strong></p>
              <div className="modal-actions">
                <button className="secondary-btn" onClick={closeModal}>{t('close')}</button>
              </div>
            </div>
          </div>
        )}

        {activeModal === 'account' && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-card account-modal" onClick={(event) => event.stopPropagation()}>
              <div className="card-title-row account-modal-head">
                <h3>Add / Activate Account</h3>
                <div className="account-mode-toggle">
                  <button
                    type="button"
                    className={`mode-btn ${accountMode === 'simulate' ? 'active' : ''}`}
                    onClick={() => {
                      setAccountMode('simulate');
                      setAccountError('');
                      setAccountStep('entry');
                    }}
                  >
                    Add New
                  </button>
                  <button
                    type="button"
                    className={`mode-btn ${accountMode === 'activate' ? 'active' : ''}`}
                    onClick={() => {
                      setAccountMode('activate');
                      setAccountError('');
                      setAccountStep('entry');
                    }}
                  >
                    Activate Existing
                  </button>
                </div>
              </div>

              {accountStep === 'entry' && (
                <>
                  <div className="form-grid">
                    <label className="field-col">
                      <span>Bank</span>
                      <select name="bankName" value={accountForm.bankName} onChange={handleAccountFormChange}>
                        {supportedBanks.map((bank) => (
                          <option key={bank} value={bank}>{bank}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field-col">
                      <span>Mobile Number</span>
                      <input
                        name="mobileNumber"
                        placeholder="10-digit mobile"
                        value={accountForm.mobileNumber}
                        onChange={handleAccountFormChange}
                      />
                    </label>

                    {accountMode === 'simulate' && (
                      <>
                        <label className="field-col">
                          <span>Account Holder Name (Optional)</span>
                          <input
                            name="accountHolderName"
                            placeholder="Full name"
                            value={accountForm.accountHolderName}
                            onChange={handleAccountFormChange}
                          />
                        </label>
                        <label className="field-col">
                          <span>Currency</span>
                          <input
                            name="currency"
                            placeholder="INR"
                            value={accountForm.currency}
                            onChange={handleAccountFormChange}
                          />
                        </label>
                      </>
                    )}

                    {accountMode === 'activate' && (
                      <>
                        <label className="field-col">
                          <span>TPIN</span>
                          <input
                            name="tpin"
                            type="password"
                            placeholder="6-digit TPIN"
                            value={accountForm.tpin}
                            onChange={handleAccountFormChange}
                          />
                        </label>
                        <label className="field-col">
                          <span>Confirm TPIN</span>
                          <input
                            name="confirmTpin"
                            type="password"
                            placeholder="Re-enter TPIN"
                            value={accountForm.confirmTpin}
                            onChange={handleAccountFormChange}
                          />
                        </label>
                      </>
                    )}
                  </div>

                  {accountError && <p className="empty-note error-note">{accountError}</p>}

                  <div className="modal-actions">
                    <button className="secondary-btn" onClick={closeModal}>Cancel</button>
                    <button className="primary-btn" onClick={submitAccountEntry} disabled={accountSubmitting}>
                      {accountSubmitting ? 'Processing...' : accountMode === 'simulate' ? 'Create Simulated Account' : 'Activate Account'}
                    </button>
                  </div>
                </>
              )}

              {accountStep === 'tpin' && (
                <>
                  <div className="account-created-summary">
                    <div><strong>Account Number:</strong> {createdAccount?.accountNumber}</div>
                    <div><strong>IFSC:</strong> {createdAccount?.ifscCode || 'N/A'}</div>
                    <div><strong>Status:</strong> {createdAccount?.status || 'INACTIVE'}</div>
                  </div>

                  <div className="tpin-strip"><FiLock /> Set TPIN now to activate your account.</div>

                  <div className="form-grid">
                    <label className="field-col">
                      <span>TPIN</span>
                      <input
                        name="tpin"
                        type="password"
                        placeholder="6-digit TPIN"
                        value={accountForm.tpin}
                        onChange={handleAccountFormChange}
                      />
                    </label>
                    <label className="field-col">
                      <span>Confirm TPIN</span>
                      <input
                        name="confirmTpin"
                        type="password"
                        placeholder="Re-enter TPIN"
                        value={accountForm.confirmTpin}
                        onChange={handleAccountFormChange}
                      />
                    </label>
                  </div>

                  {accountError && <p className="empty-note error-note">{accountError}</p>}

                  <div className="modal-actions">
                    <button className="secondary-btn" onClick={skipCreatedAccountTpin}>Skip For Now</button>
                    <button className="primary-btn" onClick={submitCreatedAccountTpin} disabled={accountSubmitting}>
                      {accountSubmitting ? 'Saving...' : 'Set TPIN & Activate'}
                    </button>
                  </div>
                </>
              )}

              {accountStep === 'done' && (
                <>
                  <div className="account-created-summary done">
                    <div><strong>Bank:</strong> {createdAccount?.bankName || accountForm.bankName}</div>
                    <div><strong>Mobile:</strong> {createdAccount?.mobileNumber || accountForm.mobileNumber}</div>
                    <div><strong>Account Number:</strong> {createdAccount?.accountNumber || 'N/A'}</div>
                    <div><strong>IFSC:</strong> {createdAccount?.ifscCode || 'N/A'}</div>
                    <div><strong>Status:</strong> {createdAccount?.status || 'INACTIVE'}</div>
                  </div>
                  <div className="modal-actions">
                    <button className="primary-btn" onClick={closeModal}>Done</button>
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
