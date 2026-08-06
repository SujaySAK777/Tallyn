import { FiArrowDownRight, FiCheckCircle, FiEdit3, FiShield, FiTrendingUp } from 'react-icons/fi';

function ReviewPayment({
  formState,
  referenceNumber,
  amountValue,
  grandTotal,
  currency,
  sourceBalance,
  monthlySpent,
  monthlyBudget,
  categoryBudget = 0,
  categorySpent = 0,
  authenticating,
  submitting,
  onBack,
  onConfirm,
  isSelfTransfer = false,
  isUpi = false
}) {
  const paymentCurrencyCode = formState.currency || 'INR';
  const recipientName = formState.recipientName || formState.accountHolder || 'Recipient';
  const accountNumber = String(formState.destinationAccountNumber || formState.accountNumber || '');
  const maskedAccount = accountNumber ? `•••• ${accountNumber.slice(-4)}` : '—';
  const remainingBalance = sourceBalance - grandTotal;
  const projectedSpend = monthlySpent + grandTotal;
  const budgetPercent = monthlyBudget > 0 ? Math.min((projectedSpend / monthlyBudget) * 100, 100) : 0;
  const projectedCategorySpend = categorySpent + grandTotal;
  const categoryPercent = categoryBudget > 0 ? Math.min((projectedCategorySpend / categoryBudget) * 100, 100) : 0;
  const spendingState = projectedSpend <= monthlyBudget * 0.7
    ? { label: 'Healthy spending', className: 'healthy' }
    : projectedSpend <= monthlyBudget
      ? { label: 'Close to your budget', className: 'watch' }
      : { label: 'Over monthly budget', className: 'over' };

  return (
    <div className="journey-page review-page">
      <div className="page-heading premium-heading">
        <div className="heading-copy">
          <h2>{isSelfTransfer ? 'Review your transfer' : 'Review your payment'}</h2>
          <span className="review-subcopy">{isSelfTransfer ? 'Check both accounts and the transfer impact before authorizing.' : 'Check the recipient and payment impact before authorizing.'}</span>
        </div>
        <div className="status-chip review-status"><FiShield /> Verified details</div>
      </div>

      <div className="review-layout">
        <main className="review-main-card premium-card review-clean-card">
          <section className="review-section review-beneficiary">
            <div className="review-section-head">
              <div className="review-section-title">{isSelfTransfer ? 'Transferring to' : 'Paying to'}</div>
              <button type="button" className="table-action" onClick={onBack}><FiEdit3 /> Edit</button>
            </div>
            <div className="recipient-row">
              <div className="recipient-badge">{recipientName.slice(0, 2).toUpperCase()}</div>
              <div className="recipient-meta">
                <strong>{recipientName}</strong>
                {isUpi
                  ? <span>{formState.bankName || 'Bank details unavailable'} · {formState.upiId || '—'}</span>
                  : (
                    <>
                      <span>{formState.bankName || 'Bank details unavailable'} · {maskedAccount}</span>
                      <span>IFSC: {formState.ifscCode || formState.ifsc || '—'}</span>
                    </>
                  )}
              </div>
              <span className="verified-badge"><FiCheckCircle /> Verified</span>
            </div>
          </section>

          <section className="review-section review-payment-amount">
            <span className="review-kv-label">{isSelfTransfer ? 'You are transferring' : 'You are paying'}</span>
            <strong className="review-amount">{currency(amountValue, paymentCurrencyCode)}</strong>
            <span className="review-reference">Reference: {referenceNumber}</span>
          </section>

          <section className="review-section review-detail-list">
            <div><span>From</span><strong>{formState.sourceAccountNumber ? `Account ending ${String(formState.sourceAccountNumber).slice(-4)}` : 'Linked account'}</strong></div>
            <div><span>Transfer type</span><strong>{isSelfTransfer ? 'Self account transfer' : isUpi ? 'UPI payment' : 'Immediate bank transfer'}</strong></div>
            <div><span>Remarks</span><strong>{formState.remarks || '—'}</strong></div>
          </section>

          <section className="review-section review-actions-row">
            <button type="button" className="secondary-btn" onClick={onBack}>Back</button>
            <button type="button" className="primary-btn" onClick={onConfirm} disabled={authenticating || submitting}>
              Continue to authorize
            </button>
          </section>
        </main>

        <aside className="summary-panel review-insights">
          <div className="payment-summary-box premium-card impact-card">
            <div className="section-label">Payment impact</div>
            <div className="balance-impact"><span>Current balance</span><strong>{currency(sourceBalance, paymentCurrencyCode)}</strong></div>
            <div className="impact-arrow"><FiArrowDownRight /></div>
            <div className={`balance-impact remaining ${remainingBalance < 0 ? 'negative' : ''}`}><span>Balance after payment</span><strong>{currency(remainingBalance, paymentCurrencyCode)}</strong></div>
          </div>

          {monthlyBudget > 0 && <div className="payment-summary-box premium-card budget-card">
            <div className="budget-heading"><div><span className="section-label">Monthly budget</span><strong className={spendingState.className}><FiTrendingUp /> {spendingState.label}</strong></div></div>
            <div className="budget-amounts"><span>Spent after this payment</span><strong>{currency(projectedSpend, paymentCurrencyCode)} / {currency(monthlyBudget, paymentCurrencyCode)}</strong></div>
            <div className="budget-track"><span className={spendingState.className} style={{ width: `${budgetPercent}%` }} /></div>
            {categoryBudget > 0 && <><div className="budget-amounts category-budget"><span>Category after payment</span><strong>{currency(projectedCategorySpend, paymentCurrencyCode)} / {currency(categoryBudget, paymentCurrencyCode)}</strong></div><div className="budget-track category-track"><span className={projectedCategorySpend > categoryBudget ? 'over' : 'healthy'} style={{ width: `${categoryPercent}%` }} /></div></>}
            <small>{currency(amountValue, paymentCurrencyCode)} will be added to this month’s outgoing payments.</small>
          </div>}

          <div className="payment-summary-box premium-card payable-card">
            <span>Total payable</span><strong>{currency(grandTotal, paymentCurrencyCode)}</strong>
            <small>No transfer fee</small>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default ReviewPayment;
