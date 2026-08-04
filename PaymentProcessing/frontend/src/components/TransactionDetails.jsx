import { FiAlertCircle, FiCheckCircle, FiDownload, FiPrinter, FiShare2 } from 'react-icons/fi';
import { downloadReceiptPdf } from '../services/receipt';

function TransactionDetails({
  paymentId,
  formState,
  referenceNumber,
  selectedDestination,
  goBack
}) {
  const handleDownloadReceipt = async () => {
    try {
      await downloadReceiptPdf(paymentId || formState.paymentId);
    } catch (error) {
      window.alert(error.message || 'Unable to download receipt.');
    }
  };

  return (
    <div className="journey-page transaction-page">
      <div className="page-heading premium-heading">
        <div className="heading-copy">
          <span className="eyebrow">Transaction Details</span>
          <h2>Transaction Details</h2>
          <p>Everything you need to verify or share the transfer.</p>
        </div>
        <div className="status-chip success-chip"><FiCheckCircle /> Completed</div>
      </div>

      <div className="review-layout">
        <div className="review-grid premium-review-grid">
          <div className="summary-card premium-card">
            <small>Payment ID</small>
            <strong>{formState.paymentId || referenceNumber}</strong>
            <span>Internal tracking identifier</span>
          </div>
          <div className="summary-card premium-card">
            <small>Reference Number</small>
            <strong>{referenceNumber}</strong>
            <span>Bank reference for the transaction</span>
          </div>
          <div className="summary-card premium-card">
            <small>Sender</small>
            <strong>{formState.sourceAccountNumber ? `•••• ${String(formState.sourceAccountNumber).slice(-4)}` : 'Source account'}</strong>
            <span>Your bank account</span>
          </div>
          <div className="summary-card premium-card">
            <small>Recipient</small>
            <strong>{selectedDestination || formState.recipientName || formState.accountHolder || 'Recipient Name'}</strong>
            <span>{formState.destinationAccountNumber ? `•••• ${String(formState.destinationAccountNumber).slice(-4)}` : 'Account pending'}</span>
          </div>
        </div>

        <div className="summary-panel">
          <div className="transaction-summary-card premium-card">
            <div className="section-label">Timeline</div>
            {['Created', 'Validated', 'Sent', 'Completed'].map((label, index) => (
              <div key={label} className="timeline-item done">
                <span className="timeline-dot"><FiCheckCircle /></span>
                <div>
                  <strong>{label}</strong>
                  <small>{index === 3 ? 'Settled successfully' : 'Recorded'}</small>
                </div>
              </div>
            ))}
          </div>

          <div className="receipt-card premium-card">
            <div className="section-label">Actions</div>
            <div className="receipt-actions vertical-actions">
              <button type="button" onClick={handleDownloadReceipt} disabled={!paymentId && !formState.paymentId}><FiDownload /> Download PDF</button>
              <button type="button"><FiShare2 /> Share</button>
              <button type="button"><FiPrinter /> Print</button>
              <button type="button"><FiAlertCircle /> Report Issue</button>
            </div>
          </div>
        </div>
      </div>

      <div className="journey-actions premium-actions">
        <button type="button" className="secondary-btn" onClick={goBack}>Back</button>
      </div>
    </div>
  );
}

export default TransactionDetails;
