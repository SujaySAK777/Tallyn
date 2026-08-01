import { useEffect, useMemo, useState } from 'react';
import {
  FiArrowLeft,
  FiChevronRight
} from 'react-icons/fi';
import './PaymentJourney.css';
import * as AuthorizePaymentModule from './AuthorizePayment';
import * as BankDetailsModule from './BankDetails';
import * as FailedPaymentModule from './FailedPayment';
import * as PaymentMethodModule from './PaymentMethod';
import * as ProcessingPaymentModule from './ProcessingPayment';
import * as ReviewPaymentModule from './ReviewPayment';
import * as SuccessPageModule from './SuccessPage';
import * as TransactionDetailsModule from './TransactionDetails';
import * as TransactionHistoryModule from './TransactionHistory';

const createMissingComponent = (name) => function MissingComponent() {
  return <div className="error-msg">{name} component is unavailable.</div>;
};

const resolveComponent = (moduleValue, displayName) => {
  const candidate = moduleValue?.default ?? moduleValue;
  if (typeof candidate === 'function') {
    return candidate;
  }
  if (candidate && typeof candidate === 'object' && candidate.$$typeof) {
    return candidate;
  }
  return createMissingComponent(displayName);
};

const AuthorizePayment = resolveComponent(AuthorizePaymentModule, 'AuthorizePayment');
const BankDetails = resolveComponent(BankDetailsModule, 'BankDetails');
const FailedPayment = resolveComponent(FailedPaymentModule, 'FailedPayment');
const PaymentMethod = resolveComponent(PaymentMethodModule, 'PaymentMethod');
const ProcessingPayment = resolveComponent(ProcessingPaymentModule, 'ProcessingPayment');
const ReviewPayment = resolveComponent(ReviewPaymentModule, 'ReviewPayment');
const SuccessPage = resolveComponent(SuccessPageModule, 'SuccessPage');
const TransactionDetails = resolveComponent(TransactionDetailsModule, 'TransactionDetails');
const TransactionHistory = resolveComponent(TransactionHistoryModule, 'TransactionHistory');

function PaymentJourney({
  step,
  method,
  setMethod,
  formState,
  setFormState,
  paymentId,
  currency,
  onClose,
  onAuthorize,
  onValidate,
  onProcessStatus,
  onSettle,
  submitting,
  errorMessage,
  payments,
  selectedDestination,
  selectedAmount,
  onStepChange,
  session
}) {
  const [authenticating, setAuthenticating] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);
  const [completedView, setCompletedView] = useState('processing');
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyStatus, setHistoryStatus] = useState('All');
  const [historyMethod, setHistoryMethod] = useState('All');
  const [historyDate, setHistoryDate] = useState('');
  const [historyAmount, setHistoryAmount] = useState('');

  const flowSteps = [
    { id: 'method', label: 'Method' },
    { id: 'details', label: 'Details' },
    { id: 'review', label: 'Review' },
    { id: 'authorize', label: 'Authorize' },
    { id: 'completed', label: 'Done' }
  ];

  const activeStepForFlow = step === 'processing' ? 'authorize' : step;
  const activeFlowStep = flowSteps.some((item) => item.id === activeStepForFlow) ? activeStepForFlow : 'method';
  const currentIndex = flowSteps.findIndex((item) => item.id === activeFlowStep);
  const amountValue = Number(formState.amount || selectedAmount || 0);
  const grandTotal = amountValue;
  const referenceNumber = formState.referenceNumber || formState.reference || `REF${Date.now()}`;

  useEffect(() => {
    if (step !== 'completed') {
      setProcessingStage(0);
      setCompletedView('processing');
      return;
    }

    let cancelled = false;
    const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

    const runCompletionStages = async () => {
      setCompletedView('processing');

      setProcessingStage(1);
      const validated = await Promise.resolve(onValidate?.());
      if (cancelled) return;
      if (!validated) {
        onStepChange('failed');
        return;
      }

      await wait(500);
      if (cancelled) return;

      setProcessingStage(2);
      const processed = await Promise.resolve(onProcessStatus?.());
      if (cancelled) return;
      if (!processed) {
        onStepChange('failed');
        return;
      }

      await wait(500);
      if (cancelled) return;

      setProcessingStage(3);
      const settled = await Promise.resolve(onSettle?.());
      if (cancelled) return;
      if (!settled) {
        onStepChange('failed');
        return;
      }

      setProcessingStage(4);
      await wait(400);
      if (cancelled) return;
      setCompletedView('success');
    };

    runCompletionStages();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const goBack = () => {
    if (step === 'details') {
      onStepChange('method');
      return;
    }
    if (step === 'review') {
      onStepChange('details');
      return;
    }
    if (step === 'authorize') {
      onStepChange('review');
      return;
    }
    if (step === 'processing') {
      onStepChange('authorize');
      return;
    }
    if (step === 'transaction' || step === 'history') {
      onStepChange('completed');
      return;
    }
    onClose();
  };

  const goNext = () => {
    if (step === 'method') {
      onStepChange('details');
      return;
    }
    if (step === 'details') {
      onStepChange('review');
      return;
    }
    if (step === 'review') {
      onStepChange('authorize');
      return;
    }
    if (step === 'authorize') {
      handleAuthorize();
    }
  };

  const handleAuthorize = async (pin) => {
    setAuthenticating(true);
    try {
      const created = await Promise.resolve(onAuthorize?.(pin));
      if (created === false) {
        onStepChange('failed');
        return;
      }
      onStepChange('completed');
    } catch {
      onStepChange('failed');
    } finally {
      setAuthenticating(false);
    }
  };

  const filteredHistory = useMemo(() => {
    const query = historyQuery.trim().toLowerCase();
    const minAmount = Number(historyAmount || 0);

    return payments.filter((payment) => {
      const dateText = payment.createdAt ? new Date(payment.createdAt).toISOString().slice(0, 10) : '';
      const status = String(payment.status || 'Created').toUpperCase();
      const methodLabel = 'BANK TRANSFER';
      const amount = Number(payment.amount || 0);
      const haystack = `${payment.paymentId} ${payment.referenceNumber || ''} ${payment.destinationAccountId || ''} ${payment.remarks || ''}`.toLowerCase();

      const matchesQuery = !query || haystack.includes(query);
      const matchesStatus = historyStatus === 'All' || status === historyStatus.toUpperCase();
      const matchesMethod = historyMethod === 'All' || methodLabel === historyMethod.toUpperCase();
      const matchesDate = !historyDate || dateText === historyDate;
      const matchesAmount = !minAmount || amount >= minAmount;

      return matchesQuery && matchesStatus && matchesMethod && matchesDate && matchesAmount;
    });
  }, [historyAmount, historyDate, historyMethod, historyQuery, historyStatus, payments]);

  const renderBreadcrumb = () => {
    const items = ['Dashboard', 'Make Payment'];
    if (step === 'transaction') {
      items.push('Transaction Details');
    } else if (step === 'history') {
      items.push('Transaction History');
    }

    return (
      <div className="journey-breadcrumb">
        {items.map((item, index) => (
          <span key={item} className={index === items.length - 1 ? 'current' : ''}>
            {item}
            {index < items.length - 1 && <FiChevronRight />}
          </span>
        ))}
      </div>
    );
  };

  const renderStepCards = () => (
    <div className="stepper premium-stepper">
      {flowSteps.map((item, index) => {
        const isActive = item.id === activeFlowStep;
        const isCompleted = index < currentIndex;
        return (
          <div key={item.id} className={`stepper-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
            <span>{index + 1}</span>
            <small>{item.label}</small>
          </div>
        );
      })}
    </div>
  );

  const renderMethodPage = () => (
    <PaymentMethod
      selectedMethod={method}
      setSelectedMethod={setMethod}
      nextStep={goNext}
    />
  );

  const mapBankFormData = {
    sourceAccountId: formState.sourceAccountId || '',
    destinationAccountId: formState.destinationAccountId || '',
    accountHolder: formState.accountHolder || formState.recipientName || '',
    accountNumber: formState.accountNumber || '',
    confirmAccountNumber: formState.confirmAccountNumber || '',
    ifsc: formState.ifsc || formState.ifscCode || '',
    bankName: formState.bankName || '',
    amount: formState.amount || '',
    reference: formState.reference || formState.referenceNumber || '',
    remarks: formState.remarks || ''
  };

  const setBankFormData = (nextData) => {
    setFormState((prev) => ({
      ...prev,
      ...nextData,
      recipientName: nextData.accountHolder ?? prev.recipientName,
      ifscCode: nextData.ifsc ?? prev.ifscCode,
      referenceNumber: nextData.reference ?? prev.referenceNumber
    }));
  };

  const renderDetailsPage = () => (
    <BankDetails
      formData={mapBankFormData}
      setFormData={setBankFormData}
      previousStep={goBack}
      nextStep={goNext}
      balance={1250000}
      session={session}
    />
  );

  const renderReviewPage = () => (
    <ReviewPayment
      formState={formState}
      selectedDestination={selectedDestination}
      referenceNumber={referenceNumber}
      amountValue={amountValue}
      grandTotal={grandTotal}
      currency={currency}
      authenticating={authenticating}
      submitting={submitting}
      onBack={goBack}
      onConfirm={goNext}
    />
  );

  const renderAuthorizePage = () => (
    <AuthorizePayment
      formState={formState}
      selectedDestination={selectedDestination}
      referenceNumber={referenceNumber}
      amountValue={amountValue}
      currency={currency}
      authenticating={authenticating}
      submitting={submitting}
      onBack={goBack}
      onAuthorize={handleAuthorize}
    />
  );

  const renderCompletedPage = () => (
    completedView === 'success'
      ? (
        <SuccessPage
          paymentId={paymentId}
          referenceNumber={referenceNumber}
          selectedDestination={selectedDestination}
          formState={formState}
          amountValue={amountValue}
          currency={currency}
          onStepChange={onStepChange}
          onClose={onClose}
        />
        )
      : (
        <ProcessingPayment
          stage={processingStage}
          selectedDestination={selectedDestination}
          formState={formState}
          referenceNumber={referenceNumber}
          amountValue={amountValue}
          currency={currency}
          onClose={onClose}
        />
        )
  );

  const renderTransactionPage = () => (
    <TransactionDetails
      paymentId={paymentId}
      formState={formState}
      referenceNumber={referenceNumber}
      selectedDestination={selectedDestination}
      goBack={goBack}
    />
  );

  const renderHistoryPage = () => (
    <TransactionHistory
      historyQuery={historyQuery}
      setHistoryQuery={setHistoryQuery}
      historyStatus={historyStatus}
      setHistoryStatus={setHistoryStatus}
      historyMethod={historyMethod}
      setHistoryMethod={setHistoryMethod}
      historyDate={historyDate}
      setHistoryDate={setHistoryDate}
      historyAmount={historyAmount}
      setHistoryAmount={setHistoryAmount}
      filteredHistory={filteredHistory}
      currency={currency}
      onStepChange={onStepChange}
    />
  );

  const renderFailedPage = () => (
    <FailedPayment
      errorMessage={errorMessage}
      onStepChange={onStepChange}
      goBack={goBack}
    />
  );

  const renderActivePage = () => {
    if (step === 'details') return renderDetailsPage();
    if (step === 'review') return renderReviewPage();
    if (step === 'authorize' || step === 'processing') return renderAuthorizePage();
    if (step === 'completed') return renderCompletedPage();
    if (step === 'transaction') return renderTransactionPage();
    if (step === 'history') return renderHistoryPage();
    if (step === 'failed') return renderFailedPage();
    return renderMethodPage();
  };

  return (
    <section className="payment-journey">
      {renderBreadcrumb()}

      <div className="journey-hero premium-hero">
        <div>
          <h1>Make Payment</h1>
        </div>
        <button className="back-btn" onClick={onClose}><FiArrowLeft /> Back to Dashboard</button>
      </div>

      <div className="journey-shell premium-shell">
        {renderStepCards()}
        {renderActivePage()}
      </div>
    </section>
  );
}

export default PaymentJourney;
