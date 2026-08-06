import { useEffect, useRef, useState } from 'react';
import { FiCheckCircle, FiDownload, FiExternalLink, FiRefreshCw, FiShare2 } from 'react-icons/fi';
import { createReceiptPdfFile, downloadReceiptPdf, saveReceiptPdfFile } from '../services/receipt';

function SuccessPage({
  paymentId,
  referenceNumber,
  selectedDestination,
  formState,
  amountValue,
  currency,
  onStepChange,
  onClose,
  isSelfTransfer = false,
  beneficiaries = [],
  onSaveBeneficiary
}) {
  const [shareStatus, setShareStatus] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);
  const [saveBeneficiaryStatus, setSaveBeneficiaryStatus] = useState('idle');
  const hasPlayedNotificationRef = useRef(false);
  const beneficiaryName = formState.recipientName || formState.accountHolder || selectedDestination || 'Recipient';
  const accountNumber = formState.destinationAccountNumber || formState.accountNumber || '—';
  const bankName = formState.bankName || '—';
  const ifsc = formState.ifscCode || formState.ifsc || '—';
  const alreadySavedBeneficiary = beneficiaries.some((beneficiary) => beneficiary.accountNumber === accountNumber);
  const canShowBeneficiaryCard = !isSelfTransfer && accountNumber !== '—' && typeof onSaveBeneficiary === 'function';

  useEffect(() => {
    if (hasPlayedNotificationRef.current) {
      return undefined;
    }

    if (typeof window === 'undefined') {
      return undefined;
    }

    let audioContext;
    let resumeTimeoutId;

    const playNotificationSound = () => {
      if (hasPlayedNotificationRef.current) {
        return;
      }

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        return;
      }

      audioContext = new AudioCtx();
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, now);
      oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.16);

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.14, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.22);

      hasPlayedNotificationRef.current = true;
      oscillator.onended = () => {
        if (audioContext && typeof audioContext.close === 'function') {
          audioContext.close();
        }
      };
    };

    const playOnFirstInteraction = () => {
      playNotificationSound();
      window.removeEventListener('pointerdown', playOnFirstInteraction);
      window.removeEventListener('keydown', playOnFirstInteraction);
    };

    playNotificationSound();

    if (!hasPlayedNotificationRef.current) {
      window.addEventListener('pointerdown', playOnFirstInteraction, { once: true });
      window.addEventListener('keydown', playOnFirstInteraction, { once: true });
      resumeTimeoutId = window.setTimeout(playNotificationSound, 250);
    }

    return () => {
      if (resumeTimeoutId) {
        window.clearTimeout(resumeTimeoutId);
      }
      window.removeEventListener('pointerdown', playOnFirstInteraction);
      window.removeEventListener('keydown', playOnFirstInteraction);
      if (audioContext && typeof audioContext.close === 'function' && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, []);

  const handleSaveBeneficiary = async () => {
    setSaveBeneficiaryStatus('saving');
    try {
      await onSaveBeneficiary({ accountNumber });
      setSaveBeneficiaryStatus('saved');
    } catch (error) {
      setSaveBeneficiaryStatus('error');
    }
  };
  const receiptSummary = [
    'Tallyn payment receipt',
    `Amount: ${currency(amountValue)}`,
    `Recipient: ${beneficiaryName}`,
    `Reference: ${referenceNumber}`
  ].join('\n');

  const handleDownloadReceipt = async () => {
    try {
      await downloadReceiptPdf(paymentId);
    } catch (error) {
      window.alert(error.message || 'Unable to download receipt.');
    }
  };

  const handleSharePdf = async () => {
    if (!paymentId) {
      setShareStatus('The payment receipt is not available yet.');
      return;
    }

    setSharingPdf(true);
    try {
      const receiptFile = await createReceiptPdfFile(paymentId);
      const shareData = {
        title: 'Tallyn payment receipt',
        text: `Payment receipt: ${referenceNumber}`,
        files: [receiptFile]
      };

      if (navigator.canShare?.(shareData) && navigator.share) {
        await navigator.share(shareData);
        setShareStatus('The receipt PDF was shared.');
        return;
      }

      saveReceiptPdfFile(receiptFile);
      setShareStatus('The exact PDF receipt was downloaded. Attach this file in Gmail or WhatsApp Web.');
    } catch (error) {
      if (error.name !== 'AbortError') {
        setShareStatus(error.message || 'Unable to prepare the PDF receipt.');
      }
    } finally {
      setSharingPdf(false);
    }
  };

  return (
    <div className="journey-page success-page enhanced-success-page">
      <div className="review-layout success-receipt-layout">
        <div className="premium-card success-main-card success-payment-card">
          <div className="success-center-wrap">
            <div className="success-icon"><FiCheckCircle /></div>
            <h2>{isSelfTransfer ? 'Transfer Successful!' : 'Payment Successful!'}</h2>
            <span className="success-subcopy">{isSelfTransfer ? 'Your funds have been moved between your accounts successfully.' : 'Your payment has been completed successfully.'}</span>
            <div className="success-tx-pill">Transaction ID: {referenceNumber}</div>
            <div className="success-time">{new Date().toLocaleString('en-IN')}</div>
          </div>

          <div className="success-actions-grid">
            <button type="button" onClick={() => onStepChange('transaction')}><FiExternalLink /> View Transaction</button>
            <button type="button" onClick={handleDownloadReceipt} disabled={!paymentId}><FiDownload /> Download Receipt</button>
            <button type="button" onClick={() => { setShareOpen(true); setShareStatus(''); }}><FiShare2 /> Share Receipt</button>
            <button type="button" onClick={onClose}><FiRefreshCw /> Make Another Payment</button>
          </div>

          {shareStatus && <p className="success-share-status" role="status">{shareStatus}</p>}

          <div className="success-transfer-strip">
            <FiCheckCircle />
            <div>
              <strong>The amount {currency(amountValue)} has been transferred to {isSelfTransfer ? 'your account' : beneficiaryName}</strong>
              <span>You will receive a confirmation notification shortly.</span>
            </div>
          </div>

          {canShowBeneficiaryCard && saveBeneficiaryStatus !== 'declined' && (
            <div className="save-beneficiary-card">
              {alreadySavedBeneficiary ? (
                <div className="save-beneficiary-confirmed"><FiCheckCircle /> {beneficiaryName} is already in your beneficiaries.</div>
              ) : saveBeneficiaryStatus === 'saved' ? (
                <div className="save-beneficiary-confirmed"><FiCheckCircle /> {beneficiaryName} saved as a beneficiary.</div>
              ) : (
                <>
                  <div className="save-beneficiary-copy">
                    <strong>Save {beneficiaryName} as a beneficiary?</strong>
                    <span>Make your next transfer to them faster.</span>
                  </div>
                  <div className="save-beneficiary-actions">
                    <button type="button" className="secondary-btn" onClick={() => setSaveBeneficiaryStatus('declined')} disabled={saveBeneficiaryStatus === 'saving'}>No, thanks</button>
                    <button type="button" className="primary-btn" onClick={handleSaveBeneficiary} disabled={saveBeneficiaryStatus === 'saving'}>
                      {saveBeneficiaryStatus === 'saving' ? 'Saving...' : 'Yes, save'}
                    </button>
                  </div>
                  {saveBeneficiaryStatus === 'error' && <p className="error-msg">Unable to save beneficiary. You can try again from the Beneficiaries page.</p>}
                </>
              )}
            </div>
          )}
        </div>

        <div className="summary-panel success-summary-panel">
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

      {shareOpen && (
        <div className="share-receipt-overlay" role="presentation" onClick={() => setShareOpen(false)}>
          <section className="share-receipt-dialog" role="dialog" aria-modal="true" aria-labelledby="share-receipt-title" onClick={(event) => event.stopPropagation()}>
            <div className="share-receipt-heading">
              <div>
                <h3 id="share-receipt-title">Share Receipt</h3>
                <p>Share the exact same PDF generated by Download Receipt.</p>
              </div>
              <button type="button" className="share-close" onClick={() => setShareOpen(false)} aria-label="Close share receipt">×</button>
            </div>

            <pre className="share-receipt-preview">{receiptSummary}</pre>

            <div className="share-receipt-actions">
              <button type="button" className="primary-btn" onClick={handleSharePdf} disabled={sharingPdf || !paymentId}>
                {sharingPdf ? 'Preparing PDF...' : 'Share PDF Receipt'}
              </button>
              <button type="button" className="secondary-btn" onClick={handleDownloadReceipt} disabled={!paymentId}>Download PDF</button>
            </div>

            {shareStatus && <p className="share-receipt-status" role="status">{shareStatus}</p>}
          </section>
        </div>
      )}
    </div>
  );
}

export default SuccessPage;
