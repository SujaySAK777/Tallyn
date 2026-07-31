import { FiCheckCircle, FiDownload, FiExternalLink, FiRefreshCw, FiShare2 } from 'react-icons/fi';

function SuccessPage({
  referenceNumber,
  selectedDestination,
  formState,
  amountValue,
  currency,
  onStepChange,
  onClose
}) {
  const beneficiaryName = formState.recipientName || formState.accountHolder || selectedDestination || 'John Doe';
  const accountNumber = formState.accountNumber || String(formState.destinationAccountId || '').trim() || '1234 5678 9012';
  const bankName = formState.bankName || 'HDFC Bank';
  const ifsc = formState.ifscCode || formState.ifsc || 'HDFC0001234';

  return (
    <div className="journey-page success-page">
      <div className="review-layout">
        <div className="premium-card success-main-card">
          <div className="success-center-wrap">
            <div className="success-icon"><FiCheckCircle /></div>
            <h2>Payment Successful!</h2>
            <span className="success-subcopy">Your payment has been completed successfully.</span>
            <div className="success-tx-pill">Transaction ID: {referenceNumber}</div>
            <div className="success-time">{new Date().toLocaleString('en-IN')}</div>
          </div>

          <div className="success-actions-grid">
            <button type="button" onClick={() => onStepChange('transaction')}><FiExternalLink /> View Transaction</button>
            <button type="button"><FiDownload /> Download Receipt</button>
            <button type="button"><FiShare2 /> Share Receipt</button>
            <button type="button" onClick={onClose}><FiRefreshCw /> Make Another Payment</button>
          </div>

          <div className="success-transfer-strip">
            <FiCheckCircle />
            <div>
              <strong>The amount {currency(amountValue)} has been transferred to {beneficiaryName}</strong>
              <span>You will receive a confirmation notification shortly.</span>
            </div>
          </div>
        </div>

        <div className="summary-panel">
          <div className="payment-summary-box premium-card success-summary-card">
            <div className="section-label">Payment Summary</div>
            <div className="info-row"><span>To</span><strong>{beneficiaryName}</strong></div>
            <div className="info-row"><span>Account Number</span><strong>{accountNumber}</strong></div>
            <div className="info-row"><span>Bank Name</span><strong>{bankName}</strong></div>
            <div className="info-row"><span>IFSC Code</span><strong>{ifsc}</strong></div>
            <div className="info-row"><span>Amount</span><strong>{currency(amountValue)}</strong></div>
            <div className="info-row"><span>Transfer Charges</span><strong>{currency(0)}</strong></div>
            <div className="info-row total"><span>Total Payable</span><strong>{currency(amountValue)}</strong></div>
          </div>

          <div className="security-banner premium-card success-security-card">
            <FiCheckCircle />
            <div>
              <strong>Safe & Secure</strong>
              <p>Your transaction is protected with 256-bit SSL encryption and bank-grade security.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="premium-card success-help-row">
        <div>
          <strong>Need Help?</strong>
          <span>If you face any issues, please contact our support team. We are here to help!</span>
        </div>
        <button type="button">Contact Support</button>
      </div>
    </div>
  );
}

export default SuccessPage;
