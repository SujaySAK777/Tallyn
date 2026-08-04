import { FiAlertCircle, FiArrowLeft, FiRefreshCw, FiShield } from 'react-icons/fi';

function FailedPayment({ errorMessage, onStepChange }) {
  return (
    <div className="journey-page failed-page retry-page">
      <div className="retry-card premium-card">
        <div className="failed-icon"><FiAlertCircle /></div>
        <span className="eyebrow">Payment not completed</span>
        <h2>We couldn’t process this payment</h2>
        <p>{errorMessage || 'Your money has not been transferred. Check the details and try again.'}</p>
        <div className="retry-error-box"><strong>What happened</strong><span>{errorMessage || 'The payment service could not complete the request.'}</span></div>
        <div className="retry-assurance"><FiShield /><span>No funds are deducted when a payment fails.</span></div>
        <div className="retry-actions">
          <button type="button" className="secondary-btn" onClick={() => onStepChange('details')}><FiArrowLeft /> Edit payment</button>
          <button type="button" className="primary-btn" onClick={() => onStepChange('review')}><FiRefreshCw /> Try again</button>
        </div>
      </div>
    </div>
  );
}

export default FailedPayment;
