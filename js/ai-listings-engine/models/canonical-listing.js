/**
 * Canonical listing model for AI Listings Engine Sprint-1.
 */

import { safeNumber, readAttribute } from '../scoring/score-utils.js';

/** @typedef {'vehicle'|'housing'|'real_estate'|'vacation'|'general'} ListingCategory */

/**
 * @typedef {Object} CanonicalListing
 * @property {string} id
 * @property {string} category
 * @property {string} title
 * @property {string} description
 * @property {number} price
 * @property {string} currency
 * @property {string} location
 * @property {string} brand
 * @property {string} model
 * @property {number|null} year
 * @property {number|null} km
 * @property {string} fuel
 * @property {string} transmission
 * @property {string[]} images
 * @property {Record<string, unknown>} attributes
 * @property {string} source_type
 * @property {string} source_url
 * @property {number|null} quality_score
 * @property {number|null} market_score
 * @property {number|null} risk_score
 * @property {number|null} price_score
 * @property {number|null} confidence_score
 * @property {number|null} decision_score
 * @property {string} decision_summary
 * @property {string[]} strengths
 * @property {string[]} risks
 * @property {string[]} tags
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @param {unknown} value
 * @returns {string}
 */
function flattenLocation(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object' && value !== null) {
    const label = /** @type {{ label?: unknown }} */ (value).label;
    if (typeof label === 'string') return label.trim();
    return JSON.stringify(value);
  }
  return String(value).trim();
}

/**
 * @param {Record<string, unknown>} [overrides]
 * @returns {CanonicalListing}
 */
export function createCanonicalListing(overrides = {}) {
  const now = new Date().toISOString();
  const attributes =
    overrides.attributes && typeof overrides.attributes === 'object' && !Array.isArray(overrides.attributes)
      ? /** @type {Record<string, unknown>} */ ({ ...overrides.attributes })
      : {};

  const yearRaw = readAttribute(attributes, ['year', 'yil', 'model_year']);
  const kmRaw = readAttribute(attributes, ['mileage', 'km', 'kilometre']);
  const year = yearRaw !== undefined ? safeNumber(yearRaw) : null;
  const km = kmRaw !== undefined ? safeNumber(kmRaw) : null;

  return {
    id: String(overrides.id ?? ''),
    category: String(overrides.category ?? 'general'),
    title: String(overrides.title ?? '').trim(),
    description: String(overrides.description ?? '').trim(),
    price: safeNumber(overrides.price),
    currency: String(overrides.currency ?? 'TRY').trim() || 'TRY',
    location: flattenLocation(overrides.location),
    brand: String(readAttribute(attributes, ['brand', 'marka']) ?? overrides.brand ?? '').trim(),
    model: String(readAttribute(attributes, ['model']) ?? overrides.model ?? '').trim(),
    year: year && year > 0 ? year : null,
    km: km >= 0 && kmRaw !== undefined ? km : null,
    fuel: String(readAttribute(attributes, ['fuel_type', 'yakit_turu', 'fuel']) ?? overrides.fuel ?? '').trim(),
    transmission: String(
      readAttribute(attributes, ['transmission', 'vites', 'gearbox']) ?? overrides.transmission ?? ''
    ).trim(),
    images: Array.isArray(overrides.images) ? overrides.images.map(String) : [],
    attributes,
    source_type: String(overrides.source_type ?? 'manual').trim() || 'manual',
    source_url: String(overrides.source_url ?? '').trim(),
    quality_score: overrides.quality_score ?? null,
    market_score: overrides.market_score ?? null,
    risk_score: overrides.risk_score ?? null,
    price_score: overrides.price_score ?? null,
    confidence_score: overrides.confidence_score ?? null,
    decision_score: overrides.decision_score ?? null,
    decision_summary: String(overrides.decision_summary ?? ''),
    strengths: Array.isArray(overrides.strengths) ? overrides.strengths.map(String) : [],
    risks: Array.isArray(overrides.risks) ? overrides.risks.map(String) : [],
    tags: Array.isArray(overrides.tags) ? overrides.tags.map(String) : [],
    created_at: String(overrides.created_at ?? now),
    updated_at: String(overrides.updated_at ?? now)
  };
}

/**
 * @param {CanonicalListing} listing
 * @param {Partial<CanonicalListing>} patch
 * @returns {CanonicalListing}
 */
export function mergeCanonicalListing(listing, patch) {
  return createCanonicalListing({ ...listing, ...patch, attributes: { ...listing.attributes, ...(patch.attributes ?? {}) } });
}
