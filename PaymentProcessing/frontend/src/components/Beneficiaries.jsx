import React, { useMemo, useState } from 'react';
import {
  FiSearch,
  FiUserPlus,
  FiTrash2,
  FiLoader,
  FiCheckCircle,
  FiUsers,
  FiX,
  FiCreditCard
} from 'react-icons/fi';
import { apiRequest } from '../services/api';

export default function Beneficiaries({ beneficiaries = [], loading = false, onAdd, onDelete }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [preview, setPreview] = useState(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const filteredBeneficiaries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return beneficiaries;
    return beneficiaries.filter((beneficiary) =>
      (beneficiary.nickname || '').toLowerCase().includes(query) ||
      (beneficiary.accountHolderName || '').toLowerCase().includes(query) ||
      (beneficiary.accountNumber || '').toLowerCase().includes(query) ||
      (beneficiary.bankName || '').toLowerCase().includes(query)
    );
  }, [beneficiaries, searchQuery]);

  const lookupAccount = async () => {
    const trimmed = accountNumber.trim();
    if (!trimmed) return;
    setIsLookingUp(true);
    setLookupError('');
    try {
      const account = await apiRequest(`/accounts/number/${encodeURIComponent(trimmed)}`);
      setPreview(account);
    } catch (error) {
      setPreview(null);
      setLookupError(error.message || 'Account was not found.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const resetAddForm = () => {
    setShowAddForm(false);
    setAccountNumber('');
    setPreview(null);
    setLookupError('');
  };

  const handleSave = async () => {
    if (!preview) return;
    setSaving(true);
    setLookupError('');
    try {
      await onAdd({
        accountNumber: preview.accountNumber,
        accountHolderName: preview.accountHolderName,
        bankName: preview.bankName,
        ifscCode: preview.ifscCode
      });
      resetAddForm();
    } catch (error) {
      setLookupError(error.message || 'Unable to save beneficiary.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (beneficiaryId) => {
    if (confirmDeleteId !== beneficiaryId) {
      setConfirmDeleteId(beneficiaryId);
      window.setTimeout(() => {
        setConfirmDeleteId((current) => (current === beneficiaryId ? null : current));
      }, 3000);
      return;
    }
    setConfirmDeleteId(null);
    await onDelete(beneficiaryId);
  };

  return (
    <div className="beneficiaries-page">
      <div className="beneficiaries-hero">
        <div className="beneficiaries-hero-copy">
          <h1>Beneficiaries</h1>
          <p>Manage saved recipients for faster, one-tap bank transfers.</p>
        </div>
        <div className="beneficiaries-hero-stat">
          <span className="beneficiaries-hero-stat-value">{beneficiaries.length}</span>
          <span className="beneficiaries-hero-stat-label">Saved {beneficiaries.length === 1 ? 'Beneficiary' : 'Beneficiaries'}</span>
        </div>
      </div>

      <div className="beneficiaries-toolbar">
        <div className="beneficiary-picker-search beneficiaries-search">
          <FiSearch />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search beneficiaries by name, bank or account number..."
          />
        </div>
        <button type="button" className="primary-btn" onClick={() => setShowAddForm((prev) => !prev)}>
          <FiUserPlus /> Add Beneficiary
        </button>
      </div>

      {showAddForm && (
        <div className="premium-card beneficiary-add-card">
          <div className="beneficiary-add-header">
            <div className="beneficiary-add-header-icon"><FiUserPlus /></div>
            <div className="beneficiary-add-header-copy">
              <h2>Add a New Beneficiary</h2>
              <p>Enter the recipient's account number to fetch and save their details.</p>
            </div>
            <button type="button" className="beneficiary-add-close" onClick={resetAddForm} aria-label="Close">
              <FiX />
            </button>
          </div>

          <div className="beneficiary-add-fields">
            <div className="field-group">
              <label className="beneficiary-account-label">Recipient's Account Number</label>
              <div className={`beneficiary-account-input ${preview ? 'is-verified' : ''} ${lookupError ? 'has-error' : ''}`}>
                <FiCreditCard className="beneficiary-account-icon" />
                <input
                  value={accountNumber}
                  onChange={(event) => {
                    setAccountNumber(event.target.value);
                    setPreview(null);
                    setLookupError('');
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      lookupAccount();
                    }
                  }}
                  placeholder="e.g. 000123456789"
                  inputMode="numeric"
                  autoFocus
                />
                {preview && <FiCheckCircle className="beneficiary-account-verified-icon" />}
                <button
                  type="button"
                  className="beneficiary-account-verify-btn"
                  onClick={lookupAccount}
                  disabled={isLookingUp || !accountNumber.trim()}
                >
                  {isLookingUp ? <FiLoader className="spin-icon" /> : <FiSearch />}
                  <span>{isLookingUp ? 'Checking' : 'Verify'}</span>
                </button>
              </div>
              <small>We'll verify this account and fetch the holder's name, bank and IFSC automatically.</small>
              {lookupError && <div className="error-msg">{lookupError}</div>}
            </div>
          </div>

          {preview && (
            <div className="recipient-found-banner beneficiary-add-preview">
              <span className="recipient-found-avatar">{String(preview.accountHolderName).slice(0, 2).toUpperCase()}</span>
              <div className="recipient-found-meta">
                <strong>{preview.accountHolderName}</strong>
                <span>{preview.bankName} · {preview.ifscCode || 'IFSC unavailable'}</span>
              </div>
              <span className="recipient-found-check"><FiCheckCircle /> Verified</span>
            </div>
          )}

          <div className="modal-actions beneficiary-add-actions">
            <button className="secondary-btn" type="button" onClick={resetAddForm}>Cancel</button>
            <button className="primary-btn" type="button" disabled={!preview || saving} onClick={handleSave}>
              <FiCheckCircle /> {saving ? 'Saving...' : 'Save Beneficiary'}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="empty-note"><FiLoader className="spin-icon" /> Loading beneficiaries...</div>
      )}

      {!loading && filteredBeneficiaries.length === 0 && (
        <div className="premium-card beneficiaries-empty">
          <FiUsers size={28} />
          <p>{beneficiaries.length === 0
            ? 'No saved beneficiaries yet. Add one to make future transfers faster.'
            : 'No beneficiaries match your search.'}</p>
        </div>
      )}

      {!loading && filteredBeneficiaries.length > 0 && (
        <div className="beneficiaries-list">
          {filteredBeneficiaries.map((beneficiary) => (
            <div className="premium-card beneficiary-row" key={beneficiary.beneficiaryId}>
              <div className="beneficiary-row-identity">
                <span className="recipient-found-avatar">{String(beneficiary.accountHolderName).slice(0, 2).toUpperCase()}</span>
                <div className="beneficiary-row-name">
                  <strong>{beneficiary.nickname || beneficiary.accountHolderName}</strong>
                  {beneficiary.nickname && <span className="beneficiary-card-subname">{beneficiary.accountHolderName}</span>}
                </div>
              </div>
              <div className="beneficiary-row-details">
                <span className="beneficiary-row-bank">{beneficiary.bankName}</span>
                <span className="beneficiary-row-account">•••• {String(beneficiary.accountNumber).slice(-4)}</span>
                {beneficiary.ifscCode && <span className="beneficiary-row-ifsc">{beneficiary.ifscCode}</span>}
              </div>
              <button
                type="button"
                className={`beneficiary-delete-btn ${confirmDeleteId === beneficiary.beneficiaryId ? 'confirm' : ''}`}
                onClick={() => handleDelete(beneficiary.beneficiaryId)}
              >
                <FiTrash2 /> {confirmDeleteId === beneficiary.beneficiaryId ? 'Confirm?' : 'Remove'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

