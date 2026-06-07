/**
 * Duplicate Cluster Engine — groups similar listings (Sprint-31 / Faz C).
 */

import { runDuplicateEngine, DUPLICATE_THRESHOLDS } from '../duplicate/duplicate-engine.js';
import { safeNumber } from '../engine/score-utils.js';

/** @type {Map<string, unknown>} */
const memoCache = new Map();

/**
 * Clear memoization cache (testing).
 */
export function clearDuplicateClusterMemoCache() {
  memoCache.clear();
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @returns {string}
 */
export function buildDuplicateClusterCacheKey(listings) {
  return `dc:${Array.isArray(listings) ? listings.length : 0}`;
}

/**
 * @param {Record<string, unknown>} listing
 * @param {Array<Record<string, unknown>>} pool
 * @returns {Record<string, unknown>}
 */
export function buildDuplicateClusterForListing(listing, pool) {
  const duplicate = runDuplicateEngine(listing, pool, { excludeId: String(listing.id ?? '') });
  const clusterMembers = (duplicate.matches ?? [])
    .filter((match) => safeNumber(match.similarity) >= DUPLICATE_THRESHOLDS.similar)
    .map((match) => ({
      listing_id: match.listing_id,
      similarity: match.similarity,
      title: match.title
    }));

  return {
    listing_id: String(listing.id ?? ''),
    duplicateCluster: {
      status: duplicate.status,
      similarity: duplicate.similarity,
      matched_listing_id: duplicate.matched_listing_id,
      members: clusterMembers,
      summary: duplicate.summary
    }
  };
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @param {{ skipCache?: boolean }} [options]
 * @returns {Record<string, unknown>}
 */
export function runDuplicateClusterEngine(listings, options = {}) {
  const input = Array.isArray(listings) ? listings : [];
  const cacheKey = buildDuplicateClusterCacheKey(input);

  if (!options.skipCache) {
    const cached = memoCache.get(cacheKey);
    if (cached) return /** @type {Record<string, unknown>} */ (cached);
  }

  const clusters = input.map((listing) => buildDuplicateClusterForListing(listing, input));
  const exactCount = clusters.filter(
    (cluster) => cluster.duplicateCluster.status === 'exact'
  ).length;
  const similarCount = clusters.filter(
    (cluster) => cluster.duplicateCluster.status === 'similar'
  ).length;

  const result = {
    clusters,
    exactCount,
    similarCount,
    newCount: input.length - exactCount - similarCount
  };

  memoCache.set(cacheKey, result);
  if (memoCache.size > 8) {
    const oldest = memoCache.keys().next().value;
    if (oldest) memoCache.delete(oldest);
  }

  return result;
}
