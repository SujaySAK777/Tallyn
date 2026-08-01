import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';

export default function BankDetails({ formData, setFormData, previousStep, nextStep, session }) {
  const [userAccounts, setUserAccounts] = useState([]);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [benAccountNumber, setBenAccountNumber] = useState(formData.accountNumber || '');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState(formData.confirmAccountNumber || '');
  const [ifscCode, setIfscCode] = useState(formData.ifsc || '');
  const [amount, setAmount] = useState(formData.amount || '');
  const [remarks, setRemarks] = useState(formData.remarks || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [reference] = useState(() => formData.reference || formData.referenceNumber || `REF${Date.now()}`);

  useEffect(() => {
    if (!session?.customerId) { setLoadingAccounts(false); return; }
    apiRequest(`/accounts?customerId=${session.customerId}`)
      .then((accounts) => {
        const active = (accounts || []).filter((a) => a.status === 'ACTIVE');
        setUserAccounts(active);
        if (active.length === 1) setSourceAccountId(String(active[0].accountId));
      })
      .catch(() => {})
      .finally(() => setLoadingAccounts(false));
  }, [session?.customerId]);

  const selectedSource = userAccounts.find((a) => String(a.accountId) === String(sourceAccountId));

  const handleContinue = async () => {
    setError('');
    if (!sourceAccountId) { setError('Please select your source account.'); return; }
    if (!benAccountNumber.trim()) { setError('Enter beneficiary account number.'); return; }
    if (benAccountNumber.trim() !== confirmAccountNumber.trim()) { setError('Account numbers do not match.'); return; }
    if (!ifscCode.trim()) { setError('Enter beneficiary IFSC code.'); return; }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifscCode.trim())) { setError('Enter a valid 11-character IFSC code (e.g. HDFC0001234).'); return; }
    if (!amount || Number(amount) <= 0) { setError('Enter a valid transfer amount.'); return; }
    setLoading(true);
    try {
      const beneficiary = await apiRequest(`/accounts/by-number/${benAccountNumber.trim()}`);
      if (String(beneficiary.accountId) === String(sourceAccountId)) {
        setError('Cannot transfer to your own account.'); return;
      }
      if (beneficiary.status !== 'ACTIVE') {
        setError('Beneficiary account is not active.'); return;
      }
      // Verify IFSC only when the account has a stored IFSC
      if (beneficiary.ifscCode && beneficiary.ifscCode.toUpperCase() !== ifscCode.trim().toUpperCase()) {
        setError('IFSC code does not match the beneficiary account.'); return;
      }
      setFormData({
        sourceAccountId: Number(sourceAccountId),
        destinationAccountId: beneficiary.accountId,
        accountHolder: beneficiary.accountHolderName || '',
        accountNumber: benAccountNumber.trim(),
        confirmAccountNumber: confirmAccountNumber.trim(),
        ifsc: ifscCode.trim(),
        ifscCode: ifscCode.trim(),
        bankName: beneficiary.bankName || '',
        amount: String(amount),
        reference,
        referenceNumber: reference,
        remarks,
      });
      nextStep();
    } catch (err) {
      setError(err.message || 'Beneficiary account not found.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bank-container">
      <div className="section-title">
        <h2>Bank Transfer</h2>
        <p>Enter beneficiary details to send money securely.</p>
      </div>
      <div className="bank-layout">
        <div className="bank-form">
          <div className="bank-form-grid">
            <div className="field-group field-span-2">
              <label>From (Your Account)</label>
              {loadingAccounts ? (
                <input disabled placeholder="Loading your accounts..." />
              ) : userAccounts.length === 0 ? (
                <p className="error-msg">No active account found. Add an account first.</p>
              ) : userAccounts.length === 1 ? (
                <input readOnly value={`${userAccounts[0].accountNumber}  |  ${userAccounts[0].bankName}`} />
              ) : (
                <select value={sourceAccountId} onChange={(e) => setSourceAccountId(e.target.value)}>
                  <option value="">Select account</option>
                  {userAccounts.map((a) => (
                    <option key={a.accountId} value={a.accountId}>
                      {a.accountNumber}  |  {a.bankName}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="field-group">
              <label>Beneficiary Account Number</label>
              <input value={benAccountNumber} onChange={(e) => setBenAccountNumber(e.target.value)} placeholder="e.g. ACC1001" autoComplete="off" />
            </div>
            <div className="field-group">
              <label>Re-enter Account Number</label>
              <input value={confirmAccountNumber} onChange={(e) => setConfirmAccountNumber(e.target.value)} placeholder="Re-enter account number" autoComplete="off" />
              {confirmAccountNumber && benAccountNumber !== confirmAccountNumber && (
                <div className="error-msg">Account numbers do not match</div>
              )}
            </div>
            <div className="field-group">
              <label>Beneficiary IFSC Code</label>
              <input value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} placeholder="e.g. HDFC0001234" autoComplete="off" />
            </div>
            <div className="field-group">
              <label>Amount (Rs.)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1000" min="1" />
            </div>
            <div className="field-group field-span-2">
              <label>Reference Number</label>
              <input readOnly value={reference} />
              <small>Auto-generated</small>
            </div>
            <div className="field-group field-span-2">
              <label>Remarks <span style={{ fontWeight: 400, fontSize: '0.85em' }}>(optional)</span></label>
              <textarea rows="2" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Rent, bill, personal transfer..." />
            </div>
          </div>
          {error && <div className="error-msg" style={{ marginTop: '0.75rem' }}>{error}</div>}
        </div>
        <div className="summary-card">
          <h3>Transfer Summary</h3>
          {selectedSource && (
            <>
              <div className="summary-row"><span>From</span><strong>{selectedSource.accountNumber}</strong></div>
              <div className="summary-row"><span>Available Balance</span><strong>Rs.{Number(selectedSource.balance).toLocaleString('en-IN')}</strong></div>
            </>
          )}
          <div className="summary-row"><span>Transfer Amount</span><strong>Rs.{Number(amount || 0).toLocaleString('en-IN')}</strong></div>
          <div className="summary-row"><span>Processing Fee</span><strong>Rs.0</strong></div>
          <div className="summary-row"><span>Transfer Type</span><strong>IMPS / Instant</strong></div>
          <div className="security-note">Protected with 256-bit encryption.</div>
        </div>
      </div>
      <div className="bottom-buttons">
        <button className="secondary-btn" onClick={previousStep} type="button">Back</button>
        <button className="primary-btn" onClick={handleContinue} disabled={loading || loadingAccounts} type="button">
          {loading ? 'Verifying...' : 'Review Payment'}
        </button>
      </div>
    </div>
  );
}
