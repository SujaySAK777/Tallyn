import React from 'react';

export default function BankDetails({
  formData,
  setFormData,
  previousStep,
  nextStep,
  balance = 50000
}) {
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

  const isValid =
    sourceIdValid &&
    destinationIdValid &&
    formData.accountHolder &&
    formData.accountNumber &&
    formData.confirmAccountNumber &&
    formData.accountNumber === formData.confirmAccountNumber &&
    formData.ifsc &&
    formData.bankName &&
    formData.amount;

  return (
    <div className="bank-container">
      <div className="section-title">
        <h2>Bank Transfer Details</h2>
        <p>Enter account IDs and beneficiary details to continue.</p>
      </div>

      <div className="bank-layout">
        <div className="bank-form">
          <div className="details-tip">
            Use valid source and destination account IDs from your backend account table.
          </div>

          <div className="bank-form-grid">
            <div className="field-group">
              <label>Source Account ID (Debited)</label>
              <input
                name="sourceAccountId"
                value={formData.sourceAccountId || ''}
                onChange={handleChange}
                placeholder="1"
              />
              {sourceId && !sourceIdValid && (
                <div className="error-msg">Enter numeric account ID only (example: 1).</div>
              )}
              <small>Example: your own active account ID</small>
            </div>

            <div className="field-group">
              <label>Destination Account ID (Credited)</label>
              <input
                name="destinationAccountId"
                value={formData.destinationAccountId || ''}
                onChange={handleChange}
                placeholder="2"
              />
              {destinationId && !destinationIdValid && (
                <div className="error-msg">Enter numeric account ID only (example: 2).</div>
              )}
              <small>Must be different from Source Account ID</small>
            </div>

            <div className="field-group">
              <label>Account Holder Name</label>
              <input
                name="accountHolder"
                value={formData.accountHolder || ''}
                onChange={handleChange}
                placeholder="John Smith"
              />
            </div>

            <div className="field-group">
              <label>Account Number</label>
              <input
                name="accountNumber"
                value={formData.accountNumber || ''}
                onChange={handleChange}
                placeholder="123456789012"
              />
            </div>

            <div className="field-group">
              <label>Confirm Account Number</label>
              <input
                name="confirmAccountNumber"
                value={formData.confirmAccountNumber || ''}
                onChange={handleChange}
                placeholder="Re-enter account number"
              />
              {formData.confirmAccountNumber &&
                formData.accountNumber !== formData.confirmAccountNumber && (
                  <div className="error-msg">Account numbers do not match</div>
                )}
            </div>

            <div className="field-group">
              <label>IFSC Code</label>
              <input
                name="ifsc"
                value={formData.ifsc || ''}
                onChange={handleChange}
                placeholder="HDFC0001234"
              />
            </div>

            <div className="field-group">
              <label>Bank Name</label>
              <input
                name="bankName"
                value={formData.bankName || ''}
                onChange={handleChange}
                placeholder="HSBC Bank"
              />
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
            </div>

            <div className="field-group">
              <label>Reference</label>
              <input
                name="reference"
                value={formData.reference || ''}
                onChange={handleChange}
                placeholder="REF20260730190001"
              />
              <small>Keep this unique for every payment</small>
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

        <div className="summary-card">
          <h3>Transfer Summary</h3>

          <div className="summary-row">
            <span>Available Balance</span>
            <strong>INR {balance.toLocaleString()}</strong>
          </div>

          <div className="summary-row">
            <span>Transfer Amount</span>
            <strong>INR {formData.amount || 0}</strong>
          </div>

          <div className="summary-row">
            <span>Processing Fee</span>
            <strong>INR 0</strong>
          </div>

          <div className="summary-row">
            <span>Transfer Type</span>
            <strong>Bank Transfer</strong>
          </div>

          <div className="summary-row">
            <span>Estimated Time</span>
            <strong>Instant</strong>
          </div>

          <div className="security-note">
            Protected with 256-bit encryption.
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
