/**
 * AI Listings Search — text/number normalizer (Sprint-15).
 */

const TURKISH_CHAR_MAP = Object.freeze({
  i: 'i',
  ı: 'i',
  İ: 'i',
  I: 'i',
  ş: 's',
  Ş: 's',
  ğ: 'g',
  Ğ: 'g',
  ü: 'u',
  Ü: 'u',
  ö: 'o',
  Ö: 'o',
  ç: 'c',
  Ç: 'c'
});

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeTurkishChars(value) {
  return String(value ?? '')
    .split('')
    .map((char) => TURKISH_CHAR_MAP[char] ?? char)
    .join('');
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeText(value) {
  return normalizeTurkishChars(String(value ?? ''))
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s._-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeToken(value) {
  return normalizeText(value).replace(/[._-]/g, '');
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
export function parseKmValue(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const normalized = normalizeText(raw)
    .replace(/\bkm\b/g, '')
    .replace(/\bkilometre\b/g, '')
    .replace(/\bbin\b/g, '000')
    .replace(/[.\s]/g, '')
    .trim();

  const match = normalized.match(/(\d+)/);
  if (!match) return null;

  const num = Number(match[1]);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
export function parsePriceValue(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const lower = normalizeText(raw);

  if (/\b(m|milyon|million)\b/.test(lower) || /[\d.,]+m$/.test(lower)) {
    const numMatch = lower.match(/([\d.,]+)/);
    if (!numMatch) return null;
    const raw = numMatch[1];
    const base = raw.includes(',')
      ? Number(raw.replace(/\./g, '').replace(',', '.'))
      : Number(raw);
    return Number.isFinite(base) ? Math.round(base * 1_000_000) : null;
  }

  if (/\b(k|bin|thousand)\b/.test(lower)) {
    const numMatch = lower.match(/([\d.,]+)/);
    if (!numMatch) return null;
    const base = Number(numMatch[1].replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(base) ? Math.round(base * 1_000) : null;
  }

  const digits = lower
    .replace(/\btl\b/g, '')
    .replace(/\btry\b/g, '')
    .replace(/[.\s]/g, '')
    .replace(/,/g, '');

  const num = Number(digits);
  return Number.isFinite(num) && num > 0 ? num : null;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function sanitizeSearchQuery(value) {
  return String(value ?? '')
    .replace(/[<>"'`]/g, '')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim()
    .slice(0, 500);
}
