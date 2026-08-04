import React, { useState } from 'react';
import { apiRequest } from '../services/api';

export default function BankDetails({
  formData,
  setFormData,
  previousStep,
  nextStep,
  sourceBalance = 0,
  accounts = []
}) {
  const [lookupError, setLookupError] = useState('');
  const sourceId = String(formData.sourceAccountId || '').trim();
  const destinationId = String(formData.destinationAccountId || '').trim();
  const sourceIdValid = /^\d+$/.test(sourceId);
  const destinationIdValid = /^\d+$/.test(destinationId);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value
    });
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

  const lookupDestination = async () => {
    const accountNumber = String(formData.destinationAccountNumber || '').trim();
    if (!accountNumber) return;
    try {
      const account = await apiRequest(`/accounts/number/${encodeURIComponent(accountNumber)}`);
      setFormData({ ...formData, destinationAccountId: String(account.accountId), accountHolder: account.accountHolderName, bankName: account.bankName, ifsc: account.ifscCode || '' });
      setLookupError('');
    } catch (error) {
      setLookupError(error.message || 'Recipient account was not found.');
    }
  };

  const transferAmount = Number(formData.amount);
  const balanceAfterPayment = sourceBalance - (Number.isFinite(transferAmount) ? transferAmount : 0);
  const isValid =
    sourceIdValid &&
    destinationIdValid &&
    String(formData.destinationAccountNumber || '').trim() &&
    formData.accountHolder &&
    formData.bankName &&
    Number.isFinite(transferAmount) &&
    transferAmount > 0;

  return (
    <div className="bank-container">
      <div className="section-title">
        <h2>Bank Transfer Details</h2>
          <p>Enter the recipient account number to fetch their bank details.</p>
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
              <label>Recipient Account Number</label>
              <input
                name="destinationAccountNumber"
                value={formData.destinationAccountNumber || ''}
                onChange={(event) => {
                  handleChange(event);
                  setFormData({
                    ...formData,
                    destinationAccountNumber: event.target.value,
                    destinationAccountId: '',
                    accountHolder: '',
                    bankName: '',
                    ifsc: ''
                  });
                  setLookupError('');
                }}
                onBlur={lookupDestination}
                placeholder="Enter recipient account number"
              />
              {lookupError && <div className="error-msg">{lookupError}</div>}
            </div>

            <div className="field-group">
              <label>Account Holder Name</label>
              <input
                name="accountHolder"
                value={formData.accountHolder || ''}
                placeholder=""
                readOnly
              />
            </div>

            <div className="field-group">
              <label>Recipient Bank</label>
              <input
                name="bankName"
                value={formData.bankName || ''}
                placeholder=""
                readOnly
              />
            </div>

            <div className="field-group">
              <label>IFSC Code</label>
              <input name="ifsc" value={formData.ifsc || ''} placeholder="" readOnly />
            </div>

            <div className="field-group">
              <label>Amount</label>
              <input
                type="number"
                name="amount"
                value={formData.amount || ''}
                onChange={handleChange}
                placeholder="1000"
              />
              {Number.isFinite(transferAmount) && transferAmount > 0 && (
                <div className={`live-balance-preview ${balanceAfterPayment < 0 ? 'insufficient' : ''}`}>
                  <span>Balance after payment</span>
                  <strong>INR {balanceAfterPayment.toLocaleString('en-IN')}</strong>
                </div>
              )}
            </div>

            <div className="field-group field-span-2">
              <label>Remarks</label>
              <textarea
                rows="2"
                name="remarks"
                value={formData.remarks || ''}
                onChange={handleChange}
                placeholder="Optional"
              />
            </div>
          </div>
        </div>

      </div>

      <div className="bottom-buttons">
        <button className="secondary-btn" onClick={previousStep} type="button">Back</button>

        <button
          className="primary-btn"
          disabled={!isValid}
          onClick={nextStep}
          type="button"
        >
          Review Payment
        </button>
      </div>
    </div>
  );
}
