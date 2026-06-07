/**
 * AI Listings — repository dataset builder (client-side derive only).
 * Merges listings + embedded analyses into a normalized repository dataset.
 */

import { buildRepositoryRecords } from '../ai-listings-repository/index.js';

/**
 * @param {unknown} listing
 * @returns {Record<string, unknown>|null}
 */
export function normalizeRepositoryListing(listing) {
  if (!listing || typeof listing !== 'object') return null;

  const item = /** @type {Record<string, unknown>} */ (listing);
  const analysis =
    item.latest_analysis && typeof item.latest_analysis === 'object'
      ? /** @type {Record<string, unknown>} */ ({ ...item.latest_analysis })
      : null;

  return {
    ...item,
    latest_analysis: analysis
  };
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @returns {Array<Record<string, unknown>>}
 */
export function extractRawAnalyses(listings) {
  return listings
    .map((listing) => {
      const analysis = listing.latest_analysis;
      if (!analysis || typeof analysis !== 'object') return null;
      return {
        listing_id: String(listing.id ?? ''),
        .../** @type {Record<string, unknown>} */ (analysis)
      };
    })
    .filter(Boolean);
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @param {{ includeDuplicateDetection?: boolean }} [options]
 * @returns {Array<Record<string, unknown>>}
 */
export function buildRepositoryDataset(listings, options = {}) {
  const normalized = listings
    .map((listing) => normalizeRepositoryListing(listing))
    .filter((listing) => listing !== null);

  return buildRepositoryRecords(normalized, {
    includeDuplicateDetection: options.includeDuplicateDetection !== false
  });
}

/**
 * @param {Array<Record<string, unknown>>} rawListings
 * @returns {{
 *   rawListings: Array<Record<string, unknown>>,
 *   rawAnalyses: Array<Record<string, unknown>>,
 *   repositoryDataset: Array<Record<string, unknown>>,
 *   cachedListings: Array<Record<string, unknown>>
 * }}
 */
export function buildAdminRepositorySnapshot(rawListings) {
  const cachedListings = Array.isArray(rawListings) ? rawListings : [];
  const rawAnalyses = extractRawAnalyses(cachedListings);
  const repositoryDataset = buildRepositoryDataset(cachedListings, {
    includeDuplicateDetection: cachedListings.length <= 500
  });

  return {
    rawListings: cachedListings,
    rawAnalyses,
    repositoryDataset,
    cachedListings
  };
}

/**
 * @param {{
 *   rawListings?: Array<Record<string, unknown>>,
 *   rawAnalyses?: Array<Record<string, unknown>>,
 *   repositoryDataset?: Array<Record<string, unknown>>,
 *   cachedListings?: Array<Record<string, unknown>>,
 *   activeAdminView?: string,
 *   repoCategoryTab?: string,
 *   repoFilters?: string[],
 *   repoAiSearchQuery?: string,
 *   searchQuery?: string,
 *   context?: string
 * }} snapshot
 */
export function debugRepositoryDataset(snapshot) {
  console.log({
    rawListings: snapshot.rawListings,
    rawAnalyses: snapshot.rawAnalyses,
    repositoryDataset: snapshot.repositoryDataset,
    cachedListings: snapshot.cachedListings,
    lengths: {
      rawListings: snapshot.rawListings?.length ?? 0,
      rawAnalyses: snapshot.rawAnalyses?.length ?? 0,
      repositoryDataset: snapshot.repositoryDataset?.length ?? 0,
      cachedListings: snapshot.cachedListings?.length ?? 0
    },
    activeAdminView: snapshot.activeAdminView,
    repoCategoryTab: snapshot.repoCategoryTab,
    repoFilters: snapshot.repoFilters,
    repoAiSearchQuery: snapshot.repoAiSearchQuery,
    searchQuery: snapshot.searchQuery,
    context: snapshot.context
  });
}
