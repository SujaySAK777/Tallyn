import { jsPDF } from 'jspdf';
import { apiRequest } from './api';

function formatCurrency(amount, currencyCode) {
  const value = Number(amount || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currencyCode || 'INR',
    maximumFractionDigits: 2
  }).format(value);
}

function formatDateTime(value) {
  if (!value) {
    return 'N/A';
  }

  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function addLine(doc, label, value, y) {
  doc.setFont('helvetica', 'bold');
  doc.text(`${label}:`, 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(String(value ?? 'N/A'), 70, y);
}

function buildReceiptPdf(receipt) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  doc.setFillColor(240, 246, 255);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('Tallyn Payment Receipt', 20, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Generated: ${formatDateTime(new Date().toISOString())}`, 20, 32);

  let y = 52;
  doc.setFontSize(12);
  addLine(doc, 'Payment ID', receipt.paymentId, y);
  y += 9;
  addLine(doc, 'Reference Number', receipt.referenceNumber, y);
  y += 9;
  addLine(doc, 'Status', receipt.status, y);
  y += 9;
  addLine(doc, 'Amount', formatCurrency(receipt.amount, receipt.currency), y);
  y += 9;
  addLine(doc, 'Created At', formatDateTime(receipt.createdAt), y);
  y += 9;
  addLine(doc, 'Updated At', formatDateTime(receipt.updatedAt), y);

  y += 8;
  doc.setDrawColor(210, 210, 210);
  doc.line(20, y, 190, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('From Account', 20, y);
  y += 8;
  addLine(doc, 'Account ID', receipt.sourceAccountId, y);
  y += 9;
  addLine(doc, 'Holder Name', receipt.sourceAccountHolderName, y);
  y += 9;
  addLine(doc, 'Bank Name', receipt.sourceBankName, y);

  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.text('To Account', 20, y);
  y += 8;
  addLine(doc, 'Account ID', receipt.destinationAccountId, y);
  y += 9;
  addLine(doc, 'Holder Name', receipt.destinationAccountHolderName, y);
  y += 9;
  addLine(doc, 'Bank Name', receipt.destinationBankName, y);

  y += 12;
  addLine(doc, 'Remarks', receipt.remarks || 'None', y);

  return doc;
}

export async function downloadReceiptPdf(paymentId) {
  if (!paymentId) {
    throw new Error('Payment ID is required to download receipt.');
  }

  const receipt = await apiRequest(`/payments/${paymentId}/receipt`);
  const doc = buildReceiptPdf(receipt);
  const safeReference = (receipt.referenceNumber || `payment-${paymentId}`)
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .slice(0, 60);

  doc.save(`Tallyn-Receipt-${safeReference}.pdf`);
}
