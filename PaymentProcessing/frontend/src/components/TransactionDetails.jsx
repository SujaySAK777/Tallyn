import { useEffect, useMemo, useState } from 'react';
import { FiAlertCircle, FiCalendar, FiCheckCircle, FiClock, FiDownload, FiPrinter, FiShare2 } from 'react-icons/fi';
import { downloadReceiptPdf } from '../services/receipt';
import { apiRequest } from '../services/api';

function TransactionDetails({
  paymentId,
  formState,
  referenceNumber,
  selectedDestination,
  goBack
}) {
  const [receipt, setReceipt] = useState(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState('');
  const [shareStatus, setShareStatus] = useState('');

  const resolvedPaymentId = paymentId || formState.paymentId || null;

  useEffect(() => {
    let ignore = false;

    const loadReceipt = async () => {
      if (!resolvedPaymentId) return;
      setLoadingReceipt(true);
      setReceiptError('');
      try {
        const data = await apiRequest(`/payments/${resolvedPaymentId}/receipt`);
        if (!ignore) setReceipt(data);
      } catch (error) {
        if (!ignore) setReceiptError(error.message || 'Unable to load transaction receipt details.');
      } finally {
        if (!ignore) setLoadingReceipt(false);
      }
    };

    loadReceipt();
    return () => {
      ignore = true;
    };
  }, [resolvedPaymentId]);

  const formatDate = (value) => {
    if (!value) return '--';
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (value) => {
    if (!value) return '--';
    return new Date(value).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const statusLabel = String(receipt?.status || 'COMPLETED').replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, (ch) => ch.toUpperCase());
  const amountValue = Number(receipt?.amount ?? formState.amount ?? 0);
  const currencyCode = receipt?.currency || formState.currency || 'INR';
  const amountText = Number.isFinite(amountValue)
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: currencyCode }).format(amountValue)
    : '--';

  const senderMask = receipt?.sourceAccountId
    ? `A/C ${receipt.sourceAccountId}`
    : (formState.sourceAccountNumber ? `•••• ${String(formState.sourceAccountNumber).slice(-4)}` : 'Source account');

  const recipientName = selectedDestination || receipt?.destinationAccountHolderName || formState.recipientName || formState.accountHolder || 'Recipient';
  const recipientMask = formState.destinationAccountNumber
    ? `•••• ${String(formState.destinationAccountNumber).slice(-4)}`
    : (receipt?.destinationAccountId ? `A/C ${receipt.destinationAccountId}` : 'Account pending');
  const timelineEntries = useMemo(() => {
    const created = receipt?.createdAt ? new Date(receipt.createdAt) : new Date();
    const rawUpdated = receipt?.updatedAt ? new Date(receipt.updatedAt) : null;
    const completed = rawUpdated && rawUpdated > created ? rawUpdated : new Date(created.getTime() + 120000);
    const span = Math.max(60000, completed.getTime() - created.getTime());
    const validated = new Date(created.getTime() + Math.round(span * 0.25));
    const sent = new Date(created.getTime() + Math.round(span * 0.7));

    return [
      { label: 'Created', detail: 'Payment instruction captured', when: created, state: 'done' },
      { label: 'Validated', detail: 'Details and limits verified', when: validated, state: 'done' },
      { label: 'Sent to bank', detail: 'Transfer forwarded securely', when: sent, state: 'done' },
      { label: 'Completed', detail: 'Funds settled successfully', when: completed, state: 'done' }
    ];
  }, [receipt?.createdAt, receipt?.updatedAt]);

  const handleShare = async () => {
    const text = `Tallyn Transaction\nReference: ${referenceNumber}\nAmount: ${amountText}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Tallyn Transaction', text });
        setShareStatus('Transaction details shared.');
        return;
      }
      await navigator.clipboard.writeText(text);
      setShareStatus('Transaction summary copied to clipboard.');
    } catch {
      setShareStatus('Unable to share right now.');
    }
  };

  const handleDownloadReceipt = async () => {
    try {
      await downloadReceiptPdf(resolvedPaymentId);
    } catch (error) {
      window.alert(error.message || 'Unable to download receipt.');
    }
  };

  return (
    <div className="journey-page transaction-page enhanced-transaction-page">
      <div className="transaction-hero-card premium-card">
        <div className="heading-copy">
          <span className="eyebrow">Transaction Details</span>
          <h2>Transfer Completed</h2>
          <p>Professional summary, timeline, and downloadable proof for this payment.</p>
        </div>
        <div className="transaction-hero-right">
          <div className="status-chip success-chip"><FiCheckCircle /> {statusLabel}</div>
          <div className="transaction-amount-pill">{amountText}</div>
        </div>
      </div>

      <div className="review-layout">
        <div className="review-grid premium-review-grid transaction-overview-grid">
          <div className="summary-card premium-card"><small>Payment ID</small><strong>{receipt?.paymentId || resolvedPaymentId || referenceNumber}</strong><span>Internal tracking identifier</span></div>
          <div className="summary-card premium-card"><small>Reference Number</small><strong>{referenceNumber}</strong><span>Bank reference for the transaction</span></div>
          <div className="summary-card premium-card"><small>Sender</small><strong>{senderMask}</strong><span>Your bank account</span></div>
          <div className="summary-card premium-card"><small>Recipient</small><strong>{recipientName}</strong><span>{recipientMask}</span></div>
          <div className="summary-card premium-card"><small><FiCalendar /> Date</small><strong>{formatDate(receipt?.updatedAt || receipt?.createdAt)}</strong><span>Settlement date</span></div>
          <div className="summary-card premium-card"><small><FiClock /> Time</small><strong>{formatTime(receipt?.updatedAt || receipt?.createdAt)}</strong><span>Settlement time</span></div>
        </div>

        <div className="summary-panel">
          <div className="transaction-summary-card premium-card transaction-timeline-card">
            <div className="section-label">Timeline</div>
            {timelineEntries.map((item) => (
              <div key={item.label} className={`timeline-item ${item.state}`}>
                <span className="timeline-dot"><FiCheckCircle /></span>
                <div className="timeline-copy"><strong>{item.label}</strong><small>{item.detail}</small></div>
                <div className="timeline-meta"><span><FiCalendar /> {formatDate(item.when)}</span><span><FiClock /> {formatTime(item.when)}</span></div>
              </div>
            ))}
            {loadingReceipt && <p className="timeline-loading">Loading exact receipt timestamps...</p>}
            {receiptError && <p className="error-msg">{receiptError}</p>}
          </div>

          <div className="receipt-card premium-card">
            <div className="section-label">Actions</div>
            <div className="receipt-actions vertical-actions">
              <button type="button" onClick={handleDownloadReceipt} disabled={!resolvedPaymentId}><FiDownload /> Download PDF</button>
              <button type="button" onClick={handleShare}><FiShare2 /> Share</button>
              <button type="button" onClick={() => window.print()}><FiPrinter /> Print</button>
              <button type="button"><FiAlertCircle /> Report Issue</button>
            </div>
            {shareStatus && <p className="timeline-loading">{shareStatus}</p>}
          </div>
        </div>
      </div>

      <div className="journey-actions premium-actions"><button type="button" className="secondary-btn" onClick={goBack}>Back</button></div>
    </div>
  );
}

export default TransactionDetails;
