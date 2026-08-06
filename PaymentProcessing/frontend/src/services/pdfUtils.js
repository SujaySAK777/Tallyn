// Shared jsPDF helpers - no autotable dependency, plain jsPDF primitives so this
// works fully offline with the jspdf package already in package.json.

export function formatCurrency(amount, currencyCode) {
  const value = Number(amount || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currencyCode || 'INR',
    maximumFractionDigits: 2
  }).format(value);
}

export function formatDateTime(value) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

const BRAND = { r: 26, g: 42, b: 92 };
const BRAND_TINT = { r: 234, g: 239, b: 252 };

export function drawBrandHeader(doc, title, subtitle) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Tallyn', 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(title, 14, 24);

  if (subtitle) {
    doc.setFontSize(8);
    doc.text(subtitle, pageWidth - 14, 24, { align: 'right' });
  }
  doc.setTextColor(20, 20, 20);
  return 42;
}

// Colored status chip, used by both the receipt and (indirectly) statement rows.
export function statusColor(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'COMPLETED') return { r: 20, g: 128, b: 79 };
  if (normalized === 'FAILED') return { r: 172, g: 59, b: 42 };
  if (normalized === 'REFUNDED') return { r: 20, g: 91, b: 101 };
  return { r: 174, g: 116, b: 2 }; // pending/created/validated/processing
}

export function drawStatusChip(doc, status, x, y) {
  const label = String(status || 'PENDING').toUpperCase();
  const color = statusColor(label);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const textWidth = doc.getTextWidth(label);
  const paddingX = 3;
  const chipWidth = textWidth + paddingX * 2;
  doc.setFillColor(color.r, color.g, color.b);
  doc.roundedRect(x, y, chipWidth, 6.5, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(label, x + paddingX, y + 4.6);
  doc.setTextColor(20, 20, 20);
  return chipWidth;
}

/**
 * Renders a simple bordered/striped table with automatic page breaks.
 * columns: [{ label, width, align? }] - widths in mm, should sum to the table width.
 * rows: array of arrays of cell strings, same length/order as columns.
 */
export function drawTable(doc, { startX = 14, startY, columns, rows, rowHeight = 8 }) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);
  let y = startY;

  const drawHeaderRow = () => {
    doc.setFillColor(BRAND_TINT.r, BRAND_TINT.g, BRAND_TINT.b);
    doc.rect(startX, y, tableWidth, rowHeight, 'F');
    doc.setDrawColor(210, 216, 232);
    doc.rect(startX, y, tableWidth, rowHeight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    let x = startX;
    columns.forEach((col) => {
      doc.text(col.label, x + 2.5, y + rowHeight - 2.8);
      x += col.width;
    });
    y += rowHeight;
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
  };

  drawHeaderRow();

  rows.forEach((row, rowIndex) => {
    if (y + rowHeight > pageHeight - 18) {
      doc.addPage();
      y = 16;
      drawHeaderRow();
    }
    if (rowIndex % 2 === 1) {
      doc.setFillColor(247, 249, 253);
      doc.rect(startX, y, tableWidth, rowHeight, 'F');
    }
    doc.setDrawColor(230, 233, 242);
    doc.rect(startX, y, tableWidth, rowHeight);
    doc.setFontSize(8);
    let x = startX;
    columns.forEach((col, colIndex) => {
      const text = String(row[colIndex] ?? '—');
      doc.text(text, x + 2.5, y + rowHeight - 2.8, { maxWidth: col.width - 4 });
      x += col.width;
    });
    y += rowHeight;
  });

  return y;
}

export function saveGeneratedPdf(doc, fileName) {
  const blob = doc.output('blob');
  const file = new File([blob], fileName, { type: 'application/pdf' });
  const objectUrl = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
  return file;
}
