/**
 * GarsonAI admin — Turkish locale formatters.
 */

/**
 * @param {number|null|undefined} value
 * @returns {string}
 */
export function formatCurrencyTry(value) {
  const num = value != null && Number.isFinite(Number(value)) ? Number(value) : 0;
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * @param {string|Date|null|undefined} value
 * @returns {string}
 */
export function formatDateTr(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

/**
 * @param {string|null|undefined} time
 * @returns {string}
 */
export function formatTimeTr(time) {
  const raw = String(time || '').trim();
  if (!raw) return '—';
  return raw.length >= 5 ? raw.slice(0, 5) : raw;
}

/**
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
