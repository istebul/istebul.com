/**
 * AI Listings Auto Collector — validation (Sprint-13).
 */

import { isHttpOrHttpsUrl } from '../validation.js';
import { IMPORT_MAX_ROWS, IMPORT_MAX_CONTENT_BYTES } from '../import-parser.js';

export const COLLECTOR_MAX_ROWS = IMPORT_MAX_ROWS;
export const COLLECTOR_MAX_CONTENT_BYTES = IMPORT_MAX_CONTENT_BYTES;

/** @type {ReadonlyArray<string>} */
export const COLLECTOR_SUPPORTED_FIELDS = Object.freeze([
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
 * @param {unknown} value
 * @returns {number}
 */
export function measureCollectorContentBytes(value) {
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
    if (!Array.isArray(parsed)) throw new Error('images dizi olmalıdır');
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
    throw new Error('attributes JSON nesnesi olmalıdır');
  }
  return parsed;
}

/**
 * @param {Record<string, unknown>} raw
 * @param {string} [sourceType]
 * @returns {{ ok: true, value: Record<string, unknown> } | { ok: false, errors: string[] }}
 */
export function validateCollectorRow(raw, sourceType = 'manual') {
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

  let images = [];
  try {
    images = parseImagesValue(raw.images);
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

/**
 * @param {number} rowCount
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateCollectorBatchLimit(rowCount) {
  if (rowCount > COLLECTOR_MAX_ROWS) {
    return { ok: false, message: `Maksimum ${COLLECTOR_MAX_ROWS} kayıt sınırı aşıldı` };
  }
  return { ok: true };
}

/**
 * @param {unknown} content
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateCollectorContentSize(content) {
  const bytes = measureCollectorContentBytes(content);
  if (bytes > COLLECTOR_MAX_CONTENT_BYTES) {
    return { ok: false, message: `İçerik boyutu ${COLLECTOR_MAX_CONTENT_BYTES} bayt sınırını aşıyor` };
  }
  return { ok: true };
}
