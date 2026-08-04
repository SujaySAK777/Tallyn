import { useState } from 'react';
import {
  FiArrowDown,
  FiArrowUp,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiFilter,
  FiSearch,
  FiSlash,
  FiXCircle
} from 'react-icons/fi';
import { RiBankLine } from 'react-icons/ri';

function getAccount(accounts, accountId) {
  return (accounts || []).find((account) => String(account.accountId) === String(accountId));
}

function getAccountLabel(accounts, accountId) {
  const match = getAccount(accounts, accountId);
  return match ? `${match.accountHolderName} (${match.accountNumber})` : accountId || 'Recipient';
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

const STAT_TILES = [
  { key: null, label: 'Total Payments', icon: FiClock, accent: 'total' },
  { key: 'COMPLETED', label: 'Successful', icon: FiCheckCircle, accent: 'success' },
  { key: 'FAILED', label: 'Failed', icon: FiXCircle, accent: 'failed' },
  { key: 'PENDING', label: 'Pending', icon: FiClock, accent: 'pending' },
  { key: 'CANCELLED', label: 'Cancelled', icon: FiSlash, accent: 'cancelled' }
];

function TransactionHistory({
  summary,
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

  const pageNumbers = Array.from({ length: pagination.totalPages }, (_, index) => index);
  const activeExtraFilters = [historySenderAccountId !== 'All', Boolean(historyMinAmount), Boolean(historyMaxAmount)].filter(Boolean).length;
  const selectedSenderAccount = historySenderAccountId !== 'All' ? getAccount(accounts, historySenderAccountId) : null;
  const filterLabel = selectedSenderAccount ? selectedSenderAccount.accountHolderName : 'Filter';
  const dateLabel = historyFromDate || historyToDate
    ? (dateMode === 'single'
        ? formatDateShort(historyFromDate || historyToDate)
        : `${historyFromDate ? formatDateShort(historyFromDate) : 'Any'} – ${historyToDate ? formatDateShort(historyToDate) : 'Any'}`)
    : 'Date';

  const tileValue = (key) => {
    if (key === null) return summary.total;
    if (key === 'COMPLETED') return summary.completed;
    if (key === 'FAILED') return summary.failed;
    if (key === 'CANCELLED') return summary.cancelled;
    return summary.pending;
  };

  const tileAmount = (key) => {
    if (key === null) return summary.totalAmount;
    if (key === 'COMPLETED') return summary.completedAmount;
    if (key === 'FAILED') return summary.failedAmount;
    if (key === 'CANCELLED') return summary.cancelledAmount;
    return summary.pendingAmount;
  };

  const toggleStatusTile = (key) => {
    setHistoryStatusFilter(historyStatusFilter === key ? null : key);
  };

  const handleSingleDateChange = (value) => {
    setHistoryFromDate(value);
    setHistoryToDate(value);
  };

  const handleToggleDateSort = (checked) => {
    setHistorySortDateEnabled(checked);
    if (checked) setHistorySortPrimary('date');
  };

  const handleToggleAmountSort = (checked) => {
    setHistorySortAmountEnabled(checked);
    if (checked) setHistorySortPrimary('amount');
  };

  return (
    <div className="journey-page history-page">
      <div className="page-heading premium-heading">
        <div className="heading-copy">
          <span className="eyebrow">Payments History</span>
          <h2>Payments History</h2>
          <p>Search, filter, and review every payment across your accounts.</p>
        </div>
      </div>

      <div className="history-stats">
        {STAT_TILES.map((tile) => {
          const Icon = tile.icon;
          const isActive = historyStatusFilter === tile.key;
          return (
            <button
              key={tile.label}
              type="button"
              className={`stat-tile stat-tile-${tile.accent} ${isActive ? 'active' : ''}`}
              onClick={() => toggleStatusTile(tile.key)}
            >
              <span className="stat-tile-icon"><Icon /></span>
              <span className="stat-tile-label">{tile.label}</span>
              <span className="stat-tile-value">{tileValue(tile.key)}</span>
              <span className="stat-tile-amount">{currency(tileAmount(tile.key))}</span>
            </button>
          );
        })}
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
                  Sender Account
                  <select value={historySenderAccountId} onChange={(event) => setHistorySenderAccountId(event.target.value)}>
                    <option value="All">All Accounts</option>
                    {(accounts || []).map((account) => (
                      <option key={account.accountId} value={account.accountId}>
                        {account.accountHolderName} ({account.accountNumber})
                      </option>
                    ))}
                  </select>
                </label>
                <label>Min amount<input type="number" min="0" value={historyMinAmount} onChange={(event) => setHistoryMinAmount(event.target.value)} /></label>
                <label>Max amount<input type="number" min="0" value={historyMaxAmount} onChange={(event) => setHistoryMaxAmount(event.target.value)} /></label>
                <div className="popover-actions">
                  <button type="button" className="popover-clear" onClick={() => { setHistorySenderAccountId('All'); setHistoryMinAmount(''); setHistoryMaxAmount(''); }}>Clear</button>
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

        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                <th>Sender</th>
                <th>Receiver</th>
                <th>Payment Method</th>
                <th>Reference ID</th>
                <th>Amount</th>
                <th>Status</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 && (
                <tr>
                  <td colSpan="8">No matching transactions found.</td>
                </tr>
              )}
              {results.map((payment) => {
                const destinationAccount = getAccount(accounts, payment.destinationAccountId);
                const cancelledRow = isCancelledRow(payment);
                return (
                  <tr key={payment.paymentId}>
                    <td>{formatDateTime(payment.createdAt)}</td>
                    <td>{getAccountLabel(accounts, payment.sourceAccountId)}</td>
                    <td>{getAccountLabel(accounts, payment.destinationAccountId)}</td>
                    <td>
                      <div className="method-cell">
                        <RiBankLine />
                        <div>
                          <div>Bank Transfer</div>
                          {destinationAccount?.bankName && <small>{destinationAccount.bankName}</small>}
                        </div>
                      </div>
                    </td>
                    <td>{payment.referenceNumber || '—'}</td>
                    <td>{currency(payment.amount)}</td>
                    <td><span className={`status-pill ${(payment.status || 'Created').toLowerCase()}`}>{payment.status || 'Created'}</span></td>
                    <td>
                      {cancelledRow ? (
                        <span className="table-action-disabled">—</span>
                      ) : (
                        <button type="button" className="table-action history-view-action" onClick={() => onViewTransaction(payment)} aria-label="View transaction details" title="View transaction details"><FiEye /></button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
                  className={pageNumber === pagination.page ? 'active' : ''}
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
