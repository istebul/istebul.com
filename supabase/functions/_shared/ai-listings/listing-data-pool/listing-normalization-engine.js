/**
 * Listing Normalization Engine — canonical listing pool (Sprint-31 / Faz C).
 * Supports vehicle, housing, vacation categories.
 */

import { normalizeCanonicalListing } from '../engine/canonical-engine.js';
import { safeNumber, readAttribute } from '../engine/score-utils.js';

/** @type {Readonly<string[]>} */
export const SUPPORTED_LISTING_CATEGORIES = Object.freeze(['vehicle', 'housing', 'vacation']);

/** @type {Readonly<Record<string, string[]>>} */
export const CATEGORY_CRITICAL_FIELDS = Object.freeze({
  vehicle: ['brand', 'model', 'year', 'km'],
  housing: ['room_count', 'sqm', 'floor', 'building_age'],
  vacation: ['date', 'capacity', 'cancellation_policy']
});

/** @type {Map<string, unknown>} */
const memoCache = new Map();

/**
 * Clear memoization cache (testing).
 */
export function clearListingNormalizationMemoCache() {
  memoCache.clear();
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {string}
 */
export function buildListingNormalizationCacheKey(listing) {
  return `ln:${String(listing?.id ?? '')}:${String(listing?.updated_at ?? '')}`;
}

/**
 * @param {string} category
 * @returns {boolean}
 */
export function isSupportedListingCategory(category) {
  return SUPPORTED_LISTING_CATEGORIES.includes(String(category ?? '').trim());
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {string[]}
 */
export function detectMissingCategoryFields(listing) {
  const category = String(listing.category ?? 'vehicle');
  const fields = CATEGORY_CRITICAL_FIELDS[category] ?? [];
  const attributes = /** @type {Record<string, unknown>} */ (listing.attributes ?? {});

  return fields.filter((field) => {
    const value = readAttribute(attributes, [field]);
    return value === undefined || value === null || value === '';
  });
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {Record<string, unknown>}
 */
export function normalizeListingRecord(listing) {
  const canonical = normalizeCanonicalListing(listing);
  const category = String(canonical.category ?? 'vehicle');

  if (!isSupportedListingCategory(category)) {
    return {
      ...canonical,
      category: 'vehicle',
      normalized: true,
      categoryAdjusted: true
    };
  }

  const missingFields = detectMissingCategoryFields(canonical);
  const fieldCount = (CATEGORY_CRITICAL_FIELDS[category] ?? []).length;
  const completeness =
    fieldCount > 0
      ? Math.round(((fieldCount - missingFields.length) / fieldCount) * 100)
      : 100;

  return {
    ...canonical,
    normalized: true,
    missingFields,
    dataCompleteness: completeness
  };
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @param {{ skipCache?: boolean }} [options]
 * @returns {Record<string, unknown>}
 */
export function runListingNormalizationEngine(listings, options = {}) {
  const input = Array.isArray(listings) ? listings : [];
  const cacheKey = `ln-batch:${input.length}:${String(input[0]?.id ?? '')}`;

  if (!options.skipCache) {
    const cached = memoCache.get(cacheKey);
    if (cached) return /** @type {Record<string, unknown>} */ (cached);
  }

  const normalizedListings = input.map((listing) => normalizeListingRecord(listing));
  const avgCompleteness =
    normalizedListings.length > 0
      ? Math.round(
          normalizedListings.reduce((sum, item) => sum + safeNumber(item.dataCompleteness), 0) /
            normalizedListings.length
        )
      : 0;

  const result = {
    normalizedListings,
    count: normalizedListings.length,
    avgDataCompleteness: avgCompleteness,
    supportedCategories: [...SUPPORTED_LISTING_CATEGORIES]
  };

  memoCache.set(cacheKey, result);
  if (memoCache.size > 8) {
    const oldest = memoCache.keys().next().value;
    if (oldest) memoCache.delete(oldest);
  }

  return result;
}
