/**
 * AI Listings Auto Collector — CSV adapter (Sprint-13).
 */

import { parseCsvLine } from '../import-parser.js';
import { COLLECTOR_SUPPORTED_FIELDS } from './collector-validator.js';

/**
 * @param {string} content
 * @returns {Record<string, unknown>[]}
 */
export function parseCsvAdapter(content) {
  const lines = String(content ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  if (!headers.some((header) => header === 'category' || header === 'title')) {
    throw new Error('CSV başlık satırı geçersiz; category ve title sütunları gerekli');
  }

  /** @type {Record<string, unknown>[]} */
  const rows = [];
  for (let index = 1; index < lines.length; index += 1) {
    const values = parseCsvLine(lines[index]);
    /** @type {Record<string, unknown>} */
    const row = {};
    headers.forEach((header, columnIndex) => {
      if (!COLLECTOR_SUPPORTED_FIELDS.includes(header)) return;
      row[header] = values[columnIndex] ?? '';
    });
    rows.push(row);
  }

  return rows;
}
