/**
 * AI Listings Auto Collector — partner feed adapter (Sprint-13).
 */

import { parseXmlAdapter } from './xml-adapter.js';
import { COLLECTOR_SUPPORTED_FIELDS } from './collector-validator.js';

/**
 * @param {Record<string, unknown>} item
 * @returns {Record<string, unknown>}
 */
function mapPartnerItem(item) {
  /** @type {Record<string, unknown>} */
  const row = {};
  for (const field of COLLECTOR_SUPPORTED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(item, field)) {
      row[field] = item[field];
    }
  }
  if (!row.source_type) row.source_type = 'partner_api';
  return row;
}

/**
 * @param {string} content
 * @param {{ format?: string }} [options]
 * @returns {Record<string, unknown>[]}
 */
export function parsePartnerFeedAdapter(content, options = {}) {
  const trimmed = String(content ?? '').trim();
  if (!trimmed) return [];

  const format = String(options.format ?? '').trim().toLowerCase();
  if (format === 'xml' || trimmed.startsWith('<')) {
    const rows = parseXmlAdapter(trimmed);
    return rows.map((row) => ({ ...row, source_type: row.source_type ?? 'partner_api' }));
  }

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('Partner feed JSON ayrıştırılamadı');
  }

  if (Array.isArray(parsed)) {
    return parsed.map(mapPartnerItem);
  }

  if (parsed && typeof parsed === 'object') {
    const container = /** @type {Record<string, unknown>} */ (parsed);
    const listings =
      container.listings ??
      container.items ??
      container.records ??
      (container.feed && typeof container.feed === 'object'
        ? /** @type {Record<string, unknown>} */ (container.feed).listings
        : null);

    if (Array.isArray(listings)) {
      return listings.map(mapPartnerItem);
    }
  }

  throw new Error('Partner feed formatı desteklenmiyor; listings dizisi bekleniyor');
}
