import { useRef, useState } from 'react';
import { FiAlertTriangle, FiLock, FiShield, FiX } from 'react-icons/fi';

function AuthorizePayment({
  formState,
  selectedDestination,
  referenceNumber,
  amountValue,
  currency,
  authenticating,
  submitting,
  duplicatePayment,
  onBack,
  onAuthorize
}) {
  const pinInputRef = useRef(null);
  const [pin, setPin] = useState('');
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const beneficiaryName = formState.recipientName || formState.accountHolder || selectedDestination || 'John Doe';
  const accountNumber = formState.destinationAccountNumber || formState.accountNumber || '—';
  const bankName = formState.bankName || '—';

  const handlePinChange = (event) => {
    const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(digitsOnly);
  };

  const handleAuthorizeClick = () => {
    if (pin.length < 6) {
      return;
    }
    if (duplicatePayment) {
      setShowDuplicateWarning(true);
      return;
    }
    onAuthorize?.();
  };

  const focusPinInput = () => {
    pinInputRef.current?.focus();
  };

  return (
    <div className="journey-page authorize-page">
      <div className="page-heading premium-heading">
        <div className="heading-copy">
          <h2>Confirm & Authorize</h2>
          <span className="authorize-subcopy">Authorize your payment to continue</span>
        </div>
        <div className="status-chip"><FiLock /> Authorization Required</div>
      </div>

      <div className="review-layout authorize-layout">
        <div className="premium-card authorize-main-card">
          <div className="authorize-tabs" role="tablist" aria-label="Authorization methods">
            <button type="button" className="authorize-tab active" role="tab" aria-selected="true">Transaction PIN</button>
          </div>

          <div className="authorize-pin-card" onClick={focusPinInput}>
            <div className="authorize-pin-title">Enter Transaction PIN</div>
            <span className="authorize-pin-hint">Enter your 6 digit transaction PIN</span>

            <input
              ref={pinInputRef}
              className="authorize-pin-input"
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={pin}
              onChange={handlePinChange}
              maxLength={6}
              autoFocus
              aria-label="Enter 6 digit transaction PIN"
            />

            <div className="authorize-pin-grid" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, index) => {
                const filled = index < pin.length;
                const active = index === pin.length && pin.length < 6;
                return (
                  <div key={index} className={`pin-cell ${active ? 'pin-cell-active' : ''}`}>
                    {filled ? '●' : active ? '|' : ''}
                  </div>
                );
              })}
            </div>

            <div className="authorize-ref-row">
              <span>Reference Number</span>
              <strong>{referenceNumber}</strong>
            </div>
          </div>

          <div className="authorize-secure-note"><FiShield /> Your payment is secured with 256-bit encryption.</div>

          <div className="journey-actions premium-actions authorize-actions-row">
            <button type="button" className="secondary-btn" onClick={onBack} disabled={authenticating || submitting}>Back</button>
            <button type="button" className="primary-btn" onClick={handleAuthorizeClick} disabled={authenticating || submitting || pin.length < 6}>
              {authenticating || submitting ? 'Authorizing...' : 'Authorize Payment'}
            </button>
          </div>
        </div>

        <div className="summary-panel">
          <div className="payment-summary-box premium-card authorize-summary-card">
            <div className="section-label">Payment Summary</div>
            <div className="info-row"><span>To</span><strong>{beneficiaryName}</strong></div>
            <div className="info-row"><span>Account Number</span><strong>{accountNumber}</strong></div>
            <div className="info-row"><span>Bank Name</span><strong>{bankName}</strong></div>
            <div className="info-row"><span>Amount</span><strong>{currency(amountValue)}</strong></div>
            <div className="info-row"><span>Transfer Charges</span><strong>{currency(0)}</strong></div>
            <div className="info-row total"><span>Total Payable</span><strong>{currency(amountValue)}</strong></div>
          </div>

          <div className="premium-card authorize-safe-card">
            <div className="section-label">Safe & Secure</div>
            <div className="authorize-safe-item">Bank-grade security</div>
            <div className="authorize-safe-item">PIN is never stored</div>
            <div className="authorize-safe-item">You are in a secure environment</div>
          </div>
        </div>
      </div>

      {showDuplicateWarning && (
        <div className="duplicate-overlay" role="dialog" aria-modal="true" aria-labelledby="duplicate-payment-title">
          <div className="duplicate-dialog premium-card">
            <button type="button" className="duplicate-close" aria-label="Close" onClick={() => setShowDuplicateWarning(false)}><FiX /></button>
            <div className="duplicate-icon"><FiAlertTriangle /></div>
            <span className="eyebrow">Similar payment detected</span>
            <h3 id="duplicate-payment-title">Check before sending again</h3>
            <p>You already transferred {currency(amountValue)} to {beneficiaryName} in the last 5 minutes.</p>
            <div className="duplicate-actions">
              <button type="button" className="secondary-btn" onClick={() => setShowDuplicateWarning(false)}>Cancel</button>
              <button type="button" className="primary-btn" onClick={() => { setShowDuplicateWarning(false); onAuthorize?.(pin); }}>Continue anyway</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuthorizePayment;
