import React from 'react';
import { FiCreditCard, FiSmartphone } from 'react-icons/fi';
import { MdAccountBalanceWallet } from 'react-icons/md';
import { RiBankLine } from 'react-icons/ri';

const paymentMethods = [
  {
    id: 'bank',
    title: 'Bank Transfer',
    icon: RiBankLine,
    description: 'Transfer directly using account number and IFSC',
    available: true
  },
  {
    id: 'upi',
    title: 'UPI',
    icon: FiSmartphone,
    description: 'Pay using UPI ID',
    available: false
  },
  {
    id: 'card',
    title: 'Debit / Credit Card',
    icon: FiCreditCard,
    description: 'Visa, MasterCard and RuPay',
    available: false
  },
  {
    id: 'wallet',
    title: 'Wallet',
    icon: MdAccountBalanceWallet,
    description: 'Amazon Pay, Paytm and more',
    available: false
  }
];

export default function PaymentMethod({
  selectedMethod,
  setSelectedMethod,
  nextStep
}) {
  return (
    <div className="payment-container">
      <div className="payment-header">
        <h2>Select Payment Method</h2>
        <p>Choose how you'd like to send money.</p>
      </div>

      <div className="payment-grid">
        {paymentMethods.map((method) => {
          const MethodIcon = method.icon;
          return (
          <div
            key={method.id}
            className={`payment-card ${selectedMethod === method.id ? 'active' : ''} ${!method.available ? 'disabled' : ''}`}
            onClick={() => method.available && setSelectedMethod(method.id)}
          >
            <div className="payment-icon"><MethodIcon /></div>
            <h3>{method.title}</h3>
            <p>{method.description}</p>
            {!method.available && <span className="coming-soon">Coming Soon</span>}
          </div>
          );
        })}
      </div>

      <div className="payment-footer">
        <div className="security-box">
          Your payments are secured using bank-grade encryption.
        </div>

        <button
          className="continue-btn"
          disabled={!selectedMethod}
          onClick={nextStep}
          type="button"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
