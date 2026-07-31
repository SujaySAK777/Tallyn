import { FiAlertCircle, FiDownload, FiEdit3, FiRefreshCw } from 'react-icons/fi';

function FailedPayment({
  errorMessage,
  onStepChange,
  goBack
}) {
  return (
    <div className="journey-page failed-page">
      <div className="failed-banner premium-card">
        <div className="failed-icon"><FiAlertCircle /></div>
        <div>
          <div className="failed-eyebrow eyebrow">Payment Failed</div>
          <h2>Payment could not be completed</h2>
          <p>{errorMessage || 'Please review the details and try again.'}</p>
        </div>
      </div>

      <div className="review-layout">
        <div className="review-grid premium-review-grid">
          <div className="summary-card premium-card">
            <small>Error Message</small>
            <strong>{errorMessage || 'Unknown error'}</strong>
            <span>Returned by the payment server</span>
          </div>
        </div>

        <div className="summary-panel">
          <div className="suggestion-card premium-card">
            <div className="section-label">Suggestions</div>
            <ul className="suggestion-list">
              <li>Retry the payment.</li>
              <li>Edit the account or IFSC details.</li>
              <li>Contact support if the issue persists.</li>
            </ul>
            <div className="receipt-actions vertical-actions">
              <button type="button" onClick={() => onStepChange('review')}><FiRefreshCw /> Retry</button>
              <button type="button" onClick={goBack}><FiEdit3 /> Back</button>
              <button type="button"><FiDownload /> Download Error Report</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FailedPayment;
