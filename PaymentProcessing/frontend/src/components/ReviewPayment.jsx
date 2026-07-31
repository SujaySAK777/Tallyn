import { FiCheckCircle, FiClock, FiCreditCard, FiShield } from 'react-icons/fi';

function ReviewPayment({
  formState,
  selectedDestination,
  referenceNumber,
  amountValue,
  grandTotal,
  currency,
  authenticating,
  submitting,
  onBack,
  onConfirm
}) {
  const recipientName = formState.recipientName || formState.accountHolder || 'Recipient Name';
  const recipientInitials = recipientName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'RP';
  const maskedAccountNumber = formState.accountNumber
    ? `•••• ${String(formState.accountNumber).slice(-4)}`
    : 'Pending';

  return (
    <div className="journey-page review-page">
      <div className="page-heading premium-heading">
        <div className="heading-copy">
          <h2>Review Payment Details</h2>
          <span className="review-subcopy">Final confirmation before initiating the transfer.</span>
        </div>
        <div className="status-chip review-status"><FiShield /> Secure Review</div>
      </div>

      <div className="review-layout">
        <div className="review-main-card premium-card">
          <section className="review-section review-beneficiary">
            <div className="review-section-head">
              <div className="review-section-title">Transfer To</div>
              <button type="button" className="table-action" onClick={onBack}>Edit</button>
            </div>
            <div className="review-party-grid review-party-grid-elevated">
              <div className="recipient-badge">{recipientInitials}</div>
              <div className="recipient-meta">
                <strong>{recipientName}</strong>
                <span className="meta-line">{formState.bankName || 'Bank name pending'}</span>
                <span className="meta-line">Account ID: {selectedDestination || formState.destinationAccountId || 'Pending'}</span>
                <span className="meta-line">A/C No: {maskedAccountNumber}</span>
                <span className="meta-line">IFSC: {formState.ifscCode || formState.ifsc || 'Pending'}</span>
              </div>
              <div className="trust-pill"><FiShield /> Verified Beneficiary</div>
            </div>
          </section>

          <section className="review-section">
            <div className="review-section-title">Payment Information</div>
            <div className="review-kv-grid">
              <div className="review-kv-card">
                <span className="review-kv-label">Amount</span>
                <strong className="review-kv-value">{currency(amountValue)}</strong>
              </div>
              <div className="review-kv-card">
                <span className="review-kv-label">Transfer Via</span>
                <strong className="review-kv-value">Bank Transfer</strong>
              </div>
              <div className="review-kv-card">
                <span className="review-kv-label">Reference Number</span>
                <strong className="review-kv-value review-mono">{referenceNumber}</strong>
              </div>
              <div className="review-kv-card">
                <span className="review-kv-label">Remarks</span>
                <strong className="review-kv-value">{formState.remarks || 'Payment'}</strong>
              </div>
            </div>
          </section>

          <section className="review-section review-section-tight">
            <div className="review-section-head">
              <div className="review-section-title">From Account</div>
              <button type="button" className="table-action" onClick={onBack}>Edit</button>
            </div>
            <div className="review-party-grid review-origin-grid">
              <div className="recipient-meta">
                <strong>Tallyn Savings</strong>
                <span className="meta-line">Source Account ID: {formState.sourceAccountId || 'Pending'}</span>
                <span className="meta-line">Transaction Type: Immediate</span>
              </div>
              <div className="account-pill"><FiCreditCard /> Primary Account</div>
            </div>
          </section>
        </div>

        <div className="summary-panel">
          <div className="payment-summary-box premium-card review-summary-primary">
            <div className="section-label">Payment Summary</div>
            <div className="info-row"><span>Amount</span><strong>{currency(amountValue)}</strong></div>
            <div className="info-row"><span>Transfer Charges</span><strong>{currency(0)}</strong></div>
            <div className="info-row total"><span>Total Payable</span><strong>{currency(grandTotal)}</strong></div>
          </div>

          <div className="security-banner premium-card review-security-card">
            <FiShield />
            <div>
              <strong>Secure Payment</strong>
              <p>Your payment is protected with 256-bit SSL encryption.</p>
            </div>
          </div>

          <div className="payment-summary-box premium-card review-summary-meta">
            <div className="info-row"><span><FiClock /> Estimated Time</span><strong>Within 5 minutes</strong></div>
            <div className="info-row"><span><FiCreditCard /> Transaction Type</span><strong>Immediate</strong></div>
          </div>

          <div className="payment-summary-box premium-card review-next-steps">
            <div className="section-label">What Happens Next</div>
            <div className="step-item"><FiCheckCircle /> Payment will be validated</div>
            <div className="step-item"><FiCheckCircle /> Funds will be processed securely</div>
            <div className="step-item"><FiCheckCircle /> You'll see final confirmation</div>
          </div>
        </div>
      </div>

      <div className="journey-actions premium-actions review-actions-row">
        <button type="button" className="secondary-btn" onClick={onBack}>Cancel</button>
        <button type="button" className="primary-btn" onClick={onConfirm} disabled={authenticating || submitting}>
          {authenticating || submitting ? 'Submitting...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

export default ReviewPayment;
