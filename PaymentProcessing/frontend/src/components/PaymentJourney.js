import { useEffect, useMemo, useState } from 'react';
import {
  FiArrowLeft,
  FiCheck,
  FiChevronRight
} from 'react-icons/fi';
import './PaymentJourney.css';
import * as AuthorizePaymentModule from './AuthorizePayment';
import * as BankDetailsModule from './BankDetails';
import * as FailedPaymentModule from './FailedPayment';
import * as PaymentMethodModule from './PaymentMethod';
import * as ProcessingPaymentModule from './ProcessingPayment';
import * as ReviewPaymentModule from './ReviewPayment';
import * as SelfTransferDetailsModule from './SelfTransferDetails';
import * as SuccessPageModule from './SuccessPage';
import * as TransactionDetailsModule from './TransactionDetails';



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
const SelfTransferDetails = resolveComponent(SelfTransferDetailsModule, 'SelfTransferDetails');
const SuccessPage = resolveComponent(SuccessPageModule, 'SuccessPage');
const TransactionDetails = resolveComponent(TransactionDetailsModule, 'TransactionDetails');

function PaymentJourney({
  step,
  method,
  setMethod,
  formState,
  setFormState,
  accounts,
  paymentId,
  viewerAccountId,
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
  sourceBalance = 0,
  onStepChange,
  beneficiaries = [],
  onSaveBeneficiary,
  budget = { enabled: false, total: 0, categories: {}, spent: {} }
}) {
  const [authenticating, setAuthenticating] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);
  const [completedView, setCompletedView] = useState('processing');

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
  const monthlySpent = useMemo(() => Object.values(budget.spent || {}).reduce((total, amount) => total + Number(amount || 0), 0), [budget]);
  const categoryKey = ({ BILL_PAYMENTS: 'Bill Payments', SHOPPING: 'Shopping', ENTERTAINMENT: 'Entertainment', FOOD: 'Food', UPI_PAYMENTS: 'Others', OTHERS: 'Others' }[formState.category] || 'Others');

  const duplicatePayment = useMemo(() => {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    return payments.find((payment) => (
      String(payment.destinationAccountId) === String(formState.destinationAccountId)
      && Number(payment.amount) === amountValue
      && new Date(payment.createdAt || 0).getTime() >= fiveMinutesAgo
      && !['FAILED', 'CANCELLED'].includes(String(payment.status || '').toUpperCase())
    ));
  }, [amountValue, formState.destinationAccountId, payments]);

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
    if (step === 'transaction') {
      onClose();
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

  const renderBreadcrumb = () => {
    const items = ['Dashboard', 'Make Payment'];
    if (step === 'transaction') {
      items.push('Transaction Details');
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
            <span>{isCompleted ? <FiCheck /> : index + 1}</span>
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
    sourceAccountNumber: formState.sourceAccountNumber || '',
    destinationAccountId: formState.destinationAccountId || '',
    destinationAccountNumber: formState.destinationAccountNumber || '',
    accountHolder: formState.accountHolder || formState.recipientName || '',
    accountNumber: formState.accountNumber || '',
    confirmAccountNumber: formState.confirmAccountNumber || '',
    ifsc: formState.ifsc || formState.ifscCode || '',
    bankName: formState.bankName || '',
    amount: formState.amount || '',
    category: formState.category || 'OTHERS',
    reference: formState.reference || formState.referenceNumber || '',
    remarks: formState.remarks || ''
  };

  const setBankFormData = (nextData) => {
    const sourceAccount = nextData.sourceAccountId
      ? accounts.find((account) => String(account.accountId) === String(nextData.sourceAccountId))
      : null;
    setFormState((prev) => ({
      ...prev,
      ...nextData,
      currency: sourceAccount?.currency || prev.currency || 'INR',
      recipientName: nextData.accountHolder ?? prev.recipientName,
      ifscCode: nextData.ifsc ?? prev.ifscCode,
      referenceNumber: nextData.reference ?? prev.referenceNumber
    }));
  };

  const isSelfTransfer = method === 'self';

  const renderDetailsPage = () => (
    isSelfTransfer
      ? (
        <SelfTransferDetails
          formData={mapBankFormData}
          setFormData={setBankFormData}
          previousStep={goBack}
          nextStep={goNext}
          sourceBalance={sourceBalance}
          accounts={accounts}
        />
        )
      : (
        <BankDetails
          formData={mapBankFormData}
          setFormData={setBankFormData}
          previousStep={goBack}
          nextStep={goNext}
          sourceBalance={sourceBalance}
          accounts={accounts}
          beneficiaries={beneficiaries}
        />
        )
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
      sourceBalance={sourceBalance}
      monthlySpent={monthlySpent}
      monthlyBudget={budget.enabled ? Number(budget.total || 0) : 0}
      categoryBudget={Number(budget.categories?.[categoryKey] || 0)}
      categorySpent={Number(budget.spent?.[categoryKey] || 0)}
      onBack={goBack}
      onConfirm={goNext}
      isSelfTransfer={isSelfTransfer}
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
      duplicatePayment={duplicatePayment}
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
          isSelfTransfer={isSelfTransfer}
          beneficiaries={beneficiaries}
          onSaveBeneficiary={onSaveBeneficiary}
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
      accounts={accounts}
      referenceNumber={referenceNumber}
      selectedDestination={selectedDestination}
      viewerAccountId={viewerAccountId}
      goBack={goBack}
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
    if (step === 'failed') return renderFailedPage();
    return renderMethodPage();
  };

  return (
    <section className="payment-journey">
      {renderBreadcrumb()}

      <div className="journey-hero premium-hero">
        <div>
          <h1>{step === 'transaction' ? 'Transaction Details' : 'Make Payment'}</h1>
        </div>
        <button className="back-btn" onClick={onClose}><FiArrowLeft /> Back to Dashboard</button>
      </div>

      <div className="journey-shell premium-shell">
        {step !== 'transaction' && renderStepCards()}
        <div className="journey-step-content" key={step}>
          {renderActivePage()}
        </div>
      </div>
    </section>
  );
}

export default PaymentJourney;
