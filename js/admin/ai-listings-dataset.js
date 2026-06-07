/**
 * AI Listings — repository dataset builder (client-side derive only).
 * Merges listings + embedded analyses into a normalized repository dataset.
 */

import { buildRepositoryRecords } from '../ai-listings-repository/index.js';
import {
  applyRepositoryFilters,
  filterRepositoryByCategoryTab,
  searchRepositoryRecords
} from '../ai-listings-repository/index.js';

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
export function normalizeRepository(listings) {
  return listings
    .map((listing) => normalizeRepositoryListing(listing))
    .filter((listing) => listing !== null);
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
  const normalized = normalizeRepository(listings);

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
 *   cachedListings: Array<Record<string, unknown>>,
 *   normalized: Array<Record<string, unknown>>
 * }}
 */
export function buildAdminRepositorySnapshot(rawListings) {
  const cachedListings = Array.isArray(rawListings) ? rawListings : [];
  const normalized = normalizeRepository(cachedListings);
  const rawAnalyses = extractRawAnalyses(cachedListings);
  const repositoryDataset = buildRepositoryDataset(cachedListings, {
    includeDuplicateDetection: cachedListings.length <= 500
  });

  return {
    rawListings: cachedListings,
    rawAnalyses,
    repositoryDataset,
    cachedListings,
    normalized
  };
}

/**
 * @param {{
 *   rawListings?: Array<Record<string, unknown>>,
 *   cachedListings?: Array<Record<string, unknown>>,
 *   repositoryDataset?: Array<Record<string, unknown>>,
 *   normalized?: Array<Record<string, unknown>>,
 *   searchQuery?: string,
 *   activeCategory?: string,
 *   activeSource?: string,
 *   filtered?: Array<Record<string, unknown>>,
 *   stage?: string
 * }} ctx
 */
export function debugRepositoryRenderPipeline(ctx = {}) {
  const rawListings = ctx.rawListings ?? [];
  const cachedListings = ctx.cachedListings ?? [];
  const repositoryDataset = ctx.repositoryDataset ?? [];
  const normalized = ctx.normalized ?? [];
  const filtered = ctx.filtered ?? [];

  console.log('RAW', rawListings.length);
  console.log('CACHED', cachedListings.length);
  console.log('DATASET', repositoryDataset.length);
  console.log('NORMALIZED', normalized.length);
  console.log('SEARCH', ctx.searchQuery ?? '');
  console.log('CATEGORY', ctx.activeCategory ?? '');
  console.log('SOURCE', ctx.activeSource ?? '');
  console.log('FILTERED', filtered.length);
  if (ctx.stage) console.log('STAGE', ctx.stage);

  console.table(
    filtered.slice(0, 5).map((record) => ({
      id: record.id ?? '',
      title: record.title ?? '',
      category: record.category ?? '',
      source: record.source ?? '',
      brand: record.brand ?? ''
    }))
  );
}

/**
 * Trace repository filter stages without mutating search engine.
 * @param {Array<Record<string, unknown>>} records
 * @param {{
 *   categoryTab?: string,
 *   filters?: string[],
 *   search?: string,
 *   activeCategory?: string,
 *   activeSource?: string,
 *   searchQuery?: string
 * }} [options]
 * @returns {{ records: Array<Record<string, unknown>>, filtered: Array<Record<string, unknown>>, stages: Record<string, number> }}
 */
export function traceRepositoryFilterPipeline(records, options = {}) {
  const stages = {
    before: records.length,
    afterCategory: 0,
    afterChipFilters: 0,
    afterSearch: 0
  };

  let filtered = filterRepositoryByCategoryTab(records, options.categoryTab ?? 'all');
  stages.afterCategory = filtered.length;

  filtered = applyRepositoryFilters(filtered, options.filters);
  stages.afterChipFilters = filtered.length;

  filtered = searchRepositoryRecords(filtered, options.search ?? '');
  stages.afterSearch = filtered.length;

  debugRepositoryRenderPipeline({
    rawListings: records,
    cachedListings: records,
    repositoryDataset: records,
    normalized: records,
    searchQuery: options.searchQuery ?? options.search ?? '',
    activeCategory: options.activeCategory ?? options.categoryTab ?? '',
    activeSource: options.activeSource ?? '',
    filtered,
    stage: `trace:${stages.before}->cat:${stages.afterCategory}->chip:${stages.afterChipFilters}->search:${stages.afterSearch}`
  });

  return { records, filtered, stages };
}
