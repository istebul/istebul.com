/**
 * Normalize Turkish phone numbers for wa.me links (digits only, country code 90).
 */
export function normalizePhoneForWhatsapp(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('90')) return digits;
  if (digits.startsWith('0')) return `90${digits.slice(1)}`;
  return `90${digits}`;
}
