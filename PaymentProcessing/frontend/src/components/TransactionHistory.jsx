import { FiDownload, FiFilter, FiSearch } from 'react-icons/fi';

function TransactionHistory({
  historyQuery,
  setHistoryQuery,
  historyStatus,
  setHistoryStatus,
  historyMethod,
  setHistoryMethod,
  historyDate,
  setHistoryDate,
  historyAmount,
  setHistoryAmount,
  filteredHistory,
  currency,
  onStepChange
}) {
  const visibleHistory = filteredHistory.slice(0, 5);

  return (
    <div className="journey-page history-page">
      <div className="page-heading premium-heading">
        <div className="heading-copy">
          <span className="eyebrow">Transaction History</span>
          <h2>Transaction History</h2>
          <p>Search, filter, export, and review all payment activity.</p>
        </div>
        <div className="status-chip"><FiFilter /> History Tools</div>
      </div>

      <div className="history-panel premium-card">
        <div className="history-search">
          <FiSearch />
          <input value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Search by payment ID, reference, or recipient" />
        </div>

        <div className="history-filters">
          <select value={historyStatus} onChange={(event) => setHistoryStatus(event.target.value)}>
            <option>All</option>
            <option>Created</option>
            <option>Processing</option>
            <option>Completed</option>
            <option>Failed</option>
          </select>
          <select value={historyMethod} onChange={(event) => setHistoryMethod(event.target.value)}>
            <option>All</option>
            <option>Bank Transfer</option>
          </select>
          <input type="date" value={historyDate} onChange={(event) => setHistoryDate(event.target.value)} />
          <input type="number" min="0" placeholder="Min amount" value={historyAmount} onChange={(event) => setHistoryAmount(event.target.value)} />
        </div>

        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Recipient</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleHistory.length === 0 && (
                <tr>
                  <td colSpan="6">No matching transactions found.</td>
                </tr>
              )}
              {visibleHistory.map((payment) => (
                <tr key={payment.paymentId}>
                  <td>{payment.paymentId}</td>
                  <td>{payment.destinationAccountId || 'Recipient'}</td>
                  <td>{currency(payment.amount)}</td>
                  <td><span className={`status-pill ${(payment.status || 'Created').toLowerCase()}`}>{payment.status || 'Created'}</span></td>
                  <td>{payment.createdAt ? new Date(payment.createdAt).toLocaleDateString('en-IN') : 'N/A'}</td>
                  <td><button type="button" className="table-action" onClick={() => onStepChange('transaction')}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="history-footer">
          <div className="history-actions">
            <button type="button"><FiDownload /> Export CSV</button>
            <button type="button"><FiDownload /> Export PDF</button>
          </div>
          <div className="history-pagination">
            <button type="button" className="active">1</button>
            <button type="button">2</button>
            <button type="button">3</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TransactionHistory;
