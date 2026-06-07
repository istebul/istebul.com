/**
 * AI Listings Repository v1 — unified client entry (Sprint-11).
 *
 * Future-ready data hub for listing pool, partner APIs, CSV/JSON imports,
 * AI Builder, Duplicate Engine, and Executive Engine.
 * Does not modify edge endpoints, auth, or DB schema.
 */

import { buildRepositoryRecords } from './repository-engine.js';
import { computeRepositoryStats, computeRepositoryStatsByCategory } from './repository-stats.js';
import { searchRepositoryRecords } from './repository-search.js';
import { buildRepositorySummary } from './repository-summary.js';
import {
  applyRepositoryFilters,
  filterRepositoryByCategoryTab,
  REPOSITORY_CATEGORY_TABS,
  REPOSITORY_FILTER_CHIPS
} from './repository-filters.js';

export {
  REPOSITORY_SOURCE_TYPES,
  REPOSITORY_SOURCE_ALIASES,
  normalizeRepositorySource,
  extractRepositoryScores,
  deriveRepositoryRecord,
  buildRepositoryRecords,
  groupDuplicatesByFingerprint,
  isActiveRepositoryRecord
} from './repository-engine.js';

export { computeRepositoryStats, computeRepositoryStatsByCategory } from './repository-stats.js';

export {
  normalizeSearchText,
  recordMatchesSearch,
  searchRepositoryRecords,
  searchRepositoryRecordsByField
} from './repository-search.js';

export { buildRepositorySummary } from './repository-summary.js';

export {
  REPOSITORY_FILTER_CHIPS,
  REPOSITORY_CATEGORY_TABS,
  recordMatchesRepositoryFilter,
  filterRepositoryByCategoryTab,
  applyRepositoryFilters,
  normalizeActiveFilters,
  toggleRepositoryFilter
} from './repository-filters.js';

/**
 * @typedef {Object} RepositoryQueryOptions
 * @property {string} [categoryTab]
 * @property {string|string[]} [filters]
 * @property {string} [search]
 * @property {boolean} [includeDuplicateDetection]
 */

/**
 * @typedef {Object} RepositoryQueryResult
 * @property {Array<Record<string, unknown>>} records
 * @property {Array<Record<string, unknown>>} filtered
 * @property {ReturnType<typeof computeRepositoryStats>} stats
 * @property {ReturnType<typeof buildRepositorySummary>} summary
 */

/**
 * Build repository view from raw listings (client-side derive; no new API).
 * @param {Array<Record<string, unknown>>} listings
 * @param {RepositoryQueryOptions} [options]
 * @returns {RepositoryQueryResult}
 */
export function runRepositoryQuery(listings, options = {}) {
  const records = Array.isArray(options.records)
    ? [...options.records]
    : buildRepositoryRecords(listings, {
        includeDuplicateDetection: options.includeDuplicateDetection !== false
      });

  let filtered = filterRepositoryByCategoryTab(records, options.categoryTab ?? 'all');
  filtered = applyRepositoryFilters(filtered, options.filters);
  filtered = searchRepositoryRecords(filtered, options.search ?? '');

  const stats = computeRepositoryStatsByCategory(records, options.categoryTab ?? 'all');
  const summary = buildRepositorySummary(filtered);

  return { records, filtered, stats, summary };
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @returns {Array<Record<string, unknown>>}
 */
export function buildRepositoryFromListings(listings) {
  return buildRepositoryRecords(listings);
}
