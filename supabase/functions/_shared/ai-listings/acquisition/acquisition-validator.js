/**
 * Data Acquisition — row validation (Sprint-9).
 */

import { isHttpOrHttpsUrl } from '../validation.js';
import { parseCsvLine } from '../import-parser.js';

export const ACQUISITION_MAX_ROWS = 1000;
export const ACQUISITION_MAX_PAYLOAD_BYTES = 2 * 1024 * 1024;

/**
 * @param {unknown} value
 * @returns {number}
 */
export function measureAcquisitionPayloadBytes(value) {
  return new TextEncoder().encode(String(value ?? '')).length;
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
    if (!Array.isArray(parsed)) throw new Error('images alanı dizi olmalıdır');
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
    throw new Error('attributes alanı JSON nesnesi olmalıdır');
  }
  return parsed;
}

/**
 * @param {Record<string, unknown>} raw
 * @param {string} sourceType
 * @returns {{ ok: true, value: Record<string, unknown> } | { ok: false, errors: string[] }}
 */
export function validateAcquisitionRow(raw, sourceType = 'manual') {
  /** @type {string[]} */
  const errors = [];

  const category = String(raw.category ?? '').trim();
  const title = String(raw.title ?? '').trim();

  if (!category) errors.push('category zorunludur');
  if (!title) errors.push('title zorunludur');

  let price;
  if (raw.price !== undefined && raw.price !== null && String(raw.price).trim() !== '') {
    price = Number(String(raw.price).replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(price) || price < 0) {
      errors.push('price sayısal olmalıdır');
    }
  }

  const currencyRaw = raw.currency;
  if (currencyRaw !== undefined && currencyRaw !== null && String(currencyRaw).trim() !== '') {
    if (typeof currencyRaw !== 'string' && typeof currencyRaw !== 'number') {
      errors.push('currency metin olmalıdır');
    }
  }

  let images = [];
  try {
    images = parseImagesValue(raw.images);
    if (raw.images !== undefined && raw.images !== null && String(raw.images).trim() !== '') {
      if (!Array.isArray(images)) errors.push('images dizi olmalıdır');
    }
  } catch {
    errors.push('images geçerli bir dizi olmalıdır');
  }

  let attributes = {};
  try {
    attributes = parseAttributesValue(raw.attributes);
  } catch {
    errors.push('attributes geçerli bir JSON nesnesi olmalıdır');
  }

  const sourceUrlRaw = raw.source_url;
  if (sourceUrlRaw !== undefined && sourceUrlRaw !== null && String(sourceUrlRaw).trim()) {
    if (!isHttpOrHttpsUrl(sourceUrlRaw)) {
      errors.push('source_url yalnızca http veya https olabilir');
    }
  }

  if (errors.length) return { ok: false, errors };

  /** @type {Record<string, unknown>} */
  const normalized = {
    category,
    title,
    currency: String(raw.currency ?? 'TRY').trim() || 'TRY',
    images,
    attributes,
    source_type: String(raw.source_type ?? sourceType).trim() || sourceType
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

/** @type {ReadonlyArray<string>} */
export const ACQUISITION_SUPPORTED_FIELDS = Object.freeze([
  'category',
  'title',
  'description',
  'price',
  'currency',
  'location',
  'source_url',
  'images',
  'attributes',
  'source_type'
]);

/**
 * @param {string} content
 * @returns {Record<string, unknown>[]}
 */
export function parseAcquisitionCsvRows(content) {
  const lines = String(content ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  if (!headers.length || !headers.some((header) => header === 'category' || header === 'title')) {
    throw new Error('CSV başlık satırı eksik veya geçersiz; category ve title sütunları gerekli');
  }

  /** @type {Record<string, unknown>[]} */
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    /** @type {Record<string, unknown>} */
    const row = {};
    headers.forEach((header, index) => {
      if (!ACQUISITION_SUPPORTED_FIELDS.includes(header)) return;
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
export function parseAcquisitionJsonRows(content) {
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
    for (const field of ACQUISITION_SUPPORTED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(item, field)) {
        row[field] = item[field];
      }
    }
    return row;
  });
}
