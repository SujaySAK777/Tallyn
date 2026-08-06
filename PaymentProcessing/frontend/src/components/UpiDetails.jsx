import React, { useEffect, useState } from 'react';
import { FiCheckCircle, FiLoader, FiSmartphone } from 'react-icons/fi';
import { apiRequest } from '../services/api';

export default function UpiDetails({
  formData,
  setFormData,
  previousStep,
  nextStep,
  sourceBalance = 0,
  accounts = []
}) {
  const [lookupError, setLookupError] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [fxQuote, setFxQuote] = useState(null);
  const [fxQuoteError, setFxQuoteError] = useState('');
  const currencyOptions = ['INR', 'USD', 'EUR', 'GBP'];
  const sourceId = String(formData.sourceAccountId || '').trim();
  const transferAmount = Number(formData.amount);
  const sourceAccount = accounts.find((account) => String(account.accountId) === sourceId);
  const balanceAfterPayment = sourceBalance - (Number.isFinite(transferAmount) ? transferAmount : 0);

  useEffect(() => {
    const from = sourceAccount?.currency;
    const to = formData.destinationCurrency;
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
  }, [sourceAccount?.currency, formData.destinationCurrency, transferAmount]);

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSourceAccountChange = (event) => {
    const nextSourceAccountId = event.target.value;
    const nextSourceAccount = accounts.find((account) => String(account.accountId) === String(nextSourceAccountId));
    setFormData({
      ...formData,
      sourceAccountId: nextSourceAccountId,
      sourceAccountNumber: nextSourceAccount?.accountNumber || ''
    });
  };

  const handleUpiIdChange = (event) => {
    setFormData({
      ...formData,
      upiId: event.target.value,
      destinationAccountId: '',
      destinationAccountNumber: '',
      destinationCurrency: '',
      accountHolder: '',
      bankName: '',
      ifsc: ''
    });
    setLookupError('');
  };

  const lookupUpiId = async () => {
    const upiId = String(formData.upiId || '').trim();
    if (!upiId) return;
    setIsLookingUp(true);
    try {
      const account = await apiRequest(`/accounts/upi/${encodeURIComponent(upiId)}`);
      setFormData({
        ...formData,
        upiId,
        destinationAccountId: String(account.accountId),
        destinationAccountNumber: account.accountNumber,
        destinationCurrency: account.currency || '',
        accountHolder: account.accountHolderName,
        bankName: account.bankName,
        ifsc: account.ifscCode || ''
      });
      setLookupError('');
    } catch (error) {
      setLookupError(error.message || 'This UPI ID is not linked to any account.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const isValid =
    /^\d+$/.test(sourceId) &&
    /^\d+$/.test(String(formData.destinationAccountId || '')) &&
    formData.accountHolder &&
    Number.isFinite(transferAmount) &&
    transferAmount > 0;

  return (
    <div className="bank-container">
      <div className="section-title">
        <h2>Pay via UPI</h2>
        <p>Enter the recipient's UPI ID to send money instantly.</p>
      </div>

      <div className="bank-layout">
        <div className="bank-form">
          <div className="bank-form-grid">
            <div className="field-group">
              <label>Pay From</label>
              <select name="sourceAccountId" value={formData.sourceAccountId || ''} onChange={handleSourceAccountChange}>
                <option value="">Select an account</option>
                {accounts.map((account) => (
                  <option key={account.accountId} value={account.accountId}>
                    {account.accountNumber} — {account.bankName}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label>Recipient UPI ID</label>
              <div className="upi-id-input">
                <FiSmartphone />
                <input
                  name="upiId"
                  value={formData.upiId || ''}
                  onChange={handleUpiIdChange}
                  onBlur={lookupUpiId}
                  placeholder="name@tallyn"
                />
              </div>
              {isLookingUp && <div className="lookup-status"><FiLoader className="spin-icon" /> Verifying UPI ID...</div>}
              {lookupError && <div className="error-msg">{lookupError}</div>}
            </div>

            {formData.accountHolder && !lookupError && !isLookingUp && (
              <div className="field-group field-span-2">
                <div className="recipient-found-banner">
                  <span className="recipient-found-avatar">{String(formData.accountHolder).slice(0, 2).toUpperCase()}</span>
                  <div className="recipient-found-meta">
                    <strong>{formData.accountHolder}</strong>
                    <span>{formData.bankName || 'Bank details unavailable'} · {formData.upiId}</span>
                  </div>
                  <span className="recipient-found-check"><FiCheckCircle /> Verified</span>
                </div>
              </div>
            )}

            {formData.accountHolder && (
              <>
                <div className="field-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount || ''}
                    onChange={handleChange}
                    placeholder="1000"
                  />
                  <div className="transfer-toggle" role="radiogroup" aria-label="Choose payment currency">
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
                      <span>Balance after payment</span>
                      <strong>{sourceAccount?.currency || formData.currency || 'INR'} {balanceAfterPayment.toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                  {fxQuote && <div className="fx-quote-card"><strong>{fxQuote.sourceAmount} {fxQuote.sourceCurrency} → {fxQuote.destinationAmount} {fxQuote.destinationCurrency}</strong><span>Rate: 1 {fxQuote.sourceCurrency} = {fxQuote.exchangeRate} {fxQuote.destinationCurrency}</span></div>}
                  {fxQuoteError && <div className="error-msg">FX quote: {fxQuoteError}</div>}
                </div>

                <div className="field-group">
                  <label>Category</label>
                  <select name="category" value={formData.category || 'OTHERS'} onChange={handleChange}>
                    <option value="BILL_PAYMENTS">Bills</option>
                    <option value="SHOPPING">Shopping</option>
                    <option value="ENTERTAINMENT">Entertainment</option>
                    <option value="FOOD">Food</option>
                    <option value="OTHERS">Other</option>
                  </select>
                </div>

                <div className="field-group">
                  <label>Remarks</label>
                  <input
                    type="text"
                    name="remarks"
                    value={formData.remarks || ''}
                    onChange={handleChange}
                    placeholder="Optional"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bottom-buttons">
        <button className="secondary-btn" onClick={previousStep} type="button">Back</button>
        <button className="primary-btn" disabled={!isValid} onClick={nextStep} type="button">
          Review Payment
        </button>
      </div>
    </div>
  );
}
