import React, { useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiLoader, FiSearch, FiUsers, FiUserPlus, FiChevronLeft } from 'react-icons/fi';
import { apiRequest } from '../services/api';

export default function BankDetails({
  formData,
  setFormData,
  previousStep,
  nextStep,
  sourceBalance = 0,
  accounts = [],
  beneficiaries = []
}) {
  const [lookupError, setLookupError] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [transferMode, setTransferMode] = useState('new');
  const [beneficiarySearch, setBeneficiarySearch] = useState('');
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState(null);
  const [fxQuote, setFxQuote] = useState(null);
  const [fxQuoteError, setFxQuoteError] = useState('');
  const sourceId = String(formData.sourceAccountId || '').trim();
  const destinationId = String(formData.destinationAccountId || '').trim();
  const sourceIdValid = /^\d+$/.test(sourceId);
  const destinationIdValid = /^\d+$/.test(destinationId);
  const sourceAccount = accounts.find((account) => String(account.accountId) === sourceId);
  const destinationAccount = accounts.find((account) => String(account.accountId) === destinationId);
  const destinationCurrency = formData.destinationCurrency || destinationAccount?.currency;

  useEffect(() => {
    const amount = Number(formData.amount);
    const from = sourceAccount?.currency;
    const to = destinationCurrency;
    if (!from || !to || from === to || !Number.isFinite(amount) || amount <= 0) {
      setFxQuote(null);
      setFxQuoteError('');
      return undefined;
    }
    let cancelled = false;
    apiRequest(`/fx/quote?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=${encodeURIComponent(amount)}`)
      .then((quote) => { if (!cancelled) { setFxQuote(quote); setFxQuoteError(''); } })
      .catch((err) => { if (!cancelled) { setFxQuote(null); setFxQuoteError(err.message || 'Unable to retrieve the FX quote.'); } });
    return () => { cancelled = true; };
  }, [formData.amount, sourceAccount?.currency, destinationCurrency]);

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

  const lookupDestination = async (accountNumberOverride) => {
    const accountNumber = String(accountNumberOverride ?? formData.destinationAccountNumber ?? '').trim();
    if (!accountNumber) return;
    setIsLookingUp(true);
    try {
      const account = await apiRequest(`/accounts/number/${encodeURIComponent(accountNumber)}`);
      setFormData({
        ...formData,
        destinationAccountNumber: account.accountNumber,
        destinationAccountId: String(account.accountId),
        destinationCurrency: account.currency || '',
        accountHolder: account.accountHolderName,
        bankName: account.bankName,
        ifsc: account.ifscCode || ''
      });
      setLookupError('');
    } catch (error) {
      setLookupError(error.message || 'Recipient account was not found.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const filteredBeneficiaries = useMemo(() => {
    const query = beneficiarySearch.trim().toLowerCase();
    if (!query) return beneficiaries;
    return beneficiaries.filter((beneficiary) =>
      (beneficiary.nickname || '').toLowerCase().includes(query) ||
      (beneficiary.accountHolderName || '').toLowerCase().includes(query) ||
      (beneficiary.accountNumber || '').toLowerCase().includes(query) ||
      (beneficiary.bankName || '').toLowerCase().includes(query)
    );
  }, [beneficiaries, beneficiarySearch]);

  const selectBeneficiary = async (beneficiary) => {
    setSelectedBeneficiaryId(beneficiary.beneficiaryId);
    setFormData({
      ...formData,
      destinationAccountNumber: beneficiary.accountNumber,
      destinationAccountId: '',
      destinationCurrency: '',
      accountHolder: '',
      bankName: '',
      ifsc: ''
    });
    await lookupDestination(beneficiary.accountNumber);
  };

  const changeBeneficiary = () => {
    setSelectedBeneficiaryId(null);
    setLookupError('');
    setFormData({
      ...formData,
      destinationAccountNumber: '',
      destinationAccountId: '',
      destinationCurrency: '',
      accountHolder: '',
      bankName: '',
      ifsc: ''
    });
  };

  const switchMode = (mode) => {
    if (mode === transferMode) return;
    setTransferMode(mode);
    setSelectedBeneficiaryId(null);
    setLookupError('');
    setFormData({
      ...formData,
      destinationAccountNumber: '',
      destinationAccountId: '',
      accountHolder: '',
      bankName: '',
      ifsc: ''
    });
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

      <div className="transfer-mode-tabs">
        <button
          type="button"
          className={`transfer-mode-tab ${transferMode === 'new' ? 'active' : ''}`}
          onClick={() => switchMode('new')}
        >
          <FiUserPlus /> New Transfer
        </button>
        <button
          type="button"
          className={`transfer-mode-tab ${transferMode === 'saved' ? 'active' : ''}`}
          onClick={() => switchMode('saved')}
        >
          <FiUsers /> Saved Beneficiary
        </button>
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

            {transferMode === 'new' && (
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
                  onBlur={() => lookupDestination()}
                  placeholder="Enter recipient account number"
                />
                {isLookingUp && <div className="lookup-status"><FiLoader className="spin-icon" /> Verifying account...</div>}
                {lookupError && <div className="error-msg">{lookupError}</div>}
              </div>
            )}

            {transferMode === 'saved' && !selectedBeneficiaryId && (
              <div className="field-group field-span-2">
                <div className="beneficiary-picker">
                  <div className="beneficiary-picker-search">
                    <FiSearch />
                    <input
                      value={beneficiarySearch}
                      onChange={(event) => setBeneficiarySearch(event.target.value)}
                      placeholder="Search saved beneficiaries..."
                    />
                  </div>
                  {filteredBeneficiaries.length === 0 && (
                    <div className="empty-note">
                      {beneficiaries.length === 0
                        ? 'No saved beneficiaries yet. Add one from the Beneficiaries page or use New Transfer.'
                        : 'No beneficiaries match your search.'}
                    </div>
                  )}
                  <div className="beneficiary-picker-list">
                    {filteredBeneficiaries.map((beneficiary) => (
                      <button
                        type="button"
                        key={beneficiary.beneficiaryId}
                        className="beneficiary-picker-item"
                        onClick={() => selectBeneficiary(beneficiary)}
                      >
                        <span className="recipient-found-avatar">{String(beneficiary.accountHolderName).slice(0, 2).toUpperCase()}</span>
                        <div className="recipient-found-meta">
                          <strong>{beneficiary.nickname || beneficiary.accountHolderName}</strong>
                          <span>{beneficiary.bankName} · •••• {String(beneficiary.accountNumber).slice(-4)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                {isLookingUp && <div className="lookup-status"><FiLoader className="spin-icon" /> Verifying account...</div>}
                {lookupError && <div className="error-msg">{lookupError}</div>}
              </div>
            )}

            {transferMode === 'saved' && selectedBeneficiaryId && (
              <div className="field-group field-span-2">
                <button type="button" className="beneficiary-change-link" onClick={changeBeneficiary}>
                  <FiChevronLeft /> Choose a different beneficiary
                </button>
              </div>
            )}

            {formData.accountHolder && !lookupError && !isLookingUp && (
              <div className="field-group field-span-2">
                <div className="recipient-found-banner">
                  <span className="recipient-found-avatar">{String(formData.accountHolder).slice(0, 2).toUpperCase()}</span>
                  <div className="recipient-found-meta">
                    <strong>{formData.accountHolder}</strong>
                    <span>{formData.bankName || 'Bank details unavailable'} · {formData.ifsc || 'IFSC unavailable'}</span>
                  </div>
                  <span className="recipient-found-check"><FiCheckCircle /> Verified</span>
                </div>
              </div>
            )}

            {(transferMode === 'new' || selectedBeneficiaryId) && (
              <>
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
                  {fxQuote && <div className="fx-quote-card"><strong>{fxQuote.sourceAmount} {fxQuote.sourceCurrency} → {fxQuote.destinationAmount} {fxQuote.destinationCurrency}</strong><span>Rate: 1 {fxQuote.sourceCurrency} = {fxQuote.exchangeRate} {fxQuote.destinationCurrency}</span></div>}
                  {fxQuoteError && <div className="error-msg">FX quote: {fxQuoteError}</div>}
                </div>

                <div className="field-group">
                  <label>Category</label>
                  <select
                    name="category"
                    value={formData.category || 'OTHERS'}
                    onChange={handleChange}
                  >
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
