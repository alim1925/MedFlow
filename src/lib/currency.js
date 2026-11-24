/**
 * Format numeric amount to Indonesian Rupiah string (e.g. "Rp 25.000").
 * @param {number|string|null|undefined} amount
 * @returns {string}
 */
export function formatRupiah(amount) {
  const num = Number(amount);
  const safe = Number.isFinite(num) ? num : 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safe);
}

/**
 * Compute invoice number from prescription ID and optional date.
 * @param {string} prescriptionId
 * @param {string|Date} [dateValue]
 * @returns {string}
 */
export function buildPrescriptionInvoiceNumber(prescriptionId, dateValue = new Date()) {
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue || Date.now());
  const safeDate = Number.isNaN(d.getTime()) ? new Date() : d;
  const ymd = safeDate.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = String(prescriptionId || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'RX';
  return `INV-RX-${ymd}-${suffix}`;
}
