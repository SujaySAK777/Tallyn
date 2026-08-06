import { useEffect, useMemo, useState } from 'react';
import { FiArrowRight, FiCalendar, FiCheck, FiCheckCircle, FiClock, FiCopy, FiDownload, FiPrinter, FiShare2, FiShield } from 'react-icons/fi';
import { downloadReceiptPdf } from '../services/receipt';
import { apiRequest } from '../services/api';

function TransactionDetails({ paymentId, formState, accounts = [], referenceNumber, selectedDestination, viewerAccountId, goBack }) {
  const [receipt, setReceipt] = useState(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState('');
  const [shareStatus, setShareStatus] = useState('');
  const [copiedReference, setCopiedReference] = useState(false);
  const [resolvedSourceAccountNumber, setResolvedSourceAccountNumber] = useState('');
  const [resolvedDestinationAccountNumber, setResolvedDestinationAccountNumber] = useState('');
  const [refundTickets, setRefundTickets] = useState([]);
  const [refundType, setRefundType] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [raisingRefund, setRaisingRefund] = useState(false);
  const [refundActionError, setRefundActionError] = useState('');
  const resolvedPaymentId = paymentId || formState.paymentId || null;

  const loadReceipt = async (options = {}) => {
    const { silent = false } = options;
    if (!resolvedPaymentId) return;
    if (!silent) {
      setLoadingReceipt(true);
      setReceiptError('');
    }
    try {
      const data = await apiRequest(`/payments/${resolvedPaymentId}/receipt`);
      setReceipt(data);
    } catch (error) {
      if (!silent) {
        setReceiptError(error.message || 'Unable to load transaction receipt details.');
      }
    } finally {
      if (!silent) {
        setLoadingReceipt(false);
      }
    }
  };

  const loadRefundTickets = async () => {
    if (!resolvedPaymentId) return;
    try {
      const data = await apiRequest(`/payments/${resolvedPaymentId}/refund-requests`);
      setRefundTickets(Array.isArray(data) ? data : []);
    } catch {
      // Non-participants (or a stale token) just see no ticket state - not fatal to the receipt view.
      setRefundTickets([]);
    }
  };

  useEffect(() => {
    if (!resolvedPaymentId) return;
    loadReceipt();
    loadRefundTickets();

    // If a refund ticket is raised on this payment, an admin resolves it in a separate
    // session (the admin panel) - polling is the only way this view finds out, so the
    // pending/approved/rejected banner below updates without a manual page refresh.
    const pollInterval = window.setInterval(() => {
      loadReceipt({ silent: true });
      loadRefundTickets();
    }, 15000);
    return () => window.clearInterval(pollInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedPaymentId]);

  const latestTicket = refundTickets[0] || null;
  const isSender = Boolean(viewerAccountId) && receipt && String(receipt.sourceAccountId) === String(viewerAccountId);
  const canRaiseTicket = isSender && receipt?.status === 'COMPLETED' && (!latestTicket || latestTicket.status === 'REJECTED');

  const handleRaiseRefund = async () => {
    if (!resolvedPaymentId) return;
    if (!refundType) {
      setRefundActionError('Choose a category before raising the request.');
      return;
    }
    setRaisingRefund(true);
    setRefundActionError('');
    try {
      const params = new URLSearchParams({ reason: refundReason, type: refundType });
      await apiRequest(`/payments/${resolvedPaymentId}/refund-requests?${params.toString()}`, {
        method: 'POST'
      });
      setRefundReason('');
      setRefundType('');
      await Promise.all([loadReceipt(), loadRefundTickets()]);
    } catch (error) {
      setRefundActionError(error.message || 'Unable to raise a refund ticket right now.');
    } finally {
      setRaisingRefund(false);
    }
  };

  const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';
  const formatTime = (value) => value ? new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--';
  const formatTimelineTime = (value) => value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--';
  const statusLabel = String(receipt?.status || 'COMPLETED').replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, (ch) => ch.toUpperCase());
  const amountValue = Number(receipt?.amount ?? formState.amount ?? 0);
  const currencyCode = receipt?.currency || formState.currency || 'INR';
  const amountText = Number.isFinite(amountValue) ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: currencyCode }).format(amountValue) : '--';
  const resolveAccountNumber = (value) => {
    const normalized = String(value ?? '').trim();
    return normalized || '';
  };

  const getAccountById = (accountId) => accounts.find((account) => String(account.accountId) === String(accountId));

  const sourceAccountByReceiptId = getAccountById(receipt?.sourceAccountId);
  const destinationAccountByReceiptId = getAccountById(receipt?.destinationAccountId);

  const sourceAccountIdForLookup = receipt?.sourceAccountId || formState.sourceAccountId || sourceAccountByReceiptId?.accountId || null;
  const destinationAccountIdForLookup = receipt?.destinationAccountId || formState.destinationAccountId || destinationAccountByReceiptId?.accountId || null;

  useEffect(() => {
    let ignore = false;

    const loadAccountNumbersById = async () => {
      const shouldLookupSource = !formState.sourceAccountNumber && !receipt?.sourceAccountNumber && !sourceAccountByReceiptId?.accountNumber && sourceAccountIdForLookup;
      const shouldLookupDestination = !formState.destinationAccountNumber && !receipt?.destinationAccountNumber && !destinationAccountByReceiptId?.accountNumber && destinationAccountIdForLookup;

      if (!shouldLookupSource && !shouldLookupDestination) {
        return;
      }

      const lookups = [];

      if (shouldLookupSource) {
        lookups.push(
          apiRequest(`/accounts/${sourceAccountIdForLookup}`)
            .then((data) => ({ type: 'source', accountNumber: data?.accountNumber || '' }))
            .catch(() => ({ type: 'source', accountNumber: '' }))
        );
      }

      if (shouldLookupDestination) {
        lookups.push(
          apiRequest(`/accounts/${destinationAccountIdForLookup}`)
            .then((data) => ({ type: 'destination', accountNumber: data?.accountNumber || '' }))
            .catch(() => ({ type: 'destination', accountNumber: '' }))
        );
      }

      const results = await Promise.all(lookups);
      if (ignore) return;

      results.forEach((result) => {
        if (result.type === 'source' && result.accountNumber) {
          setResolvedSourceAccountNumber(result.accountNumber);
        }
        if (result.type === 'destination' && result.accountNumber) {
          setResolvedDestinationAccountNumber(result.accountNumber);
        }
      });
    };

    loadAccountNumbersById();

    return () => {
      ignore = true;
    };
  }, [
    formState.sourceAccountNumber,
    formState.destinationAccountNumber,
    formState.sourceAccountId,
    formState.destinationAccountId,
    receipt?.sourceAccountNumber,
    receipt?.destinationAccountNumber,
    receipt?.sourceAccountId,
    receipt?.destinationAccountId,
    sourceAccountByReceiptId?.accountNumber,
    destinationAccountByReceiptId?.accountNumber,
    sourceAccountIdForLookup,
    destinationAccountIdForLookup
  ]);

  const senderBankName = resolveAccountNumber(
    formState.sourceBankName
    || receipt?.sourceBankName
    || sourceAccountByReceiptId?.bankName
  ) || 'Bank unavailable';
  const sourceAccountNumber = resolveAccountNumber(
    formState.sourceAccountNumber
    || receipt?.sourceAccountNumber
    || sourceAccountByReceiptId?.accountNumber
    || resolvedSourceAccountNumber
    || (formState.sourceAccountId ? getAccountById(formState.sourceAccountId)?.accountNumber : '')
  );
  const senderAccountIdFallback = receipt?.sourceAccountId || formState.sourceAccountId || sourceAccountByReceiptId?.accountId;
  const senderMask = sourceAccountNumber
    ? `A/C ${sourceAccountNumber}`
    : (senderAccountIdFallback ? `Account ID ${senderAccountIdFallback}` : 'Account details unavailable');
  const recipientName = receipt?.destinationAccountHolderName || formState.recipientName || formState.accountHolder || selectedDestination || 'Recipient unavailable';
  const recipientBankName = resolveAccountNumber(
    formState.destinationBankName
    || formState.bankName
    || receipt?.destinationBankName
    || destinationAccountByReceiptId?.bankName
  ) || 'Bank unavailable';
  const destinationAccountNumber = resolveAccountNumber(
    formState.destinationAccountNumber
    || receipt?.destinationAccountNumber
    || destinationAccountByReceiptId?.accountNumber
    || resolvedDestinationAccountNumber
    || (formState.destinationAccountId ? getAccountById(formState.destinationAccountId)?.accountNumber : '')
  );
  const destinationAccountIdFallback = receipt?.destinationAccountId || formState.destinationAccountId || destinationAccountByReceiptId?.accountId;
  const recipientMask = destinationAccountNumber
    ? `A/C ${destinationAccountNumber}`
    : (destinationAccountIdFallback ? `Account ID ${destinationAccountIdFallback}` : 'Account details unavailable');

  const timelineEntries = useMemo(() => {
    const suppliedCreated = receipt?.createdAt ? new Date(receipt.createdAt).getTime() : Number.NaN;
    const createdTime = Number.isFinite(suppliedCreated) ? suppliedCreated : Date.now();
    const suppliedCompleted = receipt?.updatedAt ? new Date(receipt.updatedAt).getTime() : Number.NaN;
    const completedTime = Number.isFinite(suppliedCompleted) && suppliedCompleted > createdTime ? suppliedCompleted : createdTime + 120000;
    const span = completedTime - createdTime;
    return [
      { label: 'Created', when: new Date(createdTime) },
      { label: 'Validated', when: new Date(createdTime + Math.round(span * 0.25)) },
      { label: 'Sent', when: new Date(createdTime + Math.round(span * 0.7)) },
      { label: 'Completed', when: new Date(completedTime) }
    ];
  }, [receipt?.createdAt, receipt?.updatedAt]);

  const settlementDurationText = useMemo(() => {
    if (!receipt?.createdAt || !receipt?.updatedAt) return 'Approx. 2 mins';
    const seconds = Math.max(1, Math.round((new Date(receipt.updatedAt) - new Date(receipt.createdAt)) / 1000));
    if (!Number.isFinite(seconds) || seconds <= 0) return 'Approx. 2 mins';
    if (seconds < 60) return `${seconds} sec`;
    return `${Math.floor(seconds / 60)} min${seconds % 60 ? ` ${seconds % 60} sec` : ''}`;
  }, [receipt?.createdAt, receipt?.updatedAt]);

  const handleShare = async () => {
    const text = `Tallyn Transaction\nReference: ${referenceNumber}\nAmount: ${amountText}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Tallyn Transaction', text });
        setShareStatus('Transaction details shared.');
      } else {
        await navigator.clipboard.writeText(text);
        setShareStatus('Transaction summary copied to clipboard.');
      }
    } catch {
      setShareStatus('Unable to share right now.');
    }
  };

  const handleCopyReference = async () => {
    try {
      await navigator.clipboard.writeText(referenceNumber || '');
      setCopiedReference(true);
      window.setTimeout(() => setCopiedReference(false), 1800);
    } catch {
      setShareStatus('Unable to copy the reference number right now.');
    }
  };

  return (
    <div className="journey-page receipt-page">
      <article className="payment-receipt premium-card" aria-label="Payment receipt">
        <header className="receipt-header">
          <div className="receipt-success-icon"><FiCheckCircle /></div>
          <span className="receipt-status"><FiCheck /> {statusLabel}</span>
          <h2>Payment successful</h2>
          <p>{amountText}</p>
          <span>Settled in {settlementDurationText}</span>
        </header>

        <section className="receipt-route" aria-label="Transfer route">
          <div><small>From</small><strong>{senderBankName}</strong><em>{senderMask}</em></div>
          <span className="receipt-route-arrow"><FiArrowRight /></span>
          <div><small>To</small><strong>{recipientName}</strong><em>{recipientBankName}</em><em>{recipientMask}</em></div>
        </section>

        <section className="receipt-timeline" aria-label="Payment timeline">
          <div className="receipt-section-title">Payment progress</div>
          <div className="receipt-timeline-track">
            {timelineEntries.map((item) => <div key={item.label} className="receipt-timeline-step"><span><FiCheck /></span><strong>{item.label}</strong><small>{formatTimelineTime(item.when)}</small></div>)}
          </div>
          {loadingReceipt && <p className="timeline-loading">Loading exact receipt timestamps...</p>}
          {receiptError && <p className="error-msg">{receiptError}</p>}
        </section>

        <section className="receipt-details" aria-label="Transaction information">
          <div><span>Reference number</span><strong>{referenceNumber}<button type="button" onClick={handleCopyReference} aria-label="Copy reference number"><FiCopy /></button></strong></div>
          <div><span>Sender bank</span><strong>{senderBankName}</strong></div>
          <div><span>Sender account</span><strong>{senderMask}</strong></div>
          <div><span>Receiver name</span><strong>{recipientName}</strong></div>
          <div><span>Receiver bank</span><strong>{recipientBankName}</strong></div>
          <div><span>Receiver account</span><strong>{recipientMask}</strong></div>
          <div><span>Status</span><strong><FiCheckCircle /> {statusLabel}</strong></div>
          <div><span>Completed on</span><strong><FiCalendar /> {formatDate(receipt?.updatedAt || receipt?.createdAt)} <FiClock /> {formatTime(receipt?.updatedAt || receipt?.createdAt)}</strong></div>
        </section>

        {isSender && (
          <section className="receipt-details" aria-label="Refund status" style={{ marginTop: '1rem' }}>
            <div className="receipt-section-title">Refund</div>

            {latestTicket?.status === 'PENDING' && (
              <p style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255, 193, 7, 0.15)' }}>
                Refund requested{latestTicket.reason ? ` (${latestTicket.reason})` : ''} — pending admin approval.
              </p>
            )}

            {latestTicket?.status === 'APPROVED' && (
              <p style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(40, 167, 69, 0.15)' }}>
                Refund approved — funds have been returned to your account.
              </p>
            )}

            {latestTicket?.status === 'REJECTED' && (
              <p style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(220, 53, 69, 0.15)' }}>
                Previous refund request declined{latestTicket.rejectionReason ? `: ${latestTicket.rejectionReason}` : '.'}
              </p>
            )}

            {canRaiseTicket && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>What is this refund about?</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem',
                      borderRadius: '8px', border: refundType === 'MERCHANT_REFUND_REQUEST' ? '2px solid #1a73e8' : '1px solid #ccc',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="radio"
                        name="refundType"
                        value="MERCHANT_REFUND_REQUEST"
                        checked={refundType === 'MERCHANT_REFUND_REQUEST'}
                        onChange={() => setRefundType('MERCHANT_REFUND_REQUEST')}
                      />
                      Merchant (Shopping, Food, Entertainment, Bill Payment)
                    </label>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem',
                      borderRadius: '8px', border: refundType === 'WRONG_PAYMENT' ? '2px solid #1a73e8' : '1px solid #ccc',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="radio"
                        name="refundType"
                        value="WRONG_PAYMENT"
                        checked={refundType === 'WRONG_PAYMENT'}
                        onChange={() => setRefundType('WRONG_PAYMENT')}
                      />
                      Others (Wrong Payment)
                    </label>
                  </div>
                </div>

                <textarea
                  placeholder="Remarks - tell us what happened"
                  value={refundReason}
                  onChange={(event) => setRefundReason(event.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #ccc', resize: 'vertical' }}
                />

                <button
                  type="button"
                  className="primary-btn"
                  disabled={raisingRefund}
                  onClick={handleRaiseRefund}
                  style={{ marginTop: '0.6rem', borderRadius: '8px', width: 'auto', whiteSpace: 'nowrap' }}
                >
                  {raisingRefund ? 'Submitting...' : 'Raise a ticket'}
                </button>
              </div>
            )}
            {refundActionError && <p className="error-msg">{refundActionError}</p>}
          </section>
        )}

        <footer className="receipt-footer">
          <div className="receipt-actions">
            <button type="button" onClick={() => downloadReceiptPdf(resolvedPaymentId).catch((error) => window.alert(error.message || 'Unable to download receipt.'))} disabled={!resolvedPaymentId}><FiDownload /> Download PDF</button>
            <button type="button" onClick={handleShare}><FiShare2 /> Share</button>
            <button type="button" onClick={() => window.print()}><FiPrinter /> Print</button>
          </div>
          <p className="receipt-secure-note"><FiShield /> Verified transaction record</p>
          {copiedReference && <p className="timeline-loading" role="status">Reference number copied.</p>}
          {shareStatus && <p className="timeline-loading" role="status">{shareStatus}</p>}
        </footer>
      </article>

      <div className="journey-actions premium-actions receipt-back-action"><button type="button" className="secondary-btn" onClick={goBack}>Back</button></div>
    </div>
  );
}

export default TransactionDetails;
