/**
 * AI Listings Auto Collector — row normalization (Sprint-13).
 */

import { validateCollectorRow } from './collector-validator.js';
import { parseCsvAdapter } from './csv-adapter.js';
import { parseJsonAdapter } from './json-adapter.js';
import { parseXmlAdapter } from './xml-adapter.js';
import { parsePartnerFeedAdapter } from './partner-feed-adapter.js';
import { parseJsonRowsAdapter } from './json-adapter.js';
import { resolveCollectorFormat } from './source-adapter.js';

/**
 * @param {'csv'|'json'|'xml'|'partner_feed'|'manual'|'ai_builder'} format
 * @param {string} content
 * @returns {Record<string, unknown>[]}
 */
export function parseCollectorContent(format, content) {
  switch (format) {
    case 'csv':
      return parseCsvAdapter(content);
    case 'json':
    case 'ai_builder':
      return parseJsonAdapter(content);
    case 'xml':
      return parseXmlAdapter(content);
    case 'partner_feed':
      return parsePartnerFeedAdapter(content);
    default:
      throw new Error('Desteklenmeyen collector formatı');
  }
}

/**
 * @param {Record<string, unknown>[]} rawRows
 * @param {string} sourceType
 * @returns {{
 *   normalized_rows: Record<string, unknown>[],
 *   errors: Array<{ row: number, messages: string[] }>,
 *   valid_rows: number,
 *   invalid_rows: number
 * }}
 */
export function normalizeCollectorBatch(rawRows, sourceType) {
  /** @type {Record<string, unknown>[]} */
  const normalized_rows = [];
  /** @type {Array<{ row: number, messages: string[] }>} */
  const errors = [];
  let valid_rows = 0;
  let invalid_rows = 0;

  rawRows.forEach((raw, index) => {
    const result = validateCollectorRow(raw, sourceType);
    if (result.ok) {
      valid_rows += 1;
      normalized_rows.push(result.value);
    } else {
      invalid_rows += 1;
      errors.push({ row: index + 1, messages: result.errors });
    }
  });

  return { normalized_rows, errors, valid_rows, invalid_rows };
}

/**
 * @param {{
 *   format?: string,
 *   source_type?: string,
 *   content?: string,
 *   rows?: Array<Record<string, unknown>>
 * }} input
 * @returns {{ raw_rows: Record<string, unknown>[], source_type: string }}
 */
export function extractCollectorRawRows(input) {
  const source_type = resolveCollectorFormat(input.format, input.source_type);
  if (Array.isArray(input.rows) && input.rows.length > 0) {
    return { raw_rows: parseJsonRowsAdapter(input.rows), source_type };
  }

  const content = String(input.content ?? '');
  if (!content.trim()) {
    return { raw_rows: [], source_type };
  }

  return {
    raw_rows: parseCollectorContent(source_type, content),
    source_type
  };
}
