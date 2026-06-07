/**
 * AI Auto Listing Builder — canonical listing preview builder.
 */

import { parsePriceValue, parseKmValue, parseYearValue } from './text-parser.js';
import { isSafeBuilderUrl } from './url-parser.js';

/**
 * @param {Record<string, { value: unknown, confidence: number }>} fieldMap
 * @param {string} key
 * @returns {{ value: unknown, confidence: number }}
 */
function readField(fieldMap, key) {
  return fieldMap[key] ?? { value: null, confidence: 0 };
}

/**
 * @param {unknown} value
 * @returns {string|null}
 */
function readString(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

/**
 * @param {Record<string, unknown>} record
 */
function recordToFieldMap(record) {
  /** @type {Record<string, { value: unknown, confidence: number }>} */
  const fields = {};
  for (const [key, value] of Object.entries(record)) {
    fields[key] = { value, confidence: 0.9 };
  }

  const attributes =
    record.attributes && typeof record.attributes === 'object' && !Array.isArray(record.attributes)
      ? /** @type {Record<string, unknown>} */ (record.attributes)
      : {};

  for (const [key, value] of Object.entries(attributes)) {
    fields[key] = { value, confidence: 0.88 };
  }

  return fields;
}

/**
 * @param {Record<string, { value: unknown, confidence: number }>} fields
 */
function computeOverallConfidence(fields) {
  const scores = Object.values(fields)
    .map((field) => Number(field.confidence ?? 0))
    .filter((score) => score > 0);
  if (!scores.length) return 0;
  return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100);
}

/**
 * @param {Record<string, { value: unknown, confidence: number }>} fields
 */
function collectMissingFields(fields) {
  const required = ['category', 'title'];
  /** @type {string[]} */
  const missing = [];

  for (const key of required) {
    if (!readString(readField(fields, key).value)) missing.push(key);
  }

  return missing;
}

/**
 * @param {{
 *   fields: Record<string, { value: unknown, confidence: number }>,
 *   input_type: string,
 *   warnings?: string[]
 * }} input
 */
export function buildCanonicalListing(input) {
  const { fields, input_type, warnings = [] } = input;
  const attributesRaw = readField(fields, 'attributes').value;
  const nestedAttributes =
    attributesRaw && typeof attributesRaw === 'object' && !Array.isArray(attributesRaw)
      ? /** @type {Record<string, unknown>} */ (attributesRaw)
      : {};

  const brand = readString(readField(fields, 'brand').value ?? nestedAttributes.brand);
  const model = readString(readField(fields, 'model').value ?? nestedAttributes.model);
  const yearRaw = readField(fields, 'year').value ?? nestedAttributes.year;
  const kmRaw = readField(fields, 'km').value ?? nestedAttributes.km ?? nestedAttributes.mileage;
  const fuel = readString(readField(fields, 'fuel').value ?? nestedAttributes.fuel ?? nestedAttributes.fuel_type);
  const transmission = readString(
    readField(fields, 'transmission').value ?? nestedAttributes.transmission ?? nestedAttributes.vites
  );
  const color = readString(readField(fields, 'color').value ?? nestedAttributes.color);

  const priceRaw = readField(fields, 'price').value;
  const price = typeof priceRaw === 'number' ? priceRaw : parsePriceValue(priceRaw);
  const year = typeof yearRaw === 'number' ? yearRaw : parseYearValue(yearRaw);
  const km = typeof kmRaw === 'number' ? kmRaw : parseKmValue(kmRaw);

  const sourceUrl = readString(readField(fields, 'source_url').value);
  const extraction_warnings = [...warnings];
  if (sourceUrl && !isSafeBuilderUrl(sourceUrl)) {
    extraction_warnings.push('Geçersiz kaynak URL reddedildi.');
  }

  const tagsValue = readField(fields, 'tags').value;
  const tags = Array.isArray(tagsValue)
    ? tagsValue.map(String).filter(Boolean)
    : readString(tagsValue)
      ? [String(tagsValue)]
      : [];

  /** @type {Record<string, unknown>} */
  const attributes = {};
  if (brand) attributes.brand = brand;
  if (model) attributes.model = model;
  if (year) attributes.year = year;
  if (km !== null && km !== undefined) attributes.km = km;
  if (fuel) attributes.fuel = fuel;
  if (transmission) attributes.transmission = transmission;
  if (color) attributes.color = color;

  const imagesValue = readField(fields, 'images').value;
  const images = Array.isArray(imagesValue)
    ? imagesValue.map(String).filter(Boolean)
    : readString(imagesValue)
      ? [String(imagesValue)]
      : [];

  const listing = {
    category: readString(readField(fields, 'category').value) ?? 'vehicle',
    title: readString(readField(fields, 'title').value) ?? '',
    description: readString(readField(fields, 'description').value) ?? '',
    price: price ?? null,
    currency: readString(readField(fields, 'currency').value) ?? 'TRY',
    location: readString(readField(fields, 'location').value) ?? '',
    images,
    attributes,
    source_type: 'ai_builder',
    source_url: sourceUrl && isSafeBuilderUrl(sourceUrl) ? sourceUrl : null,
    confidence: computeOverallConfidence(fields),
    extraction_warnings,
    tags,
    field_confidence: Object.fromEntries(
      Object.entries(fields).map(([key, field]) => [key, Math.round(Number(field.confidence ?? 0) * 100)])
    ),
    missing_fields: collectMissingFields(fields),
    input_type
  };

  return listing;
}

/**
 * @param {Record<string, unknown>} canonical
 */
export function toCreateListingPayload(canonical) {
  /** @type {Record<string, unknown>} */
  const payload = {
    category: String(canonical.category ?? 'vehicle'),
    title: String(canonical.title ?? '').trim(),
    source_type: 'ai_builder'
  };

  if (canonical.description) payload.description = String(canonical.description);
  if (Number.isFinite(Number(canonical.price))) payload.price = Number(canonical.price);
  if (canonical.currency) payload.currency = String(canonical.currency);
  if (canonical.location) payload.location = String(canonical.location);
  if (Array.isArray(canonical.images) && canonical.images.length) payload.images = canonical.images;
  if (canonical.source_url) payload.source_url = String(canonical.source_url);
  if (canonical.attributes && typeof canonical.attributes === 'object') {
    payload.attributes = canonical.attributes;
  }

  return payload;
}

export { recordToFieldMap, computeOverallConfidence, collectMissingFields };
