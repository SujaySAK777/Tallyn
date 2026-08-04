import { useRef } from 'react';
import { FiArrowLeft, FiCheckCircle, FiChevronRight, FiCreditCard, FiLock, FiShield } from 'react-icons/fi';
import './CheckBalanceJourney.css';

function CheckBalanceJourney({ accounts, selectedAccountNumber, setSelectedAccountNumber, tpin, setTpin, step, setStep, result, error, submitting, onCheck, onClose, onStartAgain, customerName }) {
  const selectedAccount = accounts.find((account) => account.accountNumber === selectedAccountNumber);
  const pinInputRef = useRef(null);
  const steps = ['Choose account', 'Verify TPIN', 'Balance'];
  const currentStep = result ? 2 : step === 'tpin' ? 1 : 0;
  const maskAccount = (number) => String(number || '').length > 4 ? `•••• ${String(number).slice(-4)}` : String(number || '');

  return <section className="payment-journey balance-journey">
    <div className="journey-breadcrumb"><span>Dashboard<FiChevronRight /></span><span className="current">Check Balance</span></div>
    <div className="journey-hero premium-hero"><div><h1>Check Balance</h1><p>Securely view the balance in any linked bank account.</p></div><button className="back-btn" onClick={onClose}><FiArrowLeft /> Back to Dashboard</button></div>
    <div className="journey-shell premium-shell">
      <div className="stepper premium-stepper balance-stepper">{steps.map((label, index) => <div key={label} className={`stepper-item ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}><span>{index + 1}</span><small>{label}</small></div>)}</div>
      {!result && <div className="balance-journey-layout">
        <section className="premium-card balance-main-card">
          {step === 'accounts' ? <>
            <div className="section-title"><h2>Select an account</h2><p>Choose from your linked bank accounts.</p></div>
            <div className="linked-accounts journey-linked-accounts" role="radiogroup" aria-label="Linked bank accounts">
              {accounts.length === 0 && <p className="empty-note">No linked accounts are available.</p>}
              {accounts.map((account) => { const selected = selectedAccountNumber === account.accountNumber; return <button type="button" key={account.accountId} className={`linked-account-card${selected ? ' selected' : ''}`} onClick={() => setSelectedAccountNumber(account.accountNumber)} role="radio" aria-checked={selected}><span className="linked-account-icon"><FiCreditCard /></span><span className="linked-account-copy"><strong>{account.bankName}</strong><span>{account.accountHolderName || customerName}</span><small>{maskAccount(account.accountNumber)}</small></span><span className="account-select-dot" aria-hidden="true" /></button>; })}
            </div>
          </> : <>
            <div className="balance-authorize-heading"><div><h2>Confirm &amp; Authorize</h2><p>Verify your identity to view this balance.</p></div><div className="status-chip"><FiLock /> Authorization Required</div></div>
            <div className="authorize-tabs" role="tablist" aria-label="Authorization method"><button type="button" className="authorize-tab active" role="tab" aria-selected="true">Transaction PIN</button></div>
            <div className="authorize-pin-card" onClick={() => pinInputRef.current?.focus()}>
              <div className="authorize-pin-title">Enter Transaction PIN</div><span className="authorize-pin-hint">Enter your 6 digit transaction PIN</span>
              <input ref={pinInputRef} className="authorize-pin-input" autoFocus type="password" inputMode="numeric" autoComplete="one-time-code" maxLength="6" value={tpin} onChange={(event) => setTpin(event.target.value.replace(/\D/g, '').slice(0, 6))} aria-label="Enter 6 digit transaction PIN" />
              <div className="authorize-pin-grid" aria-hidden="true">{Array.from({ length: 6 }).map((_, index) => <div key={index} className={`pin-cell ${index === tpin.length && tpin.length < 6 ? 'pin-cell-active' : ''}`}>{index < tpin.length ? '●' : index === tpin.length && tpin.length < 6 ? '|' : ''}</div>)}</div>
              <div className="authorize-ref-row"><span>Selected account</span><strong>{selectedAccount?.bankName} · {maskAccount(selectedAccountNumber)}</strong></div>
            </div>
            <div className="authorize-secure-note"><FiShield /> Your account details are secured with bank-grade encryption.</div>
            <button type="button" className="balance-change-account" onClick={() => { setSelectedAccountNumber(''); setTpin(''); setStep('accounts'); }}>Change account</button>
            {error && <p className="error-msg">{error}</p>}
          </>}
          <div className="journey-actions"><button className="secondary-btn" onClick={step === 'tpin' ? () => { setStep('accounts'); setTpin(''); } : onClose}>{step === 'tpin' ? 'Back' : 'Cancel'}</button>{step === 'accounts' ? <button className="primary-btn" disabled={!selectedAccountNumber} onClick={() => setStep('tpin')}>Continue</button> : <button className="primary-btn" disabled={submitting || tpin.length < 6} onClick={onCheck}>{submitting ? 'Checking...' : 'Check Balance'}</button>}</div>
        </section>
        <aside className="premium-card balance-security-card"><span className="balance-security-icon"><FiLock /></span><h3>Your balance stays private</h3><p>We verify your TPIN before showing account information.</p></aside>
      </div>}
      {result && <div className="balance-result-page"><section className="premium-card balance-result-card journey-result-card"><span className="balance-result-icon"><FiCheckCircle /></span><span className="balance-result-label">Available balance</span><strong>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: result.currency || 'INR', maximumFractionDigits: 0 }).format(Number(result.balance || 0))}</strong><span className="balance-result-account">{result.accountHolderName} · {maskAccount(result.accountNumber)}</span><div className="journey-actions"><button className="secondary-btn" onClick={onStartAgain}>Check another</button><button className="primary-btn" onClick={onClose}>Done</button></div></section></div>}
    </div>
  </section>;
}

export default CheckBalanceJourney;
