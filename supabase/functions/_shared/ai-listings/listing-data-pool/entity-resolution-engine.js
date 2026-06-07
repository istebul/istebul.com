/**
 * Entity Resolution Engine — resolves listing entity confidence (Sprint-31 / Faz C).
 * No sensitive personal attribute inference.
 */

import { safeNumber, readAttribute } from '../engine/score-utils.js';
import { computeListingDataCompleteness } from './listing-quality-enrichment.js';

/** @type {Map<string, unknown>} */
const memoCache = new Map();

/**
 * Clear memoization cache (testing).
 */
export function clearEntityResolutionMemoCache() {
  memoCache.clear();
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {string}
 */
export function buildEntityResolutionCacheKey(listing) {
  return `er:${String(listing?.id ?? '')}:${String(listing?.title ?? '')}`;
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {Record<string, unknown>}
 */
export function buildEntityFingerprint(listing) {
  const category = String(listing.category ?? 'vehicle');
  const attributes = /** @type {Record<string, unknown>} */ (listing.attributes ?? {});

  const brand = String(readAttribute(attributes, ['brand', 'marka']) ?? listing.brand ?? '').trim();
  const model = String(readAttribute(attributes, ['model']) ?? listing.model ?? '').trim();
  const location = String(listing.location ?? '').trim().toLocaleLowerCase('tr-TR');
  const price = safeNumber(listing.price);

  return {
    category,
    brand: brand || null,
    model: model || null,
    location: location || null,
    priceBand: price > 0 ? Math.round(price / 100000) * 100000 : null
  };
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {number}
 */
export function computeEntityConfidence(listing) {
  const fingerprint = buildEntityFingerprint(listing);
  let score = 40;

  if (fingerprint.brand) score += 15;
  if (fingerprint.model) score += 15;
  if (fingerprint.location) score += 10;
  if (safeNumber(fingerprint.priceBand) > 0) score += 10;

  const completeness = computeListingDataCompleteness(listing);
  score += Math.round(completeness * 0.1);

  return Math.max(0, Math.min(100, score));
}

/**
 * @param {number} confidence
 * @returns {'low'|'medium'|'high'}
 */
export function resolveEntityConfidenceLevel(confidence) {
  if (confidence >= 75) return 'high';
  if (confidence >= 50) return 'medium';
  return 'low';
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {Record<string, unknown>}
 */
export function resolveListingEntity(listing) {
  const entityConfidence = computeEntityConfidence(listing);
  const fingerprint = buildEntityFingerprint(listing);

  return {
    listing_id: String(listing.id ?? ''),
    entityConfidence,
    confidenceLevel: resolveEntityConfidenceLevel(entityConfidence),
    fingerprint,
    explainable: true,
    note: 'Varlık çözümlemesi yalnızca ilan alanlarından türetilir; hassas kişisel özellik çıkarımı yapılmaz.'
  };
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @param {{ skipCache?: boolean }} [options]
 * @returns {Record<string, unknown>}
 */
export function runEntityResolutionEngine(listings, options = {}) {
  const input = Array.isArray(listings) ? listings : [];
  const cacheKey = `er-batch:${input.length}`;

  if (!options.skipCache) {
    const cached = memoCache.get(cacheKey);
    if (cached) return /** @type {Record<string, unknown>} */ (cached);
  }

  const entities = input.map((listing) => resolveListingEntity(listing));
  const avgConfidence =
    entities.length > 0
      ? Math.round(
          entities.reduce((sum, item) => sum + safeNumber(item.entityConfidence), 0) /
            entities.length
        )
      : 0;

  const result = {
    entities,
    avgEntityConfidence: avgConfidence,
    highConfidenceCount: entities.filter((item) => item.confidenceLevel === 'high').length
  };

  memoCache.set(cacheKey, result);
  if (memoCache.size > 8) {
    const oldest = memoCache.keys().next().value;
    if (oldest) memoCache.delete(oldest);
  }

  return result;
}
