/**
 * Listing Quality Enrichment — data completeness signals (Sprint-31 / Faz C).
 */

import { safeNumber } from '../engine/score-utils.js';
import { detectMissingCategoryFields } from './listing-normalization-engine.js';

/** @type {Readonly<string[]>} */
export const ENRICHMENT_SIGNALS = Object.freeze([
  'title',
  'description',
  'price',
  'location',
  'images',
  'attributes'
]);

/** @type {Map<string, unknown>} */
const memoCache = new Map();

/**
 * Clear memoization cache (testing).
 */
export function clearListingQualityEnrichmentMemoCache() {
  memoCache.clear();
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {number}
 */
export function computeListingDataCompleteness(listing) {
  let present = 0;
  if (String(listing.title ?? '').trim()) present += 1;
  if (String(listing.description ?? '').trim()) present += 1;
  if (safeNumber(listing.price) > 0) present += 1;
  if (String(listing.location ?? '').trim()) present += 1;
  if (Array.isArray(listing.images) && listing.images.length > 0) present += 1;
  if (listing.attributes && typeof listing.attributes === 'object') present += 1;

  const baseScore = Math.round((present / ENRICHMENT_SIGNALS.length) * 100);
  const missingCategoryFields = detectMissingCategoryFields(listing);
  const categoryPenalty = missingCategoryFields.length * 8;

  return Math.max(0, Math.min(100, baseScore - categoryPenalty));
}

/**
 * @param {number} completeness
 * @returns {'low'|'medium'|'high'}
 */
export function resolveCompletenessLevel(completeness) {
  if (completeness >= 75) return 'high';
  if (completeness >= 45) return 'medium';
  return 'low';
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {Record<string, unknown>}
 */
export function enrichListingQuality(listing) {
  const dataCompleteness = computeListingDataCompleteness(listing);
  const level = resolveCompletenessLevel(dataCompleteness);
  const missingFields = detectMissingCategoryFields(listing);

  return {
    listing_id: String(listing.id ?? ''),
    dataCompleteness,
    completenessLevel: level,
    missingFields,
    enrichmentSignals: ENRICHMENT_SIGNALS.filter((signal) => {
      if (signal === 'images') return Array.isArray(listing.images) && listing.images.length > 0;
      if (signal === 'attributes') return listing.attributes && typeof listing.attributes === 'object';
      return Boolean(String(listing[signal] ?? '').trim()) || safeNumber(listing[signal]) > 0;
    })
  };
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @param {{ skipCache?: boolean }} [options]
 * @returns {Record<string, unknown>}
 */
export function runListingQualityEnrichment(listings, options = {}) {
  const input = Array.isArray(listings) ? listings : [];
  const cacheKey = `lqe:${input.length}`;

  if (!options.skipCache) {
    const cached = memoCache.get(cacheKey);
    if (cached) return /** @type {Record<string, unknown>} */ (cached);
  }

  const enrichments = input.map((listing) => enrichListingQuality(listing));
  const avgCompleteness =
    enrichments.length > 0
      ? Math.round(
          enrichments.reduce((sum, item) => sum + safeNumber(item.dataCompleteness), 0) /
            enrichments.length
        )
      : 0;

  const result = {
    enrichments,
    avgDataCompleteness: avgCompleteness,
    lowQualityCount: enrichments.filter((item) => item.completenessLevel === 'low').length
  };

  memoCache.set(cacheKey, result);
  if (memoCache.size > 8) {
    const oldest = memoCache.keys().next().value;
    if (oldest) memoCache.delete(oldest);
  }

  return result;
}
