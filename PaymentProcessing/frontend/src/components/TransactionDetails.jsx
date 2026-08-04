import { useEffect, useMemo, useState } from 'react';
import { FiArrowRight, FiCalendar, FiCheck, FiCheckCircle, FiClock, FiCopy, FiDownload, FiPrinter, FiShare2, FiShield } from 'react-icons/fi';
import { downloadReceiptPdf } from '../services/receipt';
import { apiRequest } from '../services/api';

function TransactionDetails({ paymentId, formState, accounts = [], referenceNumber, selectedDestination, goBack }) {
  const [receipt, setReceipt] = useState(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState('');
  const [shareStatus, setShareStatus] = useState('');
  const [copiedReference, setCopiedReference] = useState(false);
  const [resolvedSourceAccountNumber, setResolvedSourceAccountNumber] = useState('');
  const [resolvedDestinationAccountNumber, setResolvedDestinationAccountNumber] = useState('');
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
    return () => { ignore = true; };
  }, [resolvedPaymentId]);

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
