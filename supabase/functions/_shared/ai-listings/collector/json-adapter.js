/**
 * AI Listings Auto Collector — JSON adapter (Sprint-13).
 */

import { COLLECTOR_SUPPORTED_FIELDS } from './collector-validator.js';

/**
 * @param {string} content
 * @returns {Record<string, unknown>[]}
 */
export function parseJsonAdapter(content) {
  let parsed;
  try {
    parsed = JSON.parse(String(content ?? '').trim());
  } catch {
    throw new Error('JSON ayrıştırılamadı; geçerli bir dizi bekleniyor');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('JSON içe aktarımı ilan nesnelerinden oluşan bir dizi olmalıdır');
  }

  return parsed.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`JSON satır ${index + 1} geçerli bir nesne olmalıdır`);
    }
    /** @type {Record<string, unknown>} */
    const row = {};
    for (const field of COLLECTOR_SUPPORTED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(item, field)) {
        row[field] = item[field];
      }
    }
    return row;
  });
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @returns {Record<string, unknown>[]}
 */
export function parseJsonRowsAdapter(rows) {
  if (!Array.isArray(rows)) {
    throw new Error('JSON satırları dizi olmalıdır');
  }
  return rows.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`Satır ${index + 1} geçerli bir nesne olmalıdır`);
    }
    return { ...item };
  });
}
