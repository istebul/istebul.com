/**
 * isteBul AI Listings — admin bulk import parser (Sprint-8).
 *
 * Internal admin import only. Public publishing remains disabled.
 */

import { isHttpOrHttpsUrl } from './validation.js';

export const IMPORT_MAX_ROWS = 100;
export const IMPORT_MAX_CONTENT_BYTES = 512 * 1024;

export const IMPORT_SUPPORTED_FIELDS = Object.freeze([
  'category',
  'title',
  'description',
  'price',
  'currency',
  'location',
  'source_url',
  'images',
  'attributes'
]);

/**
 * @param {unknown} value
 * @returns {number}
 */
export function measureImportContentBytes(value) {
  return new TextEncoder().encode(String(value ?? '')).length;
}

/**
 * @param {string} line
 * @returns {string[]}
 */
export function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  fields.push(current);
  return fields.map((field) => field.trim());
}

/**
 * @param {string} content
 * @returns {Record<string, unknown>[]}
 */
export function parseCsvRows(content) {
  const lines = String(content ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    /** @type {Record<string, unknown>} */
    const row = {};
    headers.forEach((header, index) => {
      if (!IMPORT_SUPPORTED_FIELDS.includes(header)) return;
      row[header] = values[index] ?? '';
    });
    rows.push(row);
  }

  return rows;
}

/**
 * @param {string} content
 * @returns {Record<string, unknown>[]}
 */
export function parseJsonRows(content) {
  const parsed = JSON.parse(String(content ?? '').trim());
  if (!Array.isArray(parsed)) {
    throw new Error('JSON import must be an array of listing objects');
  }
  return parsed.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('Each JSON row must be an object');
    }
    /** @type {Record<string, unknown>} */
    const row = {};
    for (const field of IMPORT_SUPPORTED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(item, field)) {
        row[field] = item[field];
      }
    }
    return row;
  });
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function parseImagesValue(value) {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value.map(String);
  const raw = String(value).trim();
  if (!raw) return [];
  if (raw.startsWith('[')) {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('images must be an array');
    return parsed.map(String);
  }
  return raw.split('|').map((part) => part.trim()).filter(Boolean);
}

/**
 * @param {unknown} value
 * @returns {Record<string, unknown>}
 */
function parseAttributesValue(value) {
  if (value === undefined || value === null || value === '') return {};
  if (typeof value === 'object' && !Array.isArray(value)) {
    return /** @type {Record<string, unknown>} */ (value);
  }
  const raw = String(value).trim();
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('attributes must be a JSON object');
  }
  return parsed;
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {{ ok: true, value: Record<string, unknown> } | { ok: false, errors: string[] }}
 */
export function validateImportRow(raw) {
  const errors = [];
  const category = String(raw.category ?? '').trim();
  const title = String(raw.title ?? '').trim();

  if (!category) errors.push('category is required');
  if (!title) errors.push('title is required');

  let price;
  if (raw.price !== undefined && raw.price !== null && String(raw.price).trim() !== '') {
    price = Number(raw.price);
    if (!Number.isFinite(price) || price < 0) {
      errors.push('price must be a non-negative number');
    }
  }

  let images = [];
  try {
    images = parseImagesValue(raw.images);
    if (raw.images !== undefined && raw.images !== null && String(raw.images).trim() !== '' && !Array.isArray(images)) {
      errors.push('images must be an array');
    }
  } catch {
    errors.push('images must be an array');
  }

  let attributes = {};
  try {
    attributes = parseAttributesValue(raw.attributes);
  } catch {
    errors.push('attributes must be a valid object');
  }

  const sourceUrlRaw = raw.source_url;
  if (sourceUrlRaw !== undefined && sourceUrlRaw !== null && String(sourceUrlRaw).trim()) {
    if (!isHttpOrHttpsUrl(sourceUrlRaw)) {
      errors.push('source_url must be a valid http or https URL');
    }
  }

  if (errors.length) return { ok: false, errors };

  /** @type {Record<string, unknown>} */
  const normalized = {
    category,
    title,
    currency: String(raw.currency ?? 'TRY').trim() || 'TRY',
    images,
    attributes
  };

  const description = String(raw.description ?? '').trim();
  if (description) normalized.description = description;

  const location = String(raw.location ?? '').trim();
  if (location) normalized.location = location;

  if (price !== undefined) normalized.price = price;

  const sourceUrl = String(sourceUrlRaw ?? '').trim();
  if (sourceUrl) normalized.source_url = sourceUrl;

  return { ok: true, value: normalized };
}

/**
 * @param {'csv'|'json'} format
 * @param {string} content
 * @returns {{
 *   total_count: number,
 *   valid_rows: number,
 *   invalid_rows: number,
 *   row_errors: Array<{ row: number, messages: string[] }>,
 *   normalized_rows: Record<string, unknown>[]
 * }}
 */
export function buildImportPreview(format, content) {
  let rawRows;
  if (format === 'csv') {
    rawRows = parseCsvRows(content);
  } else if (format === 'json') {
    rawRows = parseJsonRows(content);
  } else {
    throw new Error('format must be csv or json');
  }

  if (rawRows.length > IMPORT_MAX_ROWS) {
    throw new Error(`Import exceeds maximum of ${IMPORT_MAX_ROWS} rows`);
  }

  /** @type {Record<string, unknown>[]} */
  const normalized_rows = [];
  /** @type {Array<{ row: number, messages: string[] }>} */
  const row_errors = [];
  let valid_rows = 0;
  let invalid_rows = 0;

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 1;
    const result = validateImportRow(raw);
    if (result.ok) {
      valid_rows += 1;
      normalized_rows.push(result.value);
    } else {
      invalid_rows += 1;
      row_errors.push({ row: rowNumber, messages: result.errors });
    }
  });

  return {
    total_count: rawRows.length,
    valid_rows,
    invalid_rows,
    row_errors,
    normalized_rows
  };
}

/**
 * @param {unknown} body
 * @returns {{ ok: true, value: { format: 'csv'|'json', content: string, analyze: boolean } } | { ok: false, message: string }}
 */
export function validateImportRequestBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, message: 'Request body must be a JSON object' };
  }

  const input = /** @type {Record<string, unknown>} */ (body);
  const format = String(input.format ?? '').trim().toLowerCase();
  if (format !== 'csv' && format !== 'json') {
    return { ok: false, message: 'format must be csv or json' };
  }

  const content = String(input.content ?? '');
  if (!content.trim()) {
    return { ok: false, message: 'content is required' };
  }

  if (measureImportContentBytes(content) > IMPORT_MAX_CONTENT_BYTES) {
    return { ok: false, message: `content exceeds maximum size of ${IMPORT_MAX_CONTENT_BYTES} bytes` };
  }

  const analyze = input.analyze === true;

  return { ok: true, value: { format: /** @type {'csv'|'json'} */ (format), content, analyze } };
}
