import { jsPDF } from 'jspdf';
import { apiRequest } from './api';
import { drawBrandHeader, drawStatusChip, drawTable, formatCurrency, formatDateTime } from './pdfUtils';

function buildReceiptPdf(receipt) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  let y = drawBrandHeader(doc, 'Payment Receipt', `Generated ${formatDateTime(new Date().toISOString())}`);
  y += 10;

  // Big amount + status, the two things anyone opening this actually wants first.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text(formatCurrency(receipt.amount, receipt.currency), 14, y);
  drawStatusChip(doc, receipt.status, pageWidth - 44, y - 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(`Reference: ${receipt.referenceNumber || '—'}`, 14, y + 7);
  doc.setTextColor(20, 20, 20);

  y += 16;

  y = drawTable(doc, {
    startY: y,
    columns: [
      { label: 'Detail', width: 55 },
      { label: 'Value', width: 121 }
    ],
    rows: [
      ['Payment ID', receipt.paymentId],
      ['Status', receipt.status],
      ['Created At', formatDateTime(receipt.createdAt)],
      ['Updated At', formatDateTime(receipt.updatedAt)]
    ]
  });

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Transfer Details', 14, y);
  y += 5;

  y = drawTable(doc, {
    startY: y,
    columns: [
      { label: 'Field', width: 40 },
      { label: 'From Account', width: 68 },
      { label: 'To Account', width: 68 }
    ],
    rows: [
      ['Account ID', receipt.sourceAccountId, receipt.destinationAccountId],
      ['Holder Name', receipt.sourceAccountHolderName, receipt.destinationAccountHolderName],
      ['Bank Name', receipt.sourceBankName, receipt.destinationBankName]
    ]
  });

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Remarks', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.text(receipt.remarks || 'None', 40, y);

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  doc.text('This is a system-generated receipt from Tallyn and does not require a signature.', 14, pageHeight - 12);

  return doc;
}

function getReceiptFileName(receipt, paymentId) {
  const safeReference = (receipt.referenceNumber || `payment-${paymentId}`)
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .slice(0, 60);

  return `Tallyn-Receipt-${safeReference}.pdf`;
}

export async function createReceiptPdfFile(paymentId) {
  if (!paymentId) {
    throw new Error('Payment ID is required to create receipt.');
  }

  const receipt = await apiRequest(`/payments/${paymentId}/receipt`);
  const doc = buildReceiptPdf(receipt);
  const fileName = getReceiptFileName(receipt, paymentId);
  const blob = doc.output('blob');

  return new File([blob], fileName, { type: 'application/pdf' });
}

export async function downloadReceiptPdf(paymentId) {
  const file = await createReceiptPdfFile(paymentId);
  saveReceiptPdfFile(file);
}

export function saveReceiptPdfFile(file) {
  const objectUrl = URL.createObjectURL(file);
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}
