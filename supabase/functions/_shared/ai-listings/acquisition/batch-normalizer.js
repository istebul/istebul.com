/**
 * Data Acquisition — batch normalization (Sprint-9).
 */

import {
  validateAcquisitionRow,
  parseAcquisitionCsvRows,
  parseAcquisitionJsonRows
} from './acquisition-validator.js';
import { detectAcquisitionSource } from './source-detector.js';

/**
 * @param {'csv'|'json'} format
 * @param {string} content
 * @param {string} sourceType
 * @returns {{
 *   raw_rows: Record<string, unknown>[],
 *   normalized_rows: Record<string, unknown>[],
 *   errors: Array<{ row: number, messages: string[] }>,
 *   valid_rows: number,
 *   invalid_rows: number
 * }}
 */
export function normalizeAcquisitionBatch(format, content, sourceType) {
  let rawRows;
  if (format === 'csv') {
    rawRows = parseAcquisitionCsvRows(content);
  } else if (format === 'json') {
    rawRows = parseAcquisitionJsonRows(content);
  } else {
    throw new Error('format csv veya json olmalıdır');
  }

  const resolvedSource =
    sourceType ||
    detectAcquisitionSource({ format, rows: rawRows });

  /** @type {Record<string, unknown>[]} */
  const normalized_rows = [];
  /** @type {Array<{ row: number, messages: string[] }>} */
  const errors = [];
  let valid_rows = 0;
  let invalid_rows = 0;

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 1;
    const result = validateAcquisitionRow(raw, resolvedSource);
    if (result.ok) {
      valid_rows += 1;
      normalized_rows.push(result.value);
    } else {
      invalid_rows += 1;
      errors.push({ row: rowNumber, messages: result.errors });
    }
  });

  return {
    raw_rows: rawRows,
    normalized_rows,
    errors,
    valid_rows,
    invalid_rows
  };
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} sourceType
 * @returns {Record<string, unknown>|null}
 */
export function normalizeSingleAcquisitionRow(row, sourceType = 'manual') {
  const result = validateAcquisitionRow(row, sourceType);
  return result.ok ? result.value : null;
}
