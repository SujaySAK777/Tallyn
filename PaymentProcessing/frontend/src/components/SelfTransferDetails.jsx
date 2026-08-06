import React, { useEffect, useState } from 'react';
import { FiArrowDown, FiCheckCircle, FiRepeat } from 'react-icons/fi';
import { apiRequest } from '../services/api';

export default function SelfTransferDetails({
  formData,
  setFormData,
  previousStep,
  nextStep,
  sourceBalance = 0,
  accounts = []
}) {
  const [fxQuote, setFxQuote] = useState(null);
  const [fxQuoteError, setFxQuoteError] = useState('');
  const currencyOptions = ['INR', 'USD', 'EUR', 'GBP'];
  const sourceId = String(formData.sourceAccountId || '').trim();
  const destinationId = String(formData.destinationAccountId || '').trim();
  const transferAmount = Number(formData.amount);
  const balanceAfterPayment = sourceBalance - (Number.isFinite(transferAmount) ? transferAmount : 0);
  const destinationOptions = accounts.filter((account) => String(account.accountId) !== sourceId);
  const sourceAccount = accounts.find((account) => String(account.accountId) === sourceId);
  const destinationAccount = accounts.find((account) => String(account.accountId) === destinationId);

  useEffect(() => {
    const from = sourceAccount?.currency;
    const to = destinationAccount?.currency;
    if (!from || !to || from === to || !Number.isFinite(transferAmount) || transferAmount <= 0) {
      setFxQuote(null);
      setFxQuoteError('');
      return undefined;
    }
    let cancelled = false;
    apiRequest(`/fx/quote?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=${encodeURIComponent(transferAmount)}`)
      .then((quote) => { if (!cancelled) { setFxQuote(quote); setFxQuoteError(''); } })
      .catch((err) => { if (!cancelled) { setFxQuote(null); setFxQuoteError(err.message || 'Unable to retrieve the FX quote.'); } });
    return () => { cancelled = true; };
  }, [sourceAccount?.currency, destinationAccount?.currency, transferAmount]);

  const handleSourceChange = (event) => {
    const nextSourceId = event.target.value;
    const nextSourceAccount = accounts.find((account) => String(account.accountId) === String(nextSourceId));
    const shouldClearDestination = nextSourceId && nextSourceId === destinationId;
    setFormData({
      ...formData,
      sourceAccountId: nextSourceId,
      sourceAccountNumber: nextSourceAccount?.accountNumber || '',
      ...(shouldClearDestination
        ? { destinationAccountId: '', destinationAccountNumber: '', accountHolder: '', bankName: '', ifsc: '' }
        : {})
    });
  };

  const handleDestinationChange = (event) => {
    const nextDestinationId = event.target.value;
    const nextDestinationAccount = accounts.find((account) => String(account.accountId) === String(nextDestinationId));
    setFormData({
      ...formData,
      destinationAccountId: nextDestinationId,
      destinationAccountNumber: nextDestinationAccount?.accountNumber || '',
      accountHolder: nextDestinationAccount?.accountHolderName || '',
      bankName: nextDestinationAccount?.bankName || '',
      ifsc: nextDestinationAccount?.ifscCode || ''
    });
  };

  const handleSwapAccounts = () => {
    if (!sourceId || !destinationId) return;
    setFormData({
      ...formData,
      sourceAccountId: destinationId,
      sourceAccountNumber: destinationAccount?.accountNumber || '',
      destinationAccountId: sourceId,
      destinationAccountNumber: sourceAccount?.accountNumber || '',
      accountHolder: sourceAccount?.accountHolderName || '',
      bankName: sourceAccount?.bankName || '',
      ifsc: sourceAccount?.ifscCode || ''
    });
  };

  const handleAmountChange = (event) => {
    setFormData({ ...formData, amount: event.target.value });
  };

  const handleRemarksChange = (event) => {
    setFormData({ ...formData, remarks: event.target.value });
  };

  const isValid =
    /^\d+$/.test(sourceId) &&
    /^\d+$/.test(destinationId) &&
    sourceId !== destinationId &&
    Number.isFinite(transferAmount) &&
    transferAmount > 0;

  return (
    <div className="bank-container">
      <div className="section-title">
        <h2>Self Account Transfer</h2>
        <p>Move money instantly between your own linked accounts.</p>
      </div>

      <div className="bank-layout">
        <div className="bank-form">
          <div className="bank-form-grid">
            <div className="field-group field-span-2">
              <div className="self-transfer-pair">
                <div className="field-group">
                  <label>From Account</label>
                  <select name="sourceAccountId" value={formData.sourceAccountId || ''} onChange={handleSourceChange}>
                    <option value="">Select an account</option>
                    {accounts.map((account) => (
                      <option key={account.accountId} value={account.accountId}>
                        {account.accountNumber} — {account.bankName}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className="self-transfer-swap"
                  onClick={handleSwapAccounts}
                  disabled={!sourceId || !destinationId}
                  aria-label="Swap from and to accounts"
                  title="Swap accounts"
                >
                  <FiRepeat />
                </button>

                <div className="field-group">
                  <label>To Account</label>
                  <select
                    name="destinationAccountId"
                    value={formData.destinationAccountId || ''}
                    onChange={handleDestinationChange}
                    disabled={!sourceId}
                  >
                    <option value="">Select an account</option>
                    {destinationOptions.map((account) => (
                      <option key={account.accountId} value={account.accountId}>
                        {account.accountNumber} — {account.bankName}
                      </option>
                    ))}
                  </select>
                  {sourceId && destinationOptions.length === 0 && (
                    <div className="error-msg">Add another linked account to transfer between your own accounts.</div>
                  )}
                </div>
              </div>
            </div>

            {sourceAccount && destinationAccount && (
              <div className="field-group field-span-2">
                <div className="recipient-found-banner self-transfer-route">
                  <span className="recipient-found-avatar">{sourceAccount.bankName?.slice(0, 2).toUpperCase() || 'AC'}</span>
                  <div className="recipient-found-meta">
                    <strong>•••• {String(sourceAccount.accountNumber).slice(-4)}</strong>
                    <span>{sourceAccount.bankName}</span>
                  </div>
                  <FiArrowDown className="self-transfer-route-arrow" />
                  <div className="recipient-found-meta">
                    <strong>•••• {String(destinationAccount.accountNumber).slice(-4)}</strong>
                    <span>{destinationAccount.bankName}</span>
                  </div>
                  <span className="recipient-found-check"><FiCheckCircle /> Ready</span>
                </div>
              </div>
            )}

            <div className="field-group">
              <label>Amount</label>
              <input
                type="number"
                name="amount"
                value={formData.amount || ''}
                onChange={handleAmountChange}
                placeholder="1000"
              />
              <div className="transfer-toggle" role="radiogroup" aria-label="Choose transfer currency">
                {currencyOptions.map((currencyCode) => (
                  <button
                    key={currencyCode}
                    type="button"
                    className={(formData.currency || 'INR') === currencyCode ? 'active' : ''}
                    aria-pressed={(formData.currency || 'INR') === currencyCode}
                    onClick={() => setFormData({ ...formData, currency: currencyCode })}
                  >
                    {currencyCode}
                  </button>
                ))}
              </div>
              {Number.isFinite(transferAmount) && transferAmount > 0 && (
                <div className={`live-balance-preview ${balanceAfterPayment < 0 ? 'insufficient' : ''}`}>
                  <span>Balance after transfer</span>
                  <strong>{sourceAccount?.currency || formData.currency || 'INR'} {balanceAfterPayment.toLocaleString('en-IN')}</strong>
                </div>
              )}
              {fxQuote && <div className="fx-quote-card"><strong>{fxQuote.sourceAmount} {fxQuote.sourceCurrency} → {fxQuote.destinationAmount} {fxQuote.destinationCurrency}</strong><span>Rate: 1 {fxQuote.sourceCurrency} = {fxQuote.exchangeRate} {fxQuote.destinationCurrency}</span></div>}
              {fxQuoteError && <div className="error-msg">FX quote: {fxQuoteError}</div>}
            </div>

            <div className="field-group field-span-2">
              <label>Remarks</label>
              <textarea
                rows="2"
                name="remarks"
                value={formData.remarks || ''}
                onChange={handleRemarksChange}
                placeholder="Optional"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bottom-buttons">
        <button className="secondary-btn" onClick={previousStep} type="button">Back</button>
        <button className="primary-btn" disabled={!isValid} onClick={nextStep} type="button">
          Review Transfer
        </button>
      </div>
    </div>
  );
}

