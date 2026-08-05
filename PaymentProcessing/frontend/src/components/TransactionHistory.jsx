import { useEffect, useMemo, useState } from 'react';
import {
  FiArrowDown,
  FiArrowUp,
  FiCalendar,
  FiDownload,
  FiFilter,
  FiFileText,
  FiSearch,
} from 'react-icons/fi';
import { RiBankLine } from 'react-icons/ri';

function getAccount(accounts, accountId) {
  return (accounts || []).find((account) => String(account.accountId) === String(accountId));
}

function getAccountNumberLabel(accounts, accountId, accountNumber) {
  const explicitNumber = String(accountNumber || '').trim();
  if (explicitNumber) {
    return explicitNumber;
  }
  const match = getAccount(accounts, accountId);
  return match?.accountNumber || 'Account unavailable';
}

function isCancelledRow(payment) {
  return String(payment.paymentId || '').startsWith('sch-');
}

function formatDateTime(value) {
  if (!value) {
    return 'N/A';
  }
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDateShort(value) {
  if (!value) {
    return '';
  }
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function toInputDateValue(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function matchesStatusFilter(status, statusFilter) {
  const normalized = String(status || '').toUpperCase();
  if (!statusFilter) {
    return true;
  }
  if (statusFilter === 'PENDING') {
    return ['CREATED', 'VALIDATED', 'PROCESSING', 'PENDING'].includes(normalized);
  }
  return normalized === statusFilter;
}

function derivePaymentMethod(payment, accounts) {
  const ownedAccountIds = new Set((accounts || []).map((account) => String(account.accountId)));
  return ownedAccountIds.has(String(payment.destinationAccountId)) ? 'SELF_TRANSFER' : 'BANK_TRANSFER';
}

function toDateOnlyValue(value) {
  if (!value) {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return parsed.toISOString().slice(0, 10);
}

function escapeCsvCell(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function getStatusMeta(status) {
  const normalized = String(status || '').toUpperCase();

  if (normalized === 'COMPLETED') {
    return { label: 'Completed', className: 'status-completed' };
  }

  if (normalized === 'FAILED') {
    return { label: 'Failed', className: 'status-failed' };
  }

  if (normalized === 'CANCELLED') {
    return { label: 'Cancelled', className: 'status-cancelled' };
  }

  return { label: 'Pending', className: 'status-pending' };
}

const STATUS_FILTERS = [
  { key: null, label: 'All' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'FAILED', label: 'Failed' },
  { key: 'CANCELLED', label: 'Cancelled' }
];

function TransactionHistory({
  summary,
  allTransactions = [],
  historyStatusFilter,
  setHistoryStatusFilter,
  historyQuery,
  setHistoryQuery,
  historyFromDate,
  setHistoryFromDate,
  historyToDate,
  setHistoryToDate,
  historyMinAmount,
  setHistoryMinAmount,
  historyMaxAmount,
  setHistoryMaxAmount,
  historySenderAccountId,
  setHistorySenderAccountId,
  historyCategory = 'All',
  setHistoryCategory = () => {},
  historyPaymentMethod = 'All',
  setHistoryPaymentMethod = () => {},
  historyMonth = '',
  setHistoryMonth = () => {},
  historySortDateEnabled,
  setHistorySortDateEnabled,
  historySortDateDir,
  setHistorySortDateDir,
  historySortAmountEnabled,
  setHistorySortAmountEnabled,
  historySortAmountDir,
  setHistorySortAmountDir,
  historySortPrimary,
  setHistorySortPrimary,
  historyPageSize,
  setHistoryPageSize,
  accounts,
  results,
  pagination,
  onPageChange,
  onViewTransaction,
  currency
}) {
  const [dateOpen, setDateOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateMode, setDateMode] = useState(historyFromDate && historyFromDate === historyToDate ? 'single' : 'range');
  const [statementOpen, setStatementOpen] = useState(false);
  const [statementAccountId, setStatementAccountId] = useState(historySenderAccountId || 'All');
  const [statementFromDate, setStatementFromDate] = useState(historyFromDate || '');
  const [statementToDate, setStatementToDate] = useState(historyToDate || '');
  const [statementStatus, setStatementStatus] = useState(historyStatusFilter || 'ALL');
  const [statementMessage, setStatementMessage] = useState('');
  const [localHistoryCategory, setLocalHistoryCategory] = useState(historyCategory || 'All');
  const [localHistoryPaymentMethod, setLocalHistoryPaymentMethod] = useState(historyPaymentMethod || 'All');
  const [localHistoryMonth, setLocalHistoryMonth] = useState(historyMonth || '');

  useEffect(() => {
    setLocalHistoryCategory(historyCategory || 'All');
  }, [historyCategory]);

  useEffect(() => {
    setLocalHistoryPaymentMethod(historyPaymentMethod || 'All');
  }, [historyPaymentMethod]);

  useEffect(() => {
    setLocalHistoryMonth(historyMonth || '');
  }, [historyMonth]);

  const activeExtraFilters = [historySenderAccountId !== 'All', Boolean(historyMinAmount), Boolean(historyMaxAmount), localHistoryCategory !== 'All', localHistoryPaymentMethod !== 'All', Boolean(localHistoryMonth)].filter(Boolean).length;
  const selectedSenderAccount = historySenderAccountId !== 'All' ? getAccount(accounts, historySenderAccountId) : null;
  const filterLabel = selectedSenderAccount ? (selectedSenderAccount.bankName || 'Unknown Bank') : 'Filter';
  const dateLabel = historyFromDate || historyToDate
    ? (dateMode === 'single'
        ? formatDateShort(historyFromDate || historyToDate)
        : `${historyFromDate ? formatDateShort(historyFromDate) : 'Any'} – ${historyToDate ? formatDateShort(historyToDate) : 'Any'}`)
    : 'Date';

  const handleSingleDateChange = (value) => {
    setLocalHistoryMonth('');
    setHistoryMonth('');
    setHistoryFromDate(value);
    setHistoryToDate(value);
  };

  const monthOptions = Array.from({ length: 12 }, (_, index) => {
    const base = new Date();
    base.setDate(1);
    base.setMonth(base.getMonth() - index);
    const value = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`;
    const label = base.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    return { value, label };
  });

  const handleMonthChange = (value) => {
    setLocalHistoryMonth(value);
    setHistoryMonth(value);
    if (!value) {
      setHistoryFromDate('');
      setHistoryToDate('');
      return;
    }

    const [yearText, monthText] = value.split('-');
    const year = Number(yearText);
    const monthIndex = Number(monthText) - 1;
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    setHistoryFromDate(toInputDateValue(start));
    setHistoryToDate(toInputDateValue(end));
  };

  const handleCategoryChange = (value) => {
    setLocalHistoryCategory(value);
    setHistoryCategory(value);
  };

  const handlePaymentMethodChange = (value) => {
    setLocalHistoryPaymentMethod(value);
    setHistoryPaymentMethod(value);
  };

  const sourceTransactions = (allTransactions && allTransactions.length > 0) ? allTransactions : results;
  const usingFullTransactionList = Array.isArray(allTransactions) && allTransactions.length > 0;

  const filteredResults = useMemo(() => {
    const query = historyQuery.trim().toLowerCase();
    const from = historyFromDate ? new Date(`${historyFromDate}T00:00:00`) : null;
    const to = historyToDate ? new Date(`${historyToDate}T23:59:59`) : null;

    return (sourceTransactions || []).filter((payment) => {
      const amount = Number(payment.amount || 0);
      const createdAt = payment.createdAt ? new Date(payment.createdAt) : null;
      const destinationAccount = getAccount(accounts, payment.destinationAccountId);
      const destinationName = payment.destinationAccountHolderName || destinationAccount?.accountHolderName || '';
      const haystack = `${payment.referenceNumber || ''} ${payment.remarks || ''} ${amount} ${destinationName}`.toLowerCase();

      if (query && !haystack.includes(query)) return false;
      if (!matchesStatusFilter(payment.status, historyStatusFilter)) return false;
      if (from && (!createdAt || createdAt < from)) return false;
      if (to && (!createdAt || createdAt > to)) return false;
      if (historyMinAmount && amount < Number(historyMinAmount)) return false;
      if (historyMaxAmount && amount > Number(historyMaxAmount)) return false;
      if (historySenderAccountId !== 'All' && String(payment.sourceAccountId) !== String(historySenderAccountId)) return false;
      if (localHistoryCategory !== 'All' && String(payment.category || 'OTHERS').toUpperCase() !== localHistoryCategory) return false;
      if (localHistoryPaymentMethod !== 'All' && derivePaymentMethod(payment, accounts) !== localHistoryPaymentMethod) return false;
      return true;
    });
  }, [sourceTransactions, accounts, historyQuery, historyStatusFilter, historyFromDate, historyToDate, historyMinAmount, historyMaxAmount, historySenderAccountId, localHistoryCategory, localHistoryPaymentMethod]);

  const localTotalPages = Math.ceil(filteredResults.length / historyPageSize) || 0;
  const totalPages = usingFullTransactionList ? localTotalPages : (pagination.totalPages || localTotalPages);
  const currentPage = Math.min(pagination.page || 0, Math.max(totalPages - 1, 0));
  const pagedResults = useMemo(() => {
    if (!usingFullTransactionList) {
      return filteredResults;
    }
    const start = currentPage * historyPageSize;
    return filteredResults.slice(start, start + historyPageSize);
  }, [filteredResults, currentPage, historyPageSize, usingFullTransactionList]);

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index);

  const handleToggleDateSort = (checked) => {
    setHistorySortDateEnabled(checked);
    if (checked) setHistorySortPrimary('date');
  };

  const handleToggleAmountSort = (checked) => {
    setHistorySortAmountEnabled(checked);
    if (checked) setHistorySortPrimary('amount');
  };

  const statementRows = filteredResults.filter((payment) => {
    if (statementAccountId !== 'All' && String(payment.sourceAccountId) !== String(statementAccountId)) {
      return false;
    }

    if (statementStatus !== 'ALL' && String(payment.status || '').toUpperCase() !== statementStatus) {
      return false;
    }

    const paymentDateValue = toDateOnlyValue(payment.createdAt);
    if (statementFromDate && paymentDateValue && paymentDateValue < statementFromDate) {
      return false;
    }
    if (statementToDate && paymentDateValue && paymentDateValue > statementToDate) {
      return false;
    }

    return true;
  });

  const handleOpenStatement = () => {
    setStatementAccountId(historySenderAccountId || 'All');
    setStatementFromDate(historyFromDate || '');
    setStatementToDate(historyToDate || '');
    setStatementStatus(historyStatusFilter || 'ALL');
    setStatementMessage('');
    setStatementOpen((open) => !open);
    setDateOpen(false);
    setFilterOpen(false);
  };

  const downloadStatementCsv = () => {
    if (statementRows.length === 0) {
      setStatementMessage('No matching records for the selected statement filters.');
      return;
    }

    const dataHeader = ['Date & Time', 'Reference ID', 'Sender Account Number', 'Receiver Account Number', 'Amount Deducted', 'Status'];
    const dataRows = statementRows.map((payment) => [
      formatDateTime(payment.createdAt),
      payment.referenceNumber || '—',
      getAccountNumberLabel(accounts, payment.sourceAccountId, payment.sourceAccountNumber),
      getAccountNumberLabel(accounts, payment.destinationAccountId, payment.destinationAccountNumber),
      currency(payment.amount),
      payment.status || 'Created'
    ]);

    const csvContent = [dataHeader, ...dataRows]
      .map((row) => row.map(escapeCsvCell).join(','))
      .join('\n');

    const statementAccount = statementAccountId === 'All'
      ? 'all-accounts'
      : String(getAccount(accounts, statementAccountId)?.accountNumber || statementAccountId);
    const fileName = `Tallyn-Account-Statement-${statementAccount}-${new Date().toISOString().slice(0, 10)}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);

    setStatementMessage(`Statement downloaded (${statementRows.length} records).`);
  };

  return (
    <div className="journey-page history-page">
      <div className="page-heading premium-heading">
        <div className="heading-copy">
          <h2>Payments History</h2>
          <div className="history-status-filter">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.label}
                type="button"
                className={historyStatusFilter === filter.key ? 'active' : ''}
                onClick={() => setHistoryStatusFilter(historyStatusFilter === filter.key ? null : filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        <div className="history-heading-actions">
          <div className="history-popover-wrap">
            <button type="button" className={`toolbar-btn ${statementOpen ? 'active' : ''}`} onClick={handleOpenStatement}>
              <FiFileText /> Account Statement
            </button>
            {statementOpen && (
              <>
                <div className="statement-modal-backdrop" onClick={() => setStatementOpen(false)} />
                <div
                  className="history-popover statement-popover"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Account Statement"
                  onClick={(event) => event.stopPropagation()}
                >
                  <label>
                    Account
                    <select value={statementAccountId} onChange={(event) => setStatementAccountId(event.target.value)}>
                      <option value="All">All Accounts</option>
                      {(accounts || []).map((account) => (
                        <option key={account.accountId} value={account.accountId}>
                          {account.bankName || 'Unknown Bank'}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>From date<input type="date" value={statementFromDate} onChange={(event) => setStatementFromDate(event.target.value)} /></label>
                  <label>To date<input type="date" value={statementToDate} onChange={(event) => setStatementToDate(event.target.value)} /></label>
                  <label>
                    Status
                    <select value={statementStatus} onChange={(event) => setStatementStatus(event.target.value)}>
                      <option value="ALL">All</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="FAILED">Failed</option>
                      <option value="PENDING">Pending</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </label>
                  <div className="popover-actions statement-actions">
                    <button type="button" className="popover-done statement-download-btn" onClick={downloadStatementCsv}>
                      <FiDownload /> Download CSV
                    </button>
                  </div>
                  {statementMessage && <p className="statement-message">{statementMessage}</p>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="history-panel premium-card">
        <div className="history-toolbar">
          <div className="history-search">
            <FiSearch />
            <input value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Search by receiver name, amount, or reference ID" />
          </div>

          <div className="history-popover-wrap">
            <button type="button" className="toolbar-btn" onClick={() => { setDateOpen((open) => !open); setFilterOpen(false); }}>
              <FiCalendar /> {dateLabel}
            </button>
            {dateOpen && (
              <div className="history-popover">
                <div className="date-mode-toggle">
                  <button type="button" className={dateMode === 'single' ? 'active' : ''} onClick={() => setDateMode('single')}>Single date</button>
                  <button type="button" className={dateMode === 'range' ? 'active' : ''} onClick={() => setDateMode('range')}>Date range</button>
                </div>
                {dateMode === 'single' ? (
                  <label>Date<input type="date" value={historyFromDate} onChange={(event) => handleSingleDateChange(event.target.value)} /></label>
                ) : (
                  <>
                    <label>From<input type="date" value={historyFromDate} onChange={(event) => setHistoryFromDate(event.target.value)} /></label>
                    <label>To<input type="date" value={historyToDate} onChange={(event) => setHistoryToDate(event.target.value)} /></label>
                  </>
                )}
                <div className="popover-actions">
                  <button type="button" className="popover-clear" onClick={() => { setHistoryFromDate(''); setHistoryToDate(''); }}>Clear</button>
                  <button type="button" className="popover-done" onClick={() => setDateOpen(false)}>Done</button>
                </div>
              </div>
            )}
          </div>

          <div className="history-popover-wrap">
            <button type="button" className={`toolbar-btn ${activeExtraFilters > 0 ? 'active' : ''}`} onClick={() => { setFilterOpen((open) => !open); setDateOpen(false); }}>
              <FiFilter /> {filterLabel} {activeExtraFilters > 0 && <span className="toolbar-badge">{activeExtraFilters}</span>}
            </button>
            {filterOpen && (
              <div className="history-popover">
                <label>
                  Account
                  <select value={historySenderAccountId} onChange={(event) => setHistorySenderAccountId(event.target.value)}>
                    <option value="All">All Accounts</option>
                    {(accounts || []).map((account) => (
                      <option key={account.accountId} value={account.accountId}>
                        {account.bankName || 'Unknown Bank'}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Payment Method
                  <select value={localHistoryPaymentMethod} onChange={(event) => handlePaymentMethodChange(event.target.value)}>
                    <option value="All">All Methods</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="SELF_TRANSFER">Self Transfer</option>
                  </select>
                </label>
                <label>
                  Category
                  <select value={localHistoryCategory} onChange={(event) => handleCategoryChange(event.target.value)}>
                    <option value="All">All Categories</option>
                    <option value="BILL_PAYMENTS">Bills</option>
                    <option value="SHOPPING">Shopping</option>
                    <option value="ENTERTAINMENT">Entertainment</option>
                    <option value="FOOD">Food</option>
                    <option value="OTHERS">Others</option>
                  </select>
                </label>
                <label>
                  Month
                  <select value={localHistoryMonth} onChange={(event) => handleMonthChange(event.target.value)}>
                    <option value="">All Months</option>
                    {monthOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label>Min amount<input type="number" min="0" value={historyMinAmount} onChange={(event) => setHistoryMinAmount(event.target.value)} /></label>
                <label>Max amount<input type="number" min="0" value={historyMaxAmount} onChange={(event) => setHistoryMaxAmount(event.target.value)} /></label>
                <div className="popover-actions">
                  <button type="button" className="popover-clear" onClick={() => { setHistorySenderAccountId('All'); setLocalHistoryPaymentMethod('All'); setHistoryPaymentMethod('All'); setLocalHistoryCategory('All'); setHistoryCategory('All'); setLocalHistoryMonth(''); setHistoryMonth(''); setHistoryFromDate(''); setHistoryToDate(''); setHistoryMinAmount(''); setHistoryMaxAmount(''); }}>Clear</button>
                  <button type="button" className="popover-done" onClick={() => setFilterOpen(false)}>Done</button>
                </div>
              </div>
            )}
          </div>

          <div className="history-sort">
            <span className="history-sort-label">Sort by</span>
            <label className="sort-checkbox">
              <input type="checkbox" checked={historySortDateEnabled} onChange={(event) => handleToggleDateSort(event.target.checked)} />
              Date
              {historySortDateEnabled && historySortAmountEnabled && (
                <span className="sort-priority">{historySortPrimary === 'date' ? 1 : 2}</span>
              )}
            </label>
            {historySortDateEnabled && (
              <button
                type="button"
                className="toolbar-btn active"
                onClick={() => setHistorySortDateDir(historySortDateDir === 'asc' ? 'desc' : 'asc')}
              >
                {historySortDateDir === 'asc' ? <FiArrowUp /> : <FiArrowDown />}
              </button>
            )}
            <label className="sort-checkbox">
              <input type="checkbox" checked={historySortAmountEnabled} onChange={(event) => handleToggleAmountSort(event.target.checked)} />
              Amount
              {historySortDateEnabled && historySortAmountEnabled && (
                <span className="sort-priority">{historySortPrimary === 'amount' ? 1 : 2}</span>
              )}
            </label>
            {historySortAmountEnabled && (
              <button
                type="button"
                className="toolbar-btn active"
                onClick={() => setHistorySortAmountDir(historySortAmountDir === 'asc' ? 'desc' : 'asc')}
              >
                {historySortAmountDir === 'asc' ? <FiArrowUp /> : <FiArrowDown />}
              </button>
            )}
          </div>

        </div>

        <div className="history-list-wrap">
          {pagedResults.length === 0 && (
            <div className="history-list-empty">No matching transactions found.</div>
          )}
          {pagedResults.map((payment) => {
            const destinationAccount = getAccount(accounts, payment.destinationAccountId);
            const cancelledRow = isCancelledRow(payment);
            const receiverName = payment.destinationAccountHolderName || destinationAccount?.accountHolderName || 'Recipient';
            const receiverBank = payment.destinationBankName || destinationAccount?.bankName || 'Bank transfer';
            const receiverAccount = getAccountNumberLabel(accounts, payment.destinationAccountId, payment.destinationAccountNumber);
            const statusMeta = getStatusMeta(payment.status || 'CREATED');
            return (
              <article
                key={payment.paymentId}
                className={`history-item-card ${cancelledRow ? 'disabled' : 'clickable'}`}
                onClick={cancelledRow ? undefined : () => onViewTransaction(payment)}
                onKeyDown={cancelledRow ? undefined : (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onViewTransaction(payment);
                  }
                }}
                role={cancelledRow ? undefined : 'button'}
                tabIndex={cancelledRow ? -1 : 0}
                aria-label={cancelledRow ? undefined : `Open transaction details for ${receiverName}`}
              >
                <div className="history-item-main">
                  <div className="history-item-icon"><RiBankLine /></div>
                  <div className="history-item-copy">
                    <strong>{receiverName}</strong>
                    <span>{receiverBank}</span>
                    <small>{receiverAccount} • {formatDateTime(payment.createdAt)}</small>
                  </div>
                </div>
                <div className="history-item-side">
                  <strong className="history-item-amount">{currency(payment.amount)}</strong>
                  <span className={`status-pill ${statusMeta.className}`}>
                    {statusMeta.label}
                  </span>
                  {cancelledRow && <span className="table-action-disabled">—</span>}
                </div>
              </article>
            );
          })}
        </div>

        <div className="history-footer">
          <div className="history-page-size">
            <label htmlFor="history-page-size">Rows per page</label>
            <select id="history-page-size" value={historyPageSize} onChange={(event) => setHistoryPageSize(Number(event.target.value))}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          {pageNumbers.length > 0 && (
            <div className="history-pagination">
              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  className={pageNumber === currentPage ? 'active' : ''}
                  onClick={() => onPageChange(pageNumber)}
                >
                  {pageNumber + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TransactionHistory;
