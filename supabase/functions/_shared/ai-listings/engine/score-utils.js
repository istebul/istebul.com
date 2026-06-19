/**
 * Shared scoring utilities — AI Listings canonical engine (server).
 */

export const ENGINE_VERSION = 'engine-v1';
export const CURRENT_YEAR = 2026;

/**
 * @param {number} value
 * @returns {number}
 */
export function clampScore(value) {
  return Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
}

/**
 * @param {unknown} value
 * @returns {number}
 */
export function safeNumber(value) {
  const n = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {Record<string, unknown>|null|undefined} attributes
 * @param {string[]} keys
 * @returns {unknown}
 */
export function readAttribute(attributes, keys) {
  if (!attributes || typeof attributes !== 'object') return undefined;
  for (const key of keys) {
    const value = attributes[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

/**
 * @param {unknown} city
 * @returns {string}
 */
export function normalizeCityKey(city) {
  const key = String(city ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR');
  if (key.includes('istanbul')) return 'istanbul';
  if (key.includes('ankara')) return 'ankara';
  if (key.includes('izmir')) return 'izmir';
  if (key.includes('antalya')) return 'antalya';
  if (key.includes('bursa')) return 'bursa';
  return 'default';
}
