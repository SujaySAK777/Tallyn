import { FiCheckCircle, FiClock, FiInfo, FiShield } from 'react-icons/fi';

const STAGE_LABELS = {
  1: 'Validating payment...',
  2: 'Processing with bank...',
  3: 'Settling funds...',
  4: 'Finalizing...'
};

function ProcessingPayment({
  stage,
  formState,
  amountValue,
  currency,
  onClose
}) {
  const currentStage = stage || 1;
  const paymentCurrencyCode = formState.currency || 'INR';
  const beneficiaryName = formState.recipientName || formState.accountHolder || 'Recipient';
  const accountNumber = formState.destinationAccountNumber || formState.accountNumber || '—';
  const bankName = formState.bankName || '—';
  const base = new Date();
  const times = [0, 2, 4].map((m) => new Date(base.getTime() + m * 1000).toLocaleTimeString('en-IN'));

  const timelineItems = [
    { key: 1, label: 'Payment Created', detail: 'Your payment request has been created.', time: times[0] },
    { key: 2, label: 'Payment Validated', detail: 'Details validated successfully with the bank.', time: times[1] },
    { key: 3, label: 'Payment Processing', detail: 'Your payment is being processed. Please wait...', time: times[2] },
    { key: 4, label: 'Payment Completed', detail: 'Confirmation will be sent once the payment is completed.' }
  ];

  return (
    <div className="journey-page processing-page">
      <div className="page-heading premium-heading">
        <div className="heading-copy">
          <h2>Processing Your Payment</h2>
          <span className="processing-subcopy">Please do not close this window or press the back button.</span>
        </div>
        <div className="status-chip"><FiClock /> {STAGE_LABELS[currentStage] || 'Processing...'}</div>
      </div>

      <div className="processing-layout">
        <div className="timeline-card premium-card">
          <div className="section-label">Live Status</div>
          {timelineItems.map((item) => {
            const done = currentStage > item.key;
            const active = currentStage === item.key;
            return (
              <div key={item.label} className={`timeline-item ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
                <span className="timeline-dot">{done ? <FiCheckCircle /> : item.key}</span>
                <div className="timeline-copy">
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </div>
                <div className="timeline-meta">
                  {item.time && <span>{item.time}</span>}
                  <strong className={`timeline-pill ${done ? 'done' : active ? 'active' : ''}`}>
                    {done ? 'Completed' : active ? 'In Progress' : 'Pending'}
                  </strong>
                </div>
              </div>
            );
          })}
        </div>

        <div className="processing-summary-card premium-card">
          <div className="section-label">Payment Summary</div>
          <div className="info-row"><span>To</span><strong>{beneficiaryName}</strong></div>
          <div className="info-row"><span>Account Number</span><strong>{accountNumber}</strong></div>
          <div className="info-row"><span>Bank Name</span><strong>{bankName}</strong></div>
          <div className="info-row"><span>Amount</span><strong>{currency(amountValue, paymentCurrencyCode)}</strong></div>
          <div className="info-row"><span>Transfer Charges</span><strong>{currency(0, paymentCurrencyCode)}</strong></div>
          <div className="info-row total"><span>Total Payable</span><strong>{currency(amountValue, paymentCurrencyCode)}</strong></div>
        </div>

        <div className="premium-card processing-info-card">
          <div className="processing-info-title"><FiInfo /> Processing Information</div>
          <p>Payments are usually completed within 1-2 minutes depending on the bank.</p>
        </div>

        <div className="security-banner premium-card processing-security-card">
          <FiShield />
          <div>
            <strong>Safe & Secure Payments</strong>
            <p>Your transaction is protected with bank-grade security and 256-bit encryption.</p>
          </div>
        </div>
      </div>

      <div className="journey-actions premium-actions processing-cancel-row">
        <button type="button" className="secondary-btn" onClick={onClose}>Cancel Payment</button>
      </div>
    </div>
  );
}

export default ProcessingPayment;
