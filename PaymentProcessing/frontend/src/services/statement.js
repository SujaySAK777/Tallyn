import { jsPDF } from 'jspdf';
import { drawBrandHeader, drawTable, formatCurrency, formatDateTime, saveGeneratedPdf } from './pdfUtils';

/**
 * rows: array of payment-shaped objects (paymentId, referenceNumber, createdAt,
 * sourceAccountNumber/destinationAccountNumber (or ids), amount, currency, status).
 * meta: { accountLabel, fromDate, toDate, status }
 */
function buildStatementPdf(rows, meta) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  const rangeLabel = meta.fromDate || meta.toDate
    ? `${meta.fromDate || 'Start'} to ${meta.toDate || 'Now'}`
    : 'All dates';
  let y = drawBrandHeader(doc, 'Account Statement', `Generated ${formatDateTime(new Date().toISOString())}`);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(meta.accountLabel || 'All accounts', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(`Period: ${rangeLabel}   •   Status filter: ${meta.status || 'All'}   •   ${rows.length} record(s)`, 14, y + 6);
  doc.setTextColor(20, 20, 20);
  y += 14;

  const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Total amount: ${formatCurrency(totalAmount)}`, pageWidth - 14, y - 14, { align: 'right' });

  const tableRows = rows.map((payment) => [
    formatDateTime(payment.createdAt),
    payment.referenceNumber || '—',
    payment.sourceAccountNumber || payment.sourceAccountId || '—',
    payment.destinationAccountNumber || payment.destinationAccountId || '—',
    formatCurrency(payment.amount, payment.currency),
    String(payment.status || 'CREATED').toUpperCase()
  ]);

  drawTable(doc, {
    startY: y,
    columns: [
      { label: 'Date & Time', width: 34 },
      { label: 'Reference', width: 40 },
      { label: 'Sender A/C', width: 34 },
      { label: 'Receiver A/C', width: 34 },
      { label: 'Amount', width: 26 },
      { label: 'Status', width: 14 }
    ],
    rows: tableRows,
    rowHeight: 8
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
    doc.text('Tallyn account statement - for personal record keeping.', 14, pageHeight - 8);
  }

  return doc;
}

function getStatementFileName(accountLabel) {
  const safeLabel = String(accountLabel || 'all-accounts')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .slice(0, 40);
  return `Tallyn-Account-Statement-${safeLabel}-${new Date().toISOString().slice(0, 10)}.pdf`;
}

export function downloadStatementPdf(rows, meta = {}) {
  const doc = buildStatementPdf(rows, meta);
  return saveGeneratedPdf(doc, getStatementFileName(meta.accountLabel));
}
