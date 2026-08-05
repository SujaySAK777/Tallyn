import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiArrowLeft,
  FiBell,
  FiCalendar,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiCreditCard,
  FiEye,
  FiFileText,
  FiHash,
  FiLifeBuoy,
  FiLogOut,
  FiLock,
  FiMoon,
  FiRefreshCw,
  FiRepeat,
  FiSearch,
  FiShield,
  FiSun,
  FiUser,
  FiUsers
} from 'react-icons/fi';
import { MdOutlinePayments } from 'react-icons/md';
import './Dashboard.css';
import PaymentJourney from './components/PaymentJourney';
import CheckBalanceJourney from './components/CheckBalanceJourney';
import TransactionHistory from './components/TransactionHistory';
import Beneficiaries from './components/Beneficiaries';
import { apiRequest } from './services/api';
import SupportChatbot from './SupportChatbot';
import { initialFormState, languageOptions, translations } from './dashboardContent';

const HISTORY_STATUS_GROUPS = {
  COMPLETED: ['COMPLETED'],
  FAILED: ['FAILED'],
  PENDING: ['CREATED', 'VALIDATED', 'PROCESSING']
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

function getCancelledTransactionMatches(scheduledPayments, accounts, filters) {
  const { query, fromDate, toDate, minAmount, maxAmount, senderAccountId } = filters;
  const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
  const to = toDate ? new Date(`${toDate}T23:59:59`) : null;
  const min = minAmount ? Number(minAmount) : null;
  const max = maxAmount ? Number(maxAmount) : null;

  return scheduledPayments
    .filter((payment) => String(payment.status || '').toUpperCase() === 'CANCELLED')
    .map((payment) => ({
      paymentId: `sch-${payment.scheduledPaymentId}`,
      referenceNumber: payment.referenceNumber,
      status: 'CANCELLED',
      amount: payment.amount,
      currency: payment.currency,
      remarks: payment.remarks,
      sourceAccountId: payment.sourceAccountId,
      destinationAccountId: payment.destinationAccountId,
      createdAt: payment.updatedAt || payment.createdAt || payment.scheduledAt
    }))
    .filter((payment) => {
      const amount = Number(payment.amount || 0);
      const createdAt = payment.createdAt ? new Date(payment.createdAt) : null;

      if (query) {
        const receiver = accounts.find((account) => String(account.accountId) === String(payment.destinationAccountId));
        const haystack = `${payment.referenceNumber || ''} ${payment.remarks || ''} ${amount} ${receiver?.accountHolderName || ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (from && (!createdAt || createdAt < from)) return false;
      if (to && (!createdAt || createdAt > to)) return false;
      if (min !== null && amount < min) return false;
      if (max !== null && amount > max) return false;
      if (senderAccountId && senderAccountId !== 'All') {
        if (String(payment.sourceAccountId) !== String(senderAccountId)) return false;
      }
      return true;
    });
}

function getPaymentCategory(payment) {
  const text = `${payment.remarks || ''} ${payment.referenceNumber || ''}`.toLowerCase();
  if (text.includes('bill')) return 'Bill Payments';
  if (text.includes('shop') || text.includes('amazon') || text.includes('purchase')) return 'Shopping';
  if (text.includes('movie') || text.includes('netflix') || text.includes('entertain')) return 'Entertainment';
  return 'Others';
}

function classifyTransaction(payment) {
  const status = String(payment.status || '').toUpperCase();
  if (status === 'FAILED' || status === 'COMPLETED') {
    return { sign: '-', className: '' };
  }
  return { sign: '-', className: '' };
}

function Dashboard({ session, onLogout }) {
  const supportedBanks = ['HDFC BANK', 'ICICI BANK', 'STATE BANK OF INDIA', 'AXIS BANK'];

  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('en');
  const [payments, setPayments] = useState([]);
  const [scheduledPayments, setScheduledPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [recentFilter, setRecentFilter] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('This Month');
  const [activeModal, setActiveModal] = useState('');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState(null);
  const [historyFromDate, setHistoryFromDate] = useState('');
  const [historyToDate, setHistoryToDate] = useState('');
  const [historyMinAmount, setHistoryMinAmount] = useState('');
  const [historyMaxAmount, setHistoryMaxAmount] = useState('');
  const [historySenderAccountId, setHistorySenderAccountId] = useState('All');
  const [historySortDateEnabled, setHistorySortDateEnabled] = useState(true);
  const [historySortDateDir, setHistorySortDateDir] = useState('desc');
  const [historySortAmountEnabled, setHistorySortAmountEnabled] = useState(false);
  const [historySortAmountDir, setHistorySortAmountDir] = useState('desc');
  const [historySortPrimary, setHistorySortPrimary] = useState('date');
  const [historyPage, setHistoryPage] = useState(0);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [historyRefreshTick, setHistoryRefreshTick] = useState(0);
  const [historyResults, setHistoryResults] = useState([]);
  const [historyPagination, setHistoryPagination] = useState({ page: 0, size: 10, totalElements: 0, totalPages: 0 });
  const [historySummary, setHistorySummary] = useState({
    total: 0, completed: 0, failed: 0, pending: 0, cancelled: 0,
    totalAmount: 0, completedAmount: 0, failedAmount: 0, pendingAmount: 0, cancelledAmount: 0
  });
  const [scheduleStep, setScheduleStep] = useState('details');
  const [cancellingId, setCancellingId] = useState(null);
  const [paymentJourneyOpen, setPaymentJourneyOpen] = useState(false);
  const [balanceJourneyOpen, setBalanceJourneyOpen] = useState(false);
  const [balanceJourneyStep, setBalanceJourneyStep] = useState('accounts');
  const [paymentJourneyStep, setPaymentJourneyStep] = useState('method');
  const [paymentJourneyMethod, setPaymentJourneyMethod] = useState('bank');
  const [paymentJourneyOrigin, setPaymentJourneyOrigin] = useState('payment');
  const [formState, setFormState] = useState(initialFormState);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduledReceipt, setScheduledReceipt] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [beneficiariesLoading, setBeneficiariesLoading] = useState(false);
  const [scheduleLookupError, setScheduleLookupError] = useState('');
  const [groupSplit, setGroupSplit] = useState({
    amount: '',
    description: '',
    splitType: 'EQUAL',
    members: [{ accountNumber: '', amount: '' }, { accountNumber: '', amount: '' }]
  });
  const [groupSplitError, setGroupSplitError] = useState('');
  const [groupSplitSubmitting, setGroupSplitSubmitting] = useState(false);
  const [groupSplitNotifications, setGroupSplitNotifications] = useState([]);
  const [groupSplitHistory, setGroupSplitHistory] = useState([]);
  const [groupSplitCreated, setGroupSplitCreated] = useState([]);
  const [splitPromptQueue, setSplitPromptQueue] = useState([]);
  const [payingSplitId, setPayingSplitId] = useState(null);
  const [paySplitTpin, setPaySplitTpin] = useState('');
  const [paySplitError, setPaySplitError] = useState('');
  const [paySplitSubmitting, setPaySplitSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationWrapRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [isSupportChatOpen, setIsSupportChatOpen] = useState(false);
  const [journeyPaymentId, setJourneyPaymentId] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const customerName = [session?.firstName, session?.lastName].filter(Boolean).join(' ') || session?.email || 'Account holder';
  const customerInitials = customerName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const [accountMode, setAccountMode] = useState('simulate');
  const [accountStep, setAccountStep] = useState('entry');
  const [accountSubmitting, setAccountSubmitting] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [createdAccount, setCreatedAccount] = useState(null);
  const [balanceAccountNumber, setBalanceAccountNumber] = useState('');
  const [balanceTpin, setBalanceTpin] = useState('');
  const [balanceResult, setBalanceResult] = useState(null);
  const [balanceError, setBalanceError] = useState('');
  const [balanceSubmitting, setBalanceSubmitting] = useState(false);
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

  useEffect(() => {
    if (!notificationsOpen) {
      return;
    }
    const handleClickOutside = (event) => {
      if (notificationWrapRef.current && !notificationWrapRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationsOpen]);

  useEffect(() => {
    loadPayments();
    loadScheduledPayments();
    loadAccounts();
    loadGroupSplitNotifications();
    loadBeneficiaries();
    loadGroupSplitHistory();
    loadGroupSplitCreated();
    loadNotifications();

    const pollInterval = window.setInterval(() => {
      loadPayments({ silent: true });
      loadScheduledPayments();
      loadNotifications();
    }, 15000);

    return () => window.clearInterval(pollInterval);
  }, []);

  const updateGroupSplitMember = (index, field, value) => {
    setGroupSplit((prev) => {
      const members = [...prev.members];
      members[index] = { ...members[index], [field]: value };
      return { ...prev, members };
    });
  };

  const addGroupSplitMember = () => {
    setGroupSplit((prev) => ({ ...prev, members: [...prev.members, { accountNumber: '', amount: '' }] }));
  };

  const removeGroupSplitMember = (index) => {
    setGroupSplit((prev) => ({ ...prev, members: prev.members.filter((_, i) => i !== index) }));
  };

  const submitGroupSplit = async () => {
    setGroupSplitError('');
    setGroupSplitSubmitting(true);
    try {
      const payload = {
        amount: Number(groupSplit.amount || 0),
        description: groupSplit.description,
        split_type: groupSplit.splitType,
        members: groupSplit.members
          .filter((member) => member.accountNumber.trim())
          .map((member) => ({
            account_number: member.accountNumber.trim(),
            amount: groupSplit.splitType === 'UNEQUAL' ? Number(member.amount || 0) : undefined
          }))
      };
      await apiRequest('/group-splits', { method: 'POST', body: JSON.stringify(payload) });
      showToast(t('splitCreated'));
      setGroupSplit({ amount: '', description: '', splitType: 'EQUAL', members: [{ accountNumber: '', amount: '' }, { accountNumber: '', amount: '' }] });
      closeModal();
      loadGroupSplitHistory();
      loadGroupSplitCreated();
    } catch (err) {
      setGroupSplitError(err.message || 'Unable to create split');
    } finally {
      setGroupSplitSubmitting(false);
    }
  };

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

  const loadPayments = async (options = {}) => {
    const { silent = false } = options;
    if (!silent) {
      setLoading(true);
    }
    setError('');
    try {
      const customerQuery = session?.customerId ? `?customerId=${session.customerId}` : '';
      const data = await apiRequest(`/payments${customerQuery}`);
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      if (!silent) {
        setError(err.message || 'Unable to load payments');
      }
      setPayments((prev) => (silent ? prev : []));
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const loadScheduledPayments = async () => {
    try {
      const data = await apiRequest('/scheduled-payments');
      setScheduledPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      setScheduledPayments([]);
    }
  };

  const loadAccounts = async () => {
    try {
      const data = await apiRequest('/accounts');
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      setAccounts([]);
    }
  };

  const loadBeneficiaries = async () => {
    setBeneficiariesLoading(true);
    try {
      const data = await apiRequest('/beneficiaries');
      setBeneficiaries(Array.isArray(data) ? data : []);
    } catch (err) {
      setBeneficiaries([]);
    } finally {
      setBeneficiariesLoading(false);
    }
  };

  const addBeneficiary = async (payload) => {
    const created = await apiRequest('/beneficiaries', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setBeneficiaries((prev) => [...prev, created]);
    showToast('Beneficiary saved');
    return created;
  };

  const deleteBeneficiary = async (beneficiaryId) => {
    await apiRequest(`/beneficiaries/${beneficiaryId}`, { method: 'DELETE' });
    setBeneficiaries((prev) => prev.filter((beneficiary) => beneficiary.beneficiaryId !== beneficiaryId));
    showToast('Beneficiary removed');
  };

  const loadNotifications = async () => {
    try {
      const data = await apiRequest('/notifications');
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      // silent — notifications shouldn't block the dashboard from loading
    }
  };

  const toggleNotifications = () => {
    setNotificationsOpen((open) => !open);
  };

  const markNotificationRead = async (notificationId) => {
    setNotifications((prev) => prev.map((item) => (
      item.notificationId === notificationId ? { ...item, read: true } : item
    )));
    setNotificationsOpen(false);
    try {
      await apiRequest(`/notifications/${notificationId}/read`, { method: 'PUT' });
    } catch (err) {
      // best-effort; local state already reflects read
    }
  };

  const markAllNotificationsRead = async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    try {
      await apiRequest('/notifications/read-all', { method: 'PUT' });
    } catch (err) {
      // best-effort; local state already reflects read
    }
  };

  const loadGroupSplitNotifications = async () => {
    try {
      const data = await apiRequest('/group-splits/notifications');
      const list = Array.isArray(data) ? data : [];
      setGroupSplitNotifications(list);
      if (list.length > 0) {
        setSplitPromptQueue((prev) => [...prev, ...list]);
      }
    } catch (err) {
      // silent — notifications shouldn't block the dashboard from loading
    }
  };

  const loadGroupSplitHistory = async () => {
    try {
      const data = await apiRequest('/group-splits/mine');
      setGroupSplitHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      setGroupSplitHistory([]);
    }
  };

  const loadGroupSplitCreated = async () => {
    try {
      const data = await apiRequest('/group-splits/created');
      setGroupSplitCreated(Array.isArray(data) ? data : []);
    } catch (err) {
      setGroupSplitCreated([]);
    }
  };

  const openPaySplit = (groupSplitId) => {
    setPayingSplitId(groupSplitId);
    setPaySplitTpin('');
    setPaySplitError('');
    setActiveModal('paySplit');
  };

  const closePaySplit = () => {
    setPayingSplitId(null);
    setPaySplitTpin('');
    setPaySplitError('');
    setActiveModal('');
  };

  const skipSplitPrompt = () => {
    setSplitPromptQueue((prev) => prev.slice(1));
  };

  const submitPaySplit = async () => {
    setPaySplitError('');
    setPaySplitSubmitting(true);
    try {
      await apiRequest(`/group-splits/${payingSplitId}/pay`, {
        method: 'POST',
        body: JSON.stringify({ tpin: paySplitTpin })
      });
      showToast('Split settled');
      setSplitPromptQueue((prev) => prev.filter((item) => item.groupSplitId !== payingSplitId));
      closePaySplit();
      loadGroupSplitHistory();
    } catch (err) {
      setPaySplitError(err.message || 'Unable to settle your share');
    } finally {
      setPaySplitSubmitting(false);
    }
  };

  const cancelScheduledPayment = async (scheduledPaymentId) => {
    setCancellingId(scheduledPaymentId);
    try {
      await apiRequest(`/scheduled-payments/${scheduledPaymentId}/cancel`, { method: 'PUT' });
      showToast(t('paymentCancelled'));
      await loadScheduledPayments();
    } catch (err) {
      setError(err.message || 'Failed to cancel scheduled payment');
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    loadPayments();
    loadScheduledPayments();
    loadAccounts();
    loadGroupSplitNotifications();

    const pollInterval = window.setInterval(() => {
      loadPayments({ silent: true });
      loadScheduledPayments();
      setHistoryRefreshTick((tick) => tick + 1);
    }, 15000);

    return () => window.clearInterval(pollInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setHistoryPage(0);
  }, [historyQuery, historyStatusFilter, historyFromDate, historyToDate, historyMinAmount, historyMaxAmount, historySenderAccountId, historySortDateEnabled, historySortDateDir, historySortAmountEnabled, historySortAmountDir, historySortPrimary, historyPageSize]);

  useEffect(() => {
    if (activeSection !== 'transactions') {
      return;
    }

    let cancelled = false;
    const debounce = window.setTimeout(async () => {
      const baseParams = new URLSearchParams();
      if (historyFromDate) baseParams.set('fromDate', historyFromDate);
      if (historyToDate) baseParams.set('toDate', historyToDate);
      if (historyMinAmount) baseParams.set('minAmount', historyMinAmount);
      if (historyMaxAmount) baseParams.set('maxAmount', historyMaxAmount);
      if (historySenderAccountId && historySenderAccountId !== 'All') baseParams.set('senderAccountId', historySenderAccountId);
      if (historyQuery.trim()) baseParams.set('search', historyQuery.trim());

      const searchParams = new URLSearchParams(baseParams);
      (HISTORY_STATUS_GROUPS[historyStatusFilter] || []).forEach((value) => searchParams.append('status', value));
      if (historySortDateEnabled) searchParams.set('sortDateDir', historySortDateDir);
      if (historySortAmountEnabled) searchParams.set('sortAmountDir', historySortAmountDir);
      searchParams.set('sortPrimary', historySortPrimary);
      searchParams.set('page', String(historyPage));
      searchParams.set('size', String(historyPageSize));

      const [searchOutcome, summaryOutcome] = await Promise.allSettled([
        apiRequest(`/payments/search?${searchParams.toString()}`),
        apiRequest(`/payments/summary?${baseParams.toString()}`)
      ]);
      if (cancelled) return;

      const cancelledMatches = getCancelledTransactionMatches(scheduledPayments, accounts, {
        query: historyQuery.trim().toLowerCase(),
        fromDate: historyFromDate,
        toDate: historyToDate,
        minAmount: historyMinAmount,
        maxAmount: historyMaxAmount,
        senderAccountId: historySenderAccountId
      });
      const cancelledCount = cancelledMatches.length;
      const cancelledAmount = cancelledMatches.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

      const compareDate = (a, b) => {
        const direction = historySortDateDir === 'asc' ? 1 : -1;
        return (new Date(a.createdAt || 0) - new Date(b.createdAt || 0)) * direction;
      };
      const compareAmount = (a, b) => {
        const direction = historySortAmountDir === 'asc' ? 1 : -1;
        return (Number(a.amount || 0) - Number(b.amount || 0)) * direction;
      };
      const comparators = historySortPrimary === 'amount'
        ? [historySortAmountEnabled && compareAmount, historySortDateEnabled && compareDate]
        : [historySortDateEnabled && compareDate, historySortAmountEnabled && compareAmount];
      const activeComparators = comparators.filter(Boolean);
      const sortMerged = (items) => [...items].sort((a, b) => {
        for (const compare of activeComparators) {
          const diff = compare(a, b);
          if (diff !== 0) return diff;
        }
        return activeComparators.length === 0 ? new Date(b.createdAt || 0) - new Date(a.createdAt || 0) : 0;
      });

      if (historyStatusFilter === 'CANCELLED') {
        const sortedCancelled = sortMerged(cancelledMatches);
        const start = historyPage * historyPageSize;
        setHistoryResults(sortedCancelled.slice(start, start + historyPageSize));
        setHistoryPagination({
          page: historyPage,
          size: historyPageSize,
          totalElements: cancelledCount,
          totalPages: Math.ceil(cancelledCount / historyPageSize) || 0
        });
      } else if (searchOutcome.status === 'fulfilled') {
        const searchData = searchOutcome.value;
        const realItems = Array.isArray(searchData?.items) ? searchData.items : [];
        const includeCancelled = historyStatusFilter === null;
        const merged = sortMerged([...realItems, ...(includeCancelled ? cancelledMatches : [])]);

        setHistoryResults(merged);
        setHistoryPagination({
          page: searchData?.page ?? 0,
          size: searchData?.size ?? historyPageSize,
          totalElements: searchData?.totalElements ?? 0,
          totalPages: searchData?.totalPages ?? 0
        });
      } else {
        setHistoryResults([]);
        setHistoryPagination({ page: 0, size: historyPageSize, totalElements: 0, totalPages: 0 });
      }

      if (summaryOutcome.status === 'fulfilled') {
        const summaryData = summaryOutcome.value;
        setHistorySummary({
          total: summaryData?.total ?? 0,
          completed: summaryData?.completed ?? 0,
          failed: summaryData?.failed ?? 0,
          pending: summaryData?.pending ?? 0,
          cancelled: cancelledCount,
          totalAmount: summaryData?.totalAmount ?? 0,
          completedAmount: summaryData?.completedAmount ?? 0,
          failedAmount: summaryData?.failedAmount ?? 0,
          pendingAmount: summaryData?.pendingAmount ?? 0,
          cancelledAmount
        });
      } else {
        setHistorySummary({
          total: 0, completed: 0, failed: 0, pending: 0, cancelled: cancelledCount,
          totalAmount: 0, completedAmount: 0, failedAmount: 0, pendingAmount: 0, cancelledAmount
        });
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(debounce);
    };
  }, [activeSection, historyQuery, historyStatusFilter, historyFromDate, historyToDate, historyMinAmount, historyMaxAmount, historySenderAccountId, historySortDateEnabled, historySortDateDir, historySortAmountEnabled, historySortAmountDir, historySortPrimary, historyPage, historyPageSize, historyRefreshTick, scheduledPayments, accounts]);

  const cancelledScheduledAsTransactions = useMemo(() => {
    return scheduledPayments
      .filter((payment) => String(payment.status || '').toUpperCase() === 'CANCELLED')
      .map((payment) => ({
        paymentId: `sch-${payment.scheduledPaymentId}`,
        referenceNumber: payment.referenceNumber,
        status: 'CANCELLED',
        amount: payment.amount,
        currency: payment.currency,
        remarks: payment.remarks,
        sourceAccountId: payment.sourceAccountId,
        destinationAccountId: payment.destinationAccountId,
        createdAt: payment.updatedAt || payment.createdAt || payment.scheduledAt
      }));
  }, [scheduledPayments]);

  const allTransactions = useMemo(() => {
    return [...payments, ...cancelledScheduledAsTransactions];
  }, [payments, cancelledScheduledAsTransactions]);

  const searchedPayments = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      return allTransactions;
    }
    return allTransactions.filter((payment) => {
      const haystack = `${payment.paymentId} ${payment.referenceNumber || ''} ${payment.remarks || ''} ${payment.sourceAccountId || ''} ${payment.destinationAccountId || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [allTransactions, searchText]);

  const recentPayments = useMemo(() => {
    const filtered = [...searchedPayments].filter((payment) => {
      const status = String(payment.status || '').toUpperCase();
      if (recentFilter === 'ALL') return true;
      if (recentFilter === 'COMPLETED') return status === 'COMPLETED';
      if (recentFilter === 'FAILED') return status === 'FAILED' || status === 'CREATED';
      return true;
    });

    return filtered
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5);
  }, [searchedPayments, recentFilter]);

  const upcomingPayments = useMemo(() => {
    return scheduledPayments
      .filter((payment) => String(payment.status || '').toUpperCase() === 'PENDING')
      .sort((a, b) => new Date(a.scheduledAt || 0) - new Date(b.scheduledAt || 0))
      .slice(0, 5);
  }, [scheduledPayments]);

  const spendingStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const previousMonth = (currentMonth + 11) % 12;

    const activeMonth = selectedMonth === 'Last Month' ? previousMonth : currentMonth;
    const filtered = payments.filter((payment) => {
      const status = String(payment.status || '').toUpperCase();
      if (status !== 'COMPLETED') return false;
      const date = new Date(payment.createdAt || Date.now());
      return date.getMonth() === activeMonth;
    });

    const categoryTotals = {
      'Bill Payments': 0,
      Shopping: 0,
      Entertainment: 0,
      Food: 0,
      Others: 0
    };

    for (const payment of filtered) {
      const amount = Number(payment.amount || 0);
      const CATEGORY_LABELS = {
        UPI_PAYMENTS: 'Others',
        BILL_PAYMENTS: 'Bill Payments',
        SHOPPING: 'Shopping',
        ENTERTAINMENT: 'Entertainment',
        FOOD: 'Food',
        OTHERS: 'Others'
      };

      const label = payment.category ? (CATEGORY_LABELS[payment.category] || 'Others') : getPaymentCategory(payment);
      if (categoryTotals[label] !== undefined) {
        categoryTotals[label] += amount;
      } else {
        categoryTotals.Others += amount;
      }
    }

    const total = Object.values(categoryTotals).reduce((sum, value) => sum + value, 0);
    const baseline = total > 0 ? total : 1;

    return {
      total,
      items: [
          { label: 'Bill Payments', amount: categoryTotals['Bill Payments'], pct: Math.round((categoryTotals['Bill Payments'] / baseline) * 100) },
          { label: 'Shopping', amount: categoryTotals.Shopping, pct: Math.round((categoryTotals.Shopping / baseline) * 100) },
          { label: 'Entertainment', amount: categoryTotals.Entertainment, pct: Math.round((categoryTotals.Entertainment / baseline) * 100) },
          { label: 'Food', amount: categoryTotals.Food, pct: Math.round((categoryTotals.Food / baseline) * 100) },
          { label: 'Others', amount: categoryTotals.Others, pct: Math.round((categoryTotals.Others / baseline) * 100) }
      ]
    };
  }, [payments, selectedMonth]);

  const goToSection = (section) => {
    setActiveSection(section);
    setActiveModal('');
    setPaymentJourneyOpen(false);
    setBalanceJourneyOpen(false);
  };

  const goToUpcomingPayments = () => {
    setActiveModal('');
    setScheduleStep('details');
    setScheduledReceipt(null);
    setActiveSection('dashboard');
    window.requestAnimationFrame(() => {
      document.getElementById('upcoming-payments-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const openPaymentJourney = () => {
    const linkedAccount = activeAccounts.find((account) => String(account.accountId) === String(session?.accountId))
      || activeAccounts.find((account) => account.accountNumber === session?.accountNumber)
      || activeAccounts[0];

    setPaymentJourneyOpen(true);
    setPaymentJourneyStep('method');
    setPaymentJourneyMethod('bank');
    setJourneyPaymentId(null);
    setFormState({
      ...initialFormState,
      sourceAccountId: String(linkedAccount?.accountId || ''),
      sourceAccountNumber: linkedAccount?.accountNumber || '',
      sourceAccountHolder: linkedAccount?.accountHolderName || ''
    });
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

  const openTransactionFromHistory = (payment) => {
    const sourceAccount = accounts.find((account) => String(account.accountId) === String(payment.sourceAccountId));
    const destinationAccount = accounts.find((account) => String(account.accountId) === String(payment.destinationAccountId));

    setFormState({
      ...initialFormState,
      sourceAccountId: String(payment.sourceAccountId || ''),
      sourceAccountNumber: sourceAccount?.accountNumber || '',
      sourceAccountHolder: sourceAccount?.accountHolderName || '',
      destinationAccountId: String(payment.destinationAccountId || ''),
      destinationAccountNumber: destinationAccount?.accountNumber || '',
      accountHolder: destinationAccount?.accountHolderName || '',
      recipientName: destinationAccount?.accountHolderName || '',
      amount: String(payment.amount ?? ''),
      currency: payment.currency || 'INR',
      referenceNumber: payment.referenceNumber || ''
    });
    setJourneyPaymentId(payment.paymentId);
    setPaymentJourneyStep('transaction');
    setPaymentJourneyOpen(true);
  };

  const handleQuickAction = (action) => {
    setPaymentJourneyOpen(false);
    setBalanceJourneyOpen(false);
    setActiveModal('');

    if (action === 'account') {
      openAccountFlow();
      return;
    }
    if (action === 'makePayment') {
      openPaymentJourney();
      return;
    }
    if (action === 'checkBalance') {
      openCheckBalanceFlow();
      return;
    }
    if (action === 'schedulePayment') {
      setActiveModal('schedule');
      setScheduleStep('details');
      setScheduledReceipt(null);
      setError('');
      setScheduleLookupError('');
      loadAccounts();
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
    setScheduleStep('details');
    setScheduledReceipt(null);
    setGroupSplit({ amount: '', description: '', splitType: 'EQUAL', members: [{ accountNumber: '', amount: '' }, { accountNumber: '', amount: '' }] });
    setError('');
    setScheduleLookupError('');
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
    setBalanceAccountNumber('');
    setBalanceTpin('');
    setBalanceResult(null);
    setBalanceError('');
    setBalanceSubmitting(false);
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

  const openCheckBalanceFlow = () => {
    setBalanceJourneyOpen(true);
    setBalanceJourneyStep('accounts');
    setActiveModal('');
    setBalanceResult(null);
    setBalanceError('');
    setBalanceSubmitting(false);
    setBalanceTpin('');
    loadAccounts();
    setBalanceAccountNumber('');
  };

  const closeCheckBalanceJourney = () => {
    setBalanceJourneyOpen(false);
    setBalanceJourneyStep('accounts');
    setBalanceAccountNumber('');
    setBalanceTpin('');
    setBalanceResult(null);
    setBalanceError('');
  };

  const submitCheckBalance = async () => {
    setBalanceError('');

    if (!balanceAccountNumber) {
      setBalanceError('Please select an account.');
      return;
    }
    if (!/^\d{6}$/.test(String(balanceTpin || '').trim())) {
      setBalanceError('Enter your 6-digit TPIN.');
      return;
    }

    setBalanceSubmitting(true);
    try {
      const response = await apiRequest('/accounts/balance', {
        method: 'POST',
        body: JSON.stringify({
          account_number: balanceAccountNumber,
          tpin: balanceTpin.trim()
        })
      });
      setBalanceResult(response);
    } catch (err) {
      setBalanceError(err.message || 'Unable to check balance');
      setBalanceResult(null);
    } finally {
      setBalanceSubmitting(false);
    }
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
          currency: accountForm.currency.trim() || 'INR',
          customer_id: session?.customerId
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

  const goToTimingStep = () => {
    if (!formState.sourceAccountId) {
      setError('Please select a source account.');
      return;
    }

    if (!formState.scheduleDestinationAccountNumber?.trim()) {
      setError('Please enter a recipient account number.');
      return;
    }

    if (!formState.scheduleDestinationAccountId) {
      setError('Recipient account number not found.');
      return;
    }

    if (String(formState.scheduleDestinationAccountId) === String(formState.sourceAccountId)) {
      setError('Source and recipient accounts must be different.');
      return;
    }

    const amount = Number(formState.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }

    setError('');
    setScheduleStep('timing');
  };

  const goToTpinStep = () => {
    if (!scheduleDate) {
      setError('Please choose a date and time for the scheduled payment.');
      return;
    }

    if (formState.executionType === 'RECURRING') {
      if (!formState.recurrenceType) {
        setError('Choose how often this payment should repeat.');
        return;
      }
      if (formState.recurrenceType === 'CUSTOM_DAYS') {
        const intervalDays = Number(formState.recurrenceIntervalDays);
        if (!Number.isInteger(intervalDays) || intervalDays < 1) {
          setError('Repeat interval must be a whole number of days, at least 1.');
          return;
        }
      }
    }

    setError('');
    setScheduleStep('tpin');
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleDestinationAccountNumberChange = (event) => {
    const value = event.target.value;
    setFormState((prev) => ({
      ...prev,
      scheduleDestinationAccountNumber: value,
      scheduleDestinationAccountId: '',
      accountHolder: '',
      receiverBankName: '',
      receiverIfsc: ''
    }));
    setScheduleLookupError('');
  };

  const lookupScheduleDestination = async () => {
    const accountNumber = String(formState.scheduleDestinationAccountNumber || '').trim();
    if (!accountNumber) return;
    try {
      const account = await apiRequest(`/accounts/number/${encodeURIComponent(accountNumber)}`);
      setFormState((prev) => ({
        ...prev,
        scheduleDestinationAccountId: String(account.accountId),
        accountHolder: account.accountHolderName,
        receiverBankName: account.bankName,
        receiverIfsc: account.ifscCode || ''
      }));
      setScheduleLookupError('');
    } catch (err) {
      setScheduleLookupError(err.message || 'Recipient account was not found.');
    }
  };

  const createPayment = async (mode, pin) => {
    setSubmitting(true);
    try {
      const amount = Number(formState.amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        setError('Amount must be greater than 0.');
        return false;
      }

      if (mode === 'schedule') {
        const sourceAccountId = Number(formState.sourceAccountId);
        if (!Number.isInteger(sourceAccountId)) {
          setError('Please select a source account.');
          return false;
        }

        if (!formState.scheduleDestinationAccountId) {
          setError('Destination account number not found.');
          return false;
        }
        const destinationAccountId = Number(formState.scheduleDestinationAccountId);

        if (sourceAccountId === destinationAccountId) {
          setError('Source and destination accounts must be different.');
          return false;
        }

        if (!scheduleDate) {
          setError('Please choose a date and time for the scheduled payment.');
          return false;
        }

        if (!/^\d{6}$/.test(formState.tpin || '')) {
          setError('Enter your 6-digit TPIN to confirm scheduling.');
          return false;
        }

        const isRecurring = formState.executionType === 'RECURRING';
        const payload = {
          sourceAccountId,
          destinationAccountId,
          amount,
          currency: formState.currency || 'INR',
          remarks: formState.remarks,
          category: formState.category || 'OTHERS',
          receiverBankName: formState.receiverBankName || null,
          receiverIfsc: formState.receiverIfsc || null,
          scheduledAt: scheduleDate,
          executionType: formState.executionType || 'ONE_TIME',
          recurrenceType: isRecurring ? formState.recurrenceType : null,
          recurrenceIntervalDays: isRecurring && formState.recurrenceType === 'CUSTOM_DAYS'
            ? Number(formState.recurrenceIntervalDays)
            : null,
          tpin: formState.tpin
        };

        const created = await apiRequest('/scheduled-payments', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setScheduledReceipt(created);
        showToast(t('paymentScheduled'));
        await loadScheduledPayments();
        return true;
      }

      const sourceAccountId = Number(formState.sourceAccountId);
      const destinationAccountId = Number(formState.destinationAccountId);

      if (!Number.isInteger(sourceAccountId) || !Number.isInteger(destinationAccountId)) {
        setError('Source and Destination must be numeric account IDs (example: 1, 2).');
        return false;
      }


      const referenceNumber = (formState.referenceNumber || formState.reference || '').trim() || `REF${Date.now()}`;

      if (!/^\d{6}$/.test(pin || '')) {
        setError('Enter your 6-digit TPIN to authorize this payment.');
        return false;
      }

      const payload = {
        sourceAccountId,
        destinationAccountId,
        amount,
        currency: formState.currency || 'INR',
        referenceNumber,
        remarks: formState.remarks,
        category: formState.category || 'OTHERS',
        tpin: pin
      };

      const createdPayment = await apiRequest('/payments', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setFormState((prev) => ({ ...prev, referenceNumber }));
      if (createdPayment?.paymentId) {
        setJourneyPaymentId(createdPayment.paymentId);
      }
      showToast(t('paymentCreated'));
      await loadPayments();
      return true;
    } catch (err) {
      setError(err.message === 'Incorrect TPIN' ? t('invalidTpin') : err.message || 'Failed to submit payment');
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

  const scheduleDateParts = useMemo(() => {
    const [datePart = '', timePart = ''] = scheduleDate ? scheduleDate.split('T') : [];
    return { datePart, timePart };
  }, [scheduleDate]);

  const activeAccounts = useMemo(() => {
    return accounts
      .filter((account) => String(account.status || '').toUpperCase() === 'ACTIVE')
      .sort((a, b) => (a.accountNumber || '').localeCompare(b.accountNumber || ''));
  }, [accounts]);
  const journeySourceAccount = accounts.find((account) => String(account.accountId) === String(formState.sourceAccountId));
  const journeySourceBalance = Number(journeySourceAccount?.balance || 0);

  const getAccountLabel = (accountId) => {
    const match = accounts.find((account) => String(account.accountId) === String(accountId));
    return match ? `${match.accountNumber} (${match.bankName})` : accountId || '-';
  };

  const getAccountByNumber = (accountNumber) => {
    const normalized = String(accountNumber || '').trim().toLowerCase();
    if (!normalized) return null;
    return accounts.find((account) => String(account.accountNumber || '').trim().toLowerCase() === normalized) || null;
  };

  const unreadNotifications = notifications.filter((item) => !item.read);

  const activeNav = paymentJourneyOpen
    ? 'payments'
    : activeModal === 'schedule'
      ? 'schedule'
      : activeModal === 'groupSplit'
        ? 'groupSplit'
        : activeModal === 'settings'
          ? 'settings'
          : activeSection === 'transactions'
            ? 'transactions'
            : activeSection === 'beneficiaries'
              ? 'beneficiaries'
              : 'dashboard';

  return (
    <div className={`smartpay-app ${theme === 'dark' ? 'dark-theme' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 17.5L14 21.5L26 8" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 17.5L14 21.5L11.5 12.5L26 8" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
            </svg>
          </div>
          <span>{t('appName')}</span>
        </div>

        <nav className="menu">
          <button className={`menu-item ${activeNav === 'dashboard' ? 'active' : ''}`} onClick={() => goToSection('dashboard')}>{t('dashboard')}</button>
          <button className={`menu-item ${activeNav === 'payments' ? 'active' : ''}`} onClick={() => handleQuickAction('makePayment')}>Make Payment</button>
          <button className={`menu-item ${activeNav === 'schedule' ? 'active' : ''}`} onClick={() => handleQuickAction('schedulePayment')}>{t('schedulePayment')}</button>
          <button className={`menu-item ${activeNav === 'groupSplit' ? 'active' : ''}`} onClick={() => handleQuickAction('groupSplit')}>{t('groupSplit')}</button>
          <button className={`menu-item ${activeNav === 'transactions' ? 'active' : ''}`} onClick={() => goToSection('transactions')}>Payment History</button>
          <button className={`menu-item ${activeNav === 'beneficiaries' ? 'active' : ''}`} onClick={() => goToSection('beneficiaries')}>{t('beneficiaries')}</button>
          <button className={`menu-item ${activeNav === 'settings' ? 'active' : ''}`} onClick={() => setActiveModal('settings')}>Settings</button>
        </nav>

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

      <main className={`main-content ${(paymentJourneyOpen || balanceJourneyOpen || activeModal === 'schedule') ? 'journey-mode' : ''}`}>
        {activeModal === 'schedule' && (
          <section className="payment-journey">
            <div className="journey-breadcrumb">
              <span>{t('dashboard')}<FiChevronRight /></span>
              <span className="current">{t('schedulePayment')}</span>
            </div>

            <div className="journey-hero premium-hero">
              <div>
                <h1>{t('schedulePaymentTitle')}</h1>
              </div>
              <button className="back-btn" onClick={closeModal}><FiArrowLeft /> {t('backToDashboard')}</button>
            </div>

            <div className="journey-shell premium-shell">
              {scheduleStep !== 'success' && (
                <div className="stepper premium-stepper">
                  {[{ id: 'details', label: t('details') }, { id: 'timing', label: t('timing') }, { id: 'tpin', label: t('tpin') }].map((item, index) => {
                    const order = ['details', 'timing', 'tpin'];
                    const completed = order.indexOf(scheduleStep) > order.indexOf(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`stepper-item ${scheduleStep === item.id ? 'active' : ''} ${completed ? 'completed' : ''}`}
                      >
                        <span>{index + 1}</span>
                        <small>{item.label}</small>
                      </div>
                    );
                  })}
                </div>
              )}

              {scheduleStep === 'details' && (
                <div className="modal-card journey-panel">
                  <div className="bank-form schedule-compact">
                    <div className="section-title compact-heading">
                      <h2><FiFileText /> {t('paymentDetailsHeading')}</h2>
                    </div>
                    <div className="form-grid">
                      <label className="field-col">
                        <span><FiHash /> {t('sourceAccount')}</span>
                        <select name="sourceAccountId" value={formState.sourceAccountId} onChange={handleFormChange}>
                          <option value="">{t('selectAccountPlaceholder')}</option>
                          {activeAccounts.map((account) => (
                            <option key={account.accountId} value={account.accountId}>
                              {account.accountNumber} — {account.bankName} ({account.accountHolderName})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field-col">
                        <span><FiCreditCard /> {t('destinationAccount')}</span>
                        <input
                          name="scheduleDestinationAccountNumber"
                          placeholder={t('destinationAccountNumberPlaceholder')}
                          value={formState.scheduleDestinationAccountNumber}
                          onChange={handleDestinationAccountNumberChange}
                          onBlur={lookupScheduleDestination}
                        />
                        {scheduleLookupError && <div className="error-msg">{scheduleLookupError}</div>}
                      </label>
                      <label className="field-col">
                        <span><FiUser /> {t('accountHolderName')}</span>
                        <input name="accountHolder" value={formState.accountHolder} readOnly />
                      </label>
                      <label className="field-col">
                        <span><FiCreditCard /> {t('receiverBankName')}</span>
                        <input
                          name="receiverBankName"
                          placeholder={t('receiverBankNamePlaceholder')}
                          value={formState.receiverBankName}
                          onChange={handleFormChange}
                          readOnly={Boolean(formState.scheduleDestinationAccountId)}
                        />
                      </label>
                      <label className="field-col">
                        <span><FiHash /> {t('receiverIfsc')}</span>
                        <input
                          name="receiverIfsc"
                          placeholder={t('receiverIfscPlaceholder')}
                          value={formState.receiverIfsc}
                          onChange={handleFormChange}
                          readOnly={Boolean(formState.scheduleDestinationAccountId)}
                        />
                      </label>
                      <label className="field-col">
                        <span>{t('amount')}</span>
                        <input name="amount" placeholder={t('amount')} type="number" value={formState.amount} onChange={handleFormChange} />
                      </label>
                      <label className="field-col">
                        <span>{t('currency')}</span>
                        <input name="currency" placeholder={t('currency')} value={formState.currency} onChange={handleFormChange} />
                      </label>
                      <label className="field-col field-col-span2">
                        <span><FiFileText /> {t('description')}</span>
                        <input name="remarks" placeholder={t('description')} value={formState.remarks} onChange={handleFormChange} />
                      </label>
                    </div>

                    {error && <p className="empty-note error-note">{error}</p>}
                    <div className="modal-actions">
                      <button className="secondary-btn" onClick={closeModal}>{t('reset')}</button>
                      <button className="primary-btn" onClick={goToTimingStep}>
                        {t('continueToTpin')} <FiChevronRight />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {scheduleStep === 'timing' && (
                <div className="modal-card journey-panel">
                  <div className="bank-form schedule-compact">
                    <div className="section-title compact-heading">
                      <h2><FiCalendar /> {t('scheduleHeading')}</h2>
                    </div>
                    <div className="form-grid">
                      <label className="field-col">
                        <span><FiCalendar /> {t('date')}</span>
                        <input
                          type="date"
                          aria-label={t('date')}
                          value={scheduleDateParts.datePart}
                          onChange={(event) => setScheduleDate(`${event.target.value}T${scheduleDateParts.timePart || '00:00'}`)}
                        />
                      </label>
                      <label className="field-col">
                        <span><FiClock /> {t('time')}</span>
                        <input
                          type="time"
                          aria-label={t('time')}
                          value={scheduleDateParts.timePart}
                          onChange={(event) => setScheduleDate(`${scheduleDateParts.datePart}T${event.target.value}`)}
                          disabled={!scheduleDateParts.datePart}
                        />
                      </label>
                    </div>

                    <div className="section-title compact-heading">
                      <h2><FiRepeat /> {t('paymentTypeHeading')}</h2>
                    </div>
                    <div className="schedule-type-toggle">
                      <button
                        type="button"
                        className={`schedule-type-option ${formState.executionType === 'ONE_TIME' ? 'selected' : ''}`}
                        onClick={() => setFormState((prev) => ({ ...prev, executionType: 'ONE_TIME' }))}
                      >
                        <FiCreditCard /> {t('oneTime')}
                      </button>
                      <button
                        type="button"
                        className={`schedule-type-option ${formState.executionType === 'RECURRING' ? 'selected' : ''}`}
                        onClick={() => setFormState((prev) => ({ ...prev, executionType: 'RECURRING' }))}
                      >
                        <FiRepeat /> {t('recurring')}
                      </button>
                    </div>

                    {formState.executionType === 'RECURRING' && (
                      <div className="form-grid" style={{ marginTop: '10px' }}>
                        <label className="field-col">
                          <span><FiRepeat /> {t('frequency')}</span>
                          <select
                            name="recurrenceType"
                            value={formState.recurrenceType}
                            onChange={handleFormChange}
                          >
                            <option value="MONTHLY">{t('monthly')}</option>
                            <option value="CUSTOM_DAYS">{t('repeatEveryDays')}</option>
                          </select>
                        </label>

                        {formState.recurrenceType === 'CUSTOM_DAYS' && (
                          <label className="field-col">
                            <span><FiClock /> {t('repeatEveryDays')}</span>
                            <input
                              name="recurrenceIntervalDays"
                              type="number"
                              min="1"
                              placeholder={t('repeatEveryDaysPlaceholder')}
                              value={formState.recurrenceIntervalDays}
                              onChange={handleFormChange}
                            />
                          </label>
                        )}
                      </div>
                    )}

                    {error && <p className="empty-note error-note">{error}</p>}
                    <div className="modal-actions">
                      <button className="secondary-btn" onClick={() => { setScheduleStep('details'); setError(''); }}>
                        {t('back')}
                      </button>
                      <button className="primary-btn" onClick={goToTpinStep}>
                        <FiCheckCircle /> {t('done')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {scheduleStep === 'tpin' && (
                <div className="modal-card journey-panel">
                  <div className="page-heading premium-heading">
                    <div className="heading-copy">
                      <h2>{t('verifyTpinHeading')}</h2>
                      <span className="authorize-subcopy">{t('tpinHint')}</span>
                    </div>
                    <div className="status-chip"><FiLock /> Authorization Required</div>
                  </div>

                  <div className="review-layout authorize-layout">
                    <div className="premium-card authorize-main-card">
                      <div className="authorize-tabs" role="tablist" aria-label="Authorization methods">
                        <button type="button" className="authorize-tab active" role="tab" aria-selected="true">{t('tpin')}</button>
                      </div>

                      <div className="authorize-pin-card">
                        <div className="authorize-pin-title">{t('verifyTpinHeading')}</div>
                        <span className="authorize-pin-hint">{t('tpinHint')}</span>

                        <input
                          name="tpin"
                          className="authorize-pin-input"
                          type="password"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          autoFocus
                          value={formState.tpin}
                          onChange={(event) => {
                            const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, 6);
                            setFormState((prev) => ({ ...prev, tpin: digitsOnly }));
                          }}
                          aria-label="Enter 6 digit transaction PIN"
                        />

                        <div className="authorize-pin-grid" aria-hidden="true">
                          {Array.from({ length: 6 }).map((_, index) => {
                            const tpinValue = formState.tpin || '';
                            const filled = index < tpinValue.length;
                            const active = index === tpinValue.length && tpinValue.length < 6;
                            return (
                              <div key={index} className={`pin-cell ${active ? 'pin-cell-active' : ''}`}>
                                {filled ? '●' : active ? '|' : ''}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="authorize-secure-note"><FiShield /> Your payment is secured with 256-bit encryption.</div>

                      {error && <p className="empty-note error-note">{error}</p>}

                      <div className="journey-actions premium-actions authorize-actions-row">
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => {
                            setScheduleStep('timing');
                            setError('');
                            setFormState((prev) => ({ ...prev, tpin: '' }));
                          }}
                          disabled={submitting}
                        >
                          {t('back')}
                        </button>
                        <button
                          type="button"
                          className="primary-btn"
                          disabled={submitting || !/^\d{6}$/.test(formState.tpin || '')}
                          onClick={async () => {
                            const ok = await createPayment('schedule');
                            if (ok) {
                              setScheduleStep('success');
                            }
                          }}
                        >
                          {submitting ? t('processing') : t('verifyAndSchedule')}
                        </button>
                      </div>
                    </div>

                    <div className="summary-panel">
                      <div className="payment-summary-box premium-card authorize-summary-card">
                        <div className="section-label">{t('reviewHeading')}</div>
                        <div className="info-row"><span>{t('sourceAccount')}</span><strong>{getAccountLabel(formState.sourceAccountId)}</strong></div>
                        <div className="info-row"><span>{t('destinationAccount')}</span><strong>{formState.scheduleDestinationAccountNumber || '-'}</strong></div>
                        <div className="info-row"><span>{t('receiverBankName')}</span><strong>{formState.receiverBankName || '-'}</strong></div>
                        <div className="info-row"><span>{t('receiverIfsc')}</span><strong>{formState.receiverIfsc || '-'}</strong></div>
                        <div className="info-row"><span>{t('amount')}</span><strong>{currency(formState.amount)}</strong></div>
                        <div className="info-row"><span>{t('scheduleDateTime')}</span><strong>{formatDateTime(scheduleDate)}</strong></div>
                        <div className="info-row">
                          <span>{t('executionType')}</span>
                          <strong>
                            {formState.executionType === 'RECURRING'
                              ? `${t('recurring')} — ${formState.recurrenceType === 'CUSTOM_DAYS'
                                  ? `${t('repeatEveryDays')}: ${formState.recurrenceIntervalDays || '-'}`
                                  : t('monthly')}`
                              : t('oneTime')}
                          </strong>
                        </div>
                        <div className="info-row total"><span>{t('amount')}</span><strong>{currency(formState.amount)}</strong></div>
                      </div>

                      <div className="premium-card authorize-safe-card">
                        <div className="section-label">Safe &amp; Secure</div>
                        <div className="authorize-safe-item">Bank-grade security</div>
                        <div className="authorize-safe-item">PIN is never stored</div>
                        <div className="authorize-safe-item">You are in a secure environment</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {scheduleStep === 'success' && (
                <div className="modal-card journey-panel">
                  <div className="premium-card success-main-card">
                    <div className="success-center-wrap">
                      <div className="success-icon"><FiCheckCircle /></div>
                      <h2>{t('scheduledSuccessHeading')}</h2>
                      <span className="success-subcopy">
                        {scheduledReceipt?.executionType === 'RECURRING' ? t('scheduledSuccessRecurringSub') : t('scheduledSuccessOneTimeSub')}
                      </span>
                      {scheduledReceipt?.referenceNumber && (
                        <div className="success-tx-pill">{t('referenceNumberLabel')}: {scheduledReceipt.referenceNumber}</div>
                      )}
                    </div>

                    <div className="payment-summary-box premium-card">
                      <div className="section-label">{t('summaryHeading')}</div>
                      <div className="info-row"><span>{t('sourceAccount')}</span><strong>{getAccountLabel(scheduledReceipt?.sourceAccountId ?? formState.sourceAccountId)}</strong></div>
                      <div className="info-row"><span>{t('destinationAccount')}</span><strong>{scheduledReceipt ? getAccountLabel(scheduledReceipt.destinationAccountId) : (formState.scheduleDestinationAccountNumber || '-')}</strong></div>
                      <div className="info-row"><span>{t('receiverBankName')}</span><strong>{scheduledReceipt?.receiverBankName ?? formState.receiverBankName ?? '-'}</strong></div>
                      <div className="info-row"><span>{t('receiverIfsc')}</span><strong>{scheduledReceipt?.receiverIfsc ?? formState.receiverIfsc ?? '-'}</strong></div>
                      <div className="info-row"><span>{t('amount')}</span><strong>{currency(scheduledReceipt?.amount ?? formState.amount)}</strong></div>
                      <div className="info-row"><span>{t('scheduleDateTime')}</span><strong>{formatDateTime(scheduledReceipt?.scheduledAt ?? scheduleDate)}</strong></div>
                      <div className="info-row">
                        <span>{t('executionType')}</span>
                        <strong>
                          {(scheduledReceipt?.executionType ?? formState.executionType) === 'RECURRING'
                            ? `${t('recurring')} — ${(scheduledReceipt?.recurrenceType ?? formState.recurrenceType) === 'CUSTOM_DAYS'
                                ? `${t('repeatEveryDays')}: ${scheduledReceipt?.recurrenceIntervalDays ?? formState.recurrenceIntervalDays ?? '-'}`
                                : t('monthly')}`
                            : t('oneTime')}
                        </strong>
                      </div>
                    </div>

                    <div className="success-actions-grid">
                      <button type="button" onClick={goToUpcomingPayments}><FiEye /> {t('viewUpcoming')}</button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormState(initialFormState);
                          setScheduleDate('');
                          setScheduledReceipt(null);
                          setScheduleStep('details');
                        }}
                      >
                        <FiRefreshCw /> {t('scheduleAnother')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {paymentJourneyOpen && (
            <PaymentJourney
            step={paymentJourneyStep}
            method={paymentJourneyMethod}
            setMethod={setPaymentJourneyMethod}
            formState={formState}
            setFormState={setFormState}
            accounts={activeAccounts}
            paymentId={journeyPaymentId}
            currency={currency}
            onClose={closePaymentJourney}
            onAuthorize={(pin) => createPayment('payment', pin)}
            onValidate={validateJourneyPayment}
            onProcessStatus={processJourneyPayment}
            onSettle={settleJourneyPayment}
            submitting={submitting}
            t={t}
            errorMessage={error}
            payments={payments}
            accounts={accounts}
            beneficiaries={beneficiaries}
            onSaveBeneficiary={addBeneficiary}
            selectedDestination={formState.accountHolder || formState.recipientName || 'Recipient'}
            selectedAmount={formState.amount || '0'}
            sourceBalance={journeySourceBalance}
            onStepChange={setPaymentJourneyStep}
          />
        )}

        {balanceJourneyOpen && (
          <CheckBalanceJourney
            accounts={accounts}
            selectedAccountNumber={balanceAccountNumber}
            setSelectedAccountNumber={(accountNumber) => { setBalanceAccountNumber(accountNumber); setBalanceTpin(''); setBalanceError(''); }}
            tpin={balanceTpin}
            setTpin={setBalanceTpin}
            step={balanceJourneyStep}
            setStep={setBalanceJourneyStep}
            result={balanceResult}
            error={balanceError}
            submitting={balanceSubmitting}
            onCheck={submitCheckBalance}
            onClose={closeCheckBalanceJourney}
            onStartAgain={() => { setBalanceJourneyStep('accounts'); setBalanceResult(null); setBalanceAccountNumber(''); setBalanceTpin(''); setBalanceError(''); }}
            customerName={customerName}
          />
        )}

        {activeSection === 'dashboard' && !paymentJourneyOpen && !balanceJourneyOpen && activeModal !== 'schedule' && (
          <>
            <header className="topbar">
              <div className="search-wrap">
                <span className="search-icon"><FiSearch /></span>
                <input placeholder={t('searchPlaceholder')} value={searchText} onChange={(event) => setSearchText(event.target.value)} />
                <kbd>Ctrl K</kbd>
              </div>

              <div className="top-right">
                <div className="notification-wrap" ref={notificationWrapRef}>
                  <button className="icon-btn" onClick={toggleNotifications} aria-label="Notifications" aria-expanded={notificationsOpen}>
                    <FiBell />
                    {unreadNotifications.length > 0 && (
                      <span className="badge">{unreadNotifications.length}</span>
                    )}
                  </button>
                  {notificationsOpen && (
                    <div className="notification-menu">
                      <div className="notification-menu-head">
                        <strong>Notifications</strong>
                        {unreadNotifications.length > 0 && (
                          <button className="link-btn" onClick={markAllNotificationsRead}>Mark all read</button>
                        )}
                      </div>
                      <div className="notification-list">
                        {unreadNotifications.length === 0 && (
                          <div className="notification-empty">No new notifications</div>
                        )}
                        {unreadNotifications.map((item) => (
                          <button
                            key={item.notificationId}
                            className="notification-item unread"
                            onClick={() => markNotificationRead(item.notificationId)}
                          >
                            <div className="notification-title">{item.title}</div>
                            <div className="notification-message">{item.message}</div>
                            <div className="notification-time">{formatDateTime(item.createdAt)}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button className="icon-btn theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
                  {theme === 'light' ? <FiMoon /> : <FiSun />}
                </button>
                <select className="lang-select" value={language} onChange={handleLanguageChange} aria-label="Language selector">
                  {languageOptions.map((option) => (
                    <option key={option.code} value={option.code}>{option.label}</option>
                  ))}
                </select>
                <button className="profile profile-button" onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen}>
                  <div className="avatar">{customerInitials}</div>
                  <div>
                    <div className="name">{customerName}</div>
                  </div>
                </button>
                {profileOpen && <div className="profile-menu">
                  <div className="profile-menu-head"><strong>{customerName}</strong><span>{session?.email}</span></div>
                  <button onClick={() => { setProfileOpen(false); setActiveModal('profile'); }}>My profile</button>
                  <button onClick={() => { setProfileOpen(false); setNotificationsOpen(true); }}>Notifications</button>
                  <button onClick={() => { setProfileOpen(false); setActiveModal('settings'); }}>Settings</button>
                  <button className="logout-btn" onClick={onLogout}><FiLogOut /> Log out</button>
                </div>}
              </div>
            </header>

            <section className="hero-head">
              <h1>Good morning, {customerName}!</h1>
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
                  <div className="recent-filter">
                    <button
                      type="button"
                      className={`filter-btn ${recentFilter === 'ALL' ? 'active' : ''}`}
                      onClick={() => setRecentFilter('ALL')}
                    >All</button>
                    <button
                      type="button"
                      className={`filter-btn ${recentFilter === 'COMPLETED' ? 'active' : ''}`}
                      onClick={() => setRecentFilter('COMPLETED')}
                    >Completed</button>
                    <button
                      type="button"
                      className={`filter-btn ${recentFilter === 'FAILED' ? 'active' : ''}`}
                      onClick={() => setRecentFilter('FAILED')}
                    >Failed</button>
                  </div>
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
              <article className="card" id="upcoming-payments-section">
                <div className="card-title-row">
                  <h3>{t('upcomingPayments')}</h3>
                  <button className="link-btn">{t('viewAll')}</button>
                </div>
                {upcomingPayments.length === 0 && <p className="empty-note">{t('noScheduled')}</p>}
                {upcomingPayments.map((payment) => (
                  <div className="tx-row" key={`sch-${payment.scheduledPaymentId}`}>
                    <span>
                      {payment.referenceNumber || `SCH-${payment.scheduledPaymentId}`}
                      {payment.executionType === 'RECURRING' && <span className="status-pill status-pending">{t('recurringBadge')}</span>}
                      <br />
                      <small>
                        {t('nextRun')}: {formatDateTime(payment.scheduledAt)}
                        {payment.remarks ? ` • ${payment.remarks}` : ''}
                        {payment.errorMessage ? ` • ${payment.errorMessage}` : ''}
                      </small>
                    </span>
                    <span className="sch-right">
                      <strong>{currency(payment.amount)}</strong>
                      <button
                        className="cancel-btn"
                        disabled={cancellingId === payment.scheduledPaymentId}
                        onClick={() => cancelScheduledPayment(payment.scheduledPaymentId)}
                      >
                        {cancellingId === payment.scheduledPaymentId ? t('cancelling') : t('cancel')}
                      </button>
                    </span>
                  </div>
                ))}
              </article>

              <article className="promo-card">
                <h3>{t('sendMoney')}</h3>
                <p>{t('sendMoneySub')}</p>
                <button onClick={openPaymentJourney}>{t('payNow')} →</button>
              </article>
            </section>

            <section className="bottom-grid">
              <article className="card">
                <div className="card-title-row">
                  <h3>{t('groupSplit')}</h3>
                </div>
                {groupSplitHistory.length === 0 && <p className="empty-note">No group splits yet.</p>}
                {groupSplitHistory.map((split) => (
                  <div className="tx-row" key={split.groupSplitId}>
                    <span>
                      {split.description}
                      <br />
                      <small>By {split.createdByName} • {formatDateTime(split.createdAt)}{!split.seen ? ' • New' : ''}</small>
                    </span>
                    <span className="sch-right">
                      <strong>{currency(split.shareAmount)}</strong>
                      {split.paid ? (
                        <span className="status-pill status-completed">Paid</span>
                      ) : (
                        <button className="cancel-btn" onClick={() => openPaySplit(split.groupSplitId)}>Pay Now</button>
                      )}
                    </span>
                  </div>
                ))}
              </article>

              <article className="card">
                <div className="card-title-row">
                  <h3>Splits you created</h3>
                </div>
                {groupSplitCreated.length === 0 && <p className="empty-note">You haven't created any splits yet.</p>}
                {groupSplitCreated.map((split) => {
                  const settledCount = split.members.filter((member) => member.paid).length;
                  return (
                    <div key={split.groupSplitId} className="tx-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                      <span>
                        {split.description}
                        <br />
                        <small>{formatDateTime(split.createdAt)} • {settledCount}/{split.members.length} settled</small>
                      </span>
                      {split.members.map((member) => (
                        <div className="tx-row" key={member.accountNumber}>
                          <span>{member.accountHolderName || member.accountNumber}</span>
                          <span className="sch-right">
                            <strong>{currency(member.shareAmount)}</strong>
                            <span className={`status-pill ${member.paid ? 'status-completed' : 'status-pending'}`}>
                              {member.paid ? 'Paid' : 'Pending'}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </article>
            </section>
          </>
        )}

        {activeSection === 'beneficiaries' && !paymentJourneyOpen && !balanceJourneyOpen && activeModal !== 'schedule' && (
          <section className="payment-journey">
            <div className="journey-breadcrumb">
              <span>{t('dashboard')}<FiChevronRight /></span>
              <span className="current">{t('beneficiaries')}</span>
            </div>
            <Beneficiaries
              beneficiaries={beneficiaries}
              loading={beneficiariesLoading}
              onAdd={addBeneficiary}
              onDelete={deleteBeneficiary}
            />
          </section>
        )}

        {activeSection === 'transactions' && !paymentJourneyOpen && !balanceJourneyOpen && activeModal !== 'schedule' && (
          <section className="payment-journey">
            <div className="journey-breadcrumb">
              <span>{t('dashboard')}<FiChevronRight /></span>
              <span className="current">Payments History</span>
            </div>
            <TransactionHistory
              summary={historySummary}
              historyStatusFilter={historyStatusFilter}
              setHistoryStatusFilter={setHistoryStatusFilter}
              historyQuery={historyQuery}
              setHistoryQuery={setHistoryQuery}
              historyFromDate={historyFromDate}
              setHistoryFromDate={setHistoryFromDate}
              historyToDate={historyToDate}
              setHistoryToDate={setHistoryToDate}
              historyMinAmount={historyMinAmount}
              setHistoryMinAmount={setHistoryMinAmount}
              historyMaxAmount={historyMaxAmount}
              setHistoryMaxAmount={setHistoryMaxAmount}
              historySenderAccountId={historySenderAccountId}
              setHistorySenderAccountId={setHistorySenderAccountId}
              historySortDateEnabled={historySortDateEnabled}
              setHistorySortDateEnabled={setHistorySortDateEnabled}
              historySortDateDir={historySortDateDir}
              setHistorySortDateDir={setHistorySortDateDir}
              historySortAmountEnabled={historySortAmountEnabled}
              setHistorySortAmountEnabled={setHistorySortAmountEnabled}
              historySortAmountDir={historySortAmountDir}
              setHistorySortAmountDir={setHistorySortAmountDir}
              historySortPrimary={historySortPrimary}
              setHistorySortPrimary={setHistorySortPrimary}
              historyPageSize={historyPageSize}
              setHistoryPageSize={setHistoryPageSize}
              accounts={accounts}
              results={historyResults}
              pagination={historyPagination}
              onPageChange={setHistoryPage}
              onViewTransaction={openTransactionFromHistory}
              currency={currency}
            />
          </section>
        )}

        {toast && <div className="toast-msg">{toast}</div>}

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
                  type="text"
                  placeholder={t('splitDescription')}
                  value={groupSplit.description}
                  onChange={(event) => setGroupSplit((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>

              <div className="split-type-toggle">
                <button
                  type="button"
                  className={groupSplit.splitType === 'EQUAL' ? 'active' : ''}
                  onClick={() => setGroupSplit((prev) => ({ ...prev, splitType: 'EQUAL' }))}
                >
                  {t('splitEqually')}
                </button>
                <button
                  type="button"
                  className={groupSplit.splitType === 'UNEQUAL' ? 'active' : ''}
                  onClick={() => setGroupSplit((prev) => ({ ...prev, splitType: 'UNEQUAL' }))}
                >
                  {t('splitUnequally')}
                </button>
              </div>

              <p className="split-result">{t('numberOfPeople')}: <strong>{groupSplit.members.length}</strong></p>

              {groupSplit.members.map((member, index) => (
                <div className="form-grid" key={index}>
                  <input
                    type="text"
                    placeholder={t('memberAccountNumber')}
                    value={member.accountNumber}
                    onChange={(event) => updateGroupSplitMember(index, 'accountNumber', event.target.value)}
                  />
                  {groupSplit.splitType === 'UNEQUAL' && (
                    <input
                      type="number"
                      placeholder={t('memberAmount')}
                      value={member.amount}
                      onChange={(event) => updateGroupSplitMember(index, 'amount', event.target.value)}
                    />
                  )}
                  {groupSplit.members.length > 2 && (
                    <button type="button" className="link-btn" onClick={() => removeGroupSplitMember(index)}>
                      {t('removeMember')}
                    </button>
                  )}
                </div>
              ))}

              <button type="button" className="link-btn" onClick={addGroupSplitMember}>{t('addMember')}</button>

              {groupSplit.splitType === 'EQUAL' && groupSplit.amount && groupSplit.members.length > 0 && (
                <p className="split-result">
                  {t('perPerson')}: <strong>{currency(Number(groupSplit.amount) / groupSplit.members.length)}</strong>
                </p>
              )}

              {groupSplitError && <p className="form-error">{groupSplitError}</p>}

              <div className="modal-actions">
                <button className="secondary-btn" onClick={closeModal}>{t('close')}</button>
                <button className="primary-btn" onClick={submitGroupSplit} disabled={groupSplitSubmitting}>
                  {t('createSplit')}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeModal === 'profile' && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-card" onClick={(event) => event.stopPropagation()}>
              <h3>My Profile</h3>

              <div className="settings-row">
                <div>
                  <strong>Name</strong>
                  <p>{customerName}</p>
                </div>
              </div>

              <div className="settings-row">
                <div>
                  <strong>Email</strong>
                  <p>{session?.email || '-'}</p>
                </div>
              </div>

              <div className="settings-row">
                <div>
                  <strong>Customer ID</strong>
                  <p>{session?.customerId || '-'}</p>
                </div>
              </div>

              {session?.accountNumber && (
                <div className="settings-row">
                  <div>
                    <strong>Linked Account</strong>
                    <p>{session.accountNumber} — {session.bankName}</p>
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button className="primary-btn" onClick={closeModal}>{t('close')}</button>
              </div>
            </div>
          </div>
        )}

        {activeModal === 'settings' && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-card" onClick={(event) => event.stopPropagation()}>
              <h3>Settings</h3>

              <div className="settings-row">
                <div>
                  <strong>Theme</strong>
                  <p>Switch between light and dark mode.</p>
                </div>
                <button className="secondary-btn" onClick={toggleTheme}>
                  {theme === 'dark' ? <><FiSun /> Light</> : <><FiMoon /> Dark</>}
                </button>
              </div>

              <div className="settings-row">
                <div>
                  <strong>Language</strong>
                  <p>Choose your preferred language.</p>
                </div>
                <select className="lang-select" value={language} onChange={handleLanguageChange} aria-label="Language selector">
                  {languageOptions.map((option) => (
                    <option key={option.code} value={option.code}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="settings-row">
                <div>
                  <strong>Account</strong>
                  <p>{session?.email}</p>
                </div>
                <button className="secondary-btn" onClick={onLogout}><FiLogOut /> Log out</button>
              </div>

              <div className="modal-actions">
                <button className="primary-btn" onClick={closeModal}>{t('close')}</button>
              </div>
            </div>
          </div>
        )}

        {activeModal === 'paySplit' && (
          <div className="modal-overlay" onClick={closePaySplit}>
            <div className="modal-card" onClick={(event) => event.stopPropagation()}>
              <h3>Settle your share</h3>
              <input
                type="password"
                placeholder="TPIN"
                maxLength={6}
                value={paySplitTpin}
                onChange={(event) => setPaySplitTpin(event.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              {paySplitError && <p className="form-error">{paySplitError}</p>}
              <div className="modal-actions">
                <button className="secondary-btn" onClick={closePaySplit}>{t('close')}</button>
                <button className="primary-btn" onClick={submitPaySplit} disabled={paySplitSubmitting || paySplitTpin.length < 4}>
                  {paySplitSubmitting ? '...' : 'Pay Now'}
                </button>
              </div>
            </div>
          </div>
        )}

        {splitPromptQueue[0] && activeModal !== 'paySplit' && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3>You've been added to a split</h3>
              <p>
                {splitPromptQueue[0].createdByName} added you to "{splitPromptQueue[0].description}" — your share:{' '}
                {currency(splitPromptQueue[0].shareAmount)}
              </p>
              <div className="modal-actions">
                <button className="secondary-btn" onClick={skipSplitPrompt}>Skip</button>
                <button className="primary-btn" onClick={() => openPaySplit(splitPromptQueue[0].groupSplitId)}>Pay Now</button>
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
