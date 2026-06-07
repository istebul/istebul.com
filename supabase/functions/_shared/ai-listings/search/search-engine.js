/**
 * AI Listings Search Engine v1 — deterministic repository search (Sprint-15).
 * Derives from existing listings + analysis; no endpoint or DB schema change.
 */

import { normalizeCanonicalListing } from '../engine/canonical-engine.js';
import { buildRepositoryRecords } from '../repository/repository-engine.js';
import { parseSearchQuery, extractKnownBrandsModels } from './query-parser.js';
import { rankDocument, sortSearchResults } from './ranking-engine.js';
import { filterBySimilarityThreshold, enrichWithSimilarity } from './similarity-engine.js';
import { buildTokenIndex } from './tokenizer.js';
import { sanitizeSearchQuery } from './normalizer.js';
import { buildSearchSummary } from './summary.js';

/** @type {Map<string, { documents: Array<Record<string, unknown>>, tokenIndex: Map<string, Set<string>>, cacheKey: string }>} */
const memoCache = new Map();

export const SEARCH_SORT_OPTIONS = Object.freeze([
  { id: 'best_match', label: 'En iyi eşleşme' },
  { id: 'newest', label: 'En yeni' },
  { id: 'highest_ai', label: 'En yüksek AI' },
  { id: 'lowest_risk', label: 'En düşük risk' },
  { id: 'highest_quality', label: 'En yüksek kalite' }
]);

export const SEARCH_FILTER_CHIPS = Object.freeze([
  { id: 'vehicle', label: 'Araç' },
  { id: 'housing', label: 'Konut' },
  { id: 'vacation', label: 'Tatil' },
  { id: 'manual', label: 'Manual' },
  { id: 'ai_builder', label: 'AI Builder' },
  { id: 'csv', label: 'CSV' },
  { id: 'json', label: 'JSON' },
  { id: 'partner_api', label: 'Partner' }
]);

/**
 * @param {Record<string, unknown>} record
 * @param {Record<string, unknown>} listing
 * @returns {Record<string, unknown>}
 */
export function buildSearchDocument(record, listing) {
  const canonical = normalizeCanonicalListing(listing);
  const attributes =
    listing.attributes && typeof listing.attributes === 'object' && !Array.isArray(listing.attributes)
      ? /** @type {Record<string, unknown>} */ (listing.attributes)
      : {};

  return {
    ...record,
    description: String(canonical.description ?? listing.description ?? ''),
    km: canonical.km ?? null,
    fuel: String(canonical.fuel ?? ''),
    transmission: String(canonical.transmission ?? ''),
    body_type: String(attributes.body_type ?? attributes.segment ?? attributes.kasa_tipi ?? ''),
    segment: String(attributes.segment ?? attributes.body_type ?? ''),
    attributes
  };
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @returns {Array<Record<string, unknown>>}
 */
export function buildSearchDocuments(listings, options = {}) {
  const records = buildRepositoryRecords(listings, {
    includeDuplicateDetection: options.includeDuplicateDetection === true
  });
  const listingById = new Map(listings.map((listing) => [String(listing.id ?? ''), listing]));

  return records.map((record) => {
    const listing = listingById.get(String(record.id ?? '')) ?? {};
    return buildSearchDocument(record, listing);
  });
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @returns {string}
 */
function buildCacheKey(listings) {
  if (!listings.length) return 'empty';
  const first = String(listings[0]?.id ?? '');
  const last = String(listings[listings.length - 1]?.id ?? '');
  return `${listings.length}:${first}:${last}`;
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @returns {{ documents: Array<Record<string, unknown>>, tokenIndex: Map<string, Set<string>> }}
 */
export function getSearchIndex(listings) {
  const cacheKey = buildCacheKey(listings);
  const cached = memoCache.get(cacheKey);
  if (cached && cached.cacheKey === cacheKey) {
    return { documents: cached.documents, tokenIndex: cached.tokenIndex };
  }

  const documents = buildSearchDocuments(listings);
  const tokenIndex = buildTokenIndex(documents);
  memoCache.set(cacheKey, { documents, tokenIndex, cacheKey });

  if (memoCache.size > 5) {
    const oldest = memoCache.keys().next().value;
    if (oldest) memoCache.delete(oldest);
  }

  return { documents, tokenIndex };
}

/**
 * @param {Record<string, unknown>} record
 * @param {string} filterId
 * @returns {boolean}
 */
function recordMatchesRepositoryFilter(record, filterId) {
  const id = String(filterId ?? '').trim().toLowerCase();
  if (!id) return true;

  const category = String(record.category ?? '').toLowerCase();
  const duplicateStatus = String(record.duplicate_status ?? 'new');
  const executiveLabel = String(record.executive_label ?? '');
  const status = String(record.status ?? '');
  const riskScore = Number(record.risk_score);

  switch (id) {
    case 'vehicle':
    case 'arac':
    case 'araç':
      return category === 'vehicle';
    case 'housing':
    case 'konut':
      return category === 'housing' || category === 'real_estate';
    case 'vacation':
    case 'tatil':
      return category === 'vacation';
    case 'new':
      return duplicateStatus === 'new';
    case 'duplicate':
      return duplicateStatus === 'exact' || duplicateStatus === 'similar';
    case 'risky':
      return executiveLabel === 'Riskli' || executiveLabel === 'Önerilmez' || (Number.isFinite(riskScore) && riskScore >= 61);
    case 'reviewable':
      return executiveLabel === 'İncelenebilir' || executiveLabel === 'Dikkatli İncelenmeli';
    case 'buyable':
      return executiveLabel === 'Satın Alınabilir';
    case 'archived':
      return status === 'archived';
    default:
      return true;
  }
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {string} categoryTab
 * @returns {Array<Record<string, unknown>>}
 */
function filterRepositoryByCategoryTab(records, categoryTab) {
  const tab = String(categoryTab ?? 'all').trim().toLowerCase();
  if (!tab || tab === 'all' || tab === 'toplam') return [...records];
  return records.filter((record) => recordMatchesRepositoryFilter(record, tab));
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {string|string[]|null|undefined} activeFilters
 * @returns {Array<Record<string, unknown>>}
 */
function applyRepositoryFilters(records, activeFilters) {
  const filters = Array.isArray(activeFilters)
    ? activeFilters.map((value) => String(value).trim().toLowerCase()).filter(Boolean)
    : String(activeFilters ?? '')
        .trim()
        .toLowerCase()
        ? [String(activeFilters).trim().toLowerCase()]
        : [];

  if (!filters.length) return [...records];
  return records.filter((record) => filters.every((filterId) => recordMatchesRepositoryFilter(record, filterId)));
}

/**
 * @param {Record<string, unknown>} record
 * @param {string} filterId
 * @returns {boolean}
 */
export function recordMatchesSearchFilter(record, filterId) {
  const id = String(filterId ?? '').trim().toLowerCase();
  if (!id) return true;

  if (['vehicle', 'housing', 'vacation', 'manual', 'ai_builder', 'csv', 'json', 'partner_api', 'partner'].includes(id)) {
    if (id === 'partner' || id === 'partner_api') {
      return String(record.source ?? '') === 'partner_api' || String(record.source ?? '') === 'future_partner';
    }
    if (id === 'manual' || id === 'ai_builder' || id === 'csv' || id === 'json') {
      return String(record.source ?? '') === id;
    }
    return recordMatchesRepositoryFilter(record, id);
  }

  return recordMatchesRepositoryFilter(record, id);
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {string|string[]} activeFilters
 * @returns {Array<Record<string, unknown>>}
 */
export function applySearchFilters(records, activeFilters) {
  const filters = Array.isArray(activeFilters)
    ? activeFilters.map((v) => String(v).trim().toLowerCase()).filter(Boolean)
    : String(activeFilters ?? '')
        .trim()
        .toLowerCase()
        ? [String(activeFilters).trim().toLowerCase()]
        : [];

  if (!filters.length) return [...records];

  return records.filter((record) => filters.every((filterId) => recordMatchesSearchFilter(record, filterId)));
}

/**
 * @typedef {Object} SearchQueryOptions
 * @property {string} [query]
 * @property {string} [categoryTab]
 * @property {string|string[]} [filters]
 * @property {string} [sortBy]
 * @property {number} [threshold]
 * @property {boolean} [includeBelowThreshold]
 */

/**
 * @param {Array<Record<string, unknown>>} listings
 * @param {SearchQueryOptions} [options]
 * @returns {{ results: Array<Record<string, unknown>>, summary: ReturnType<typeof buildSearchSummary>, parsed: ReturnType<typeof parseSearchQuery>, documents: Array<Record<string, unknown>> }}
 */
export function runRepositorySearch(listings, options = {}) {
  const query = sanitizeSearchQuery(options.query ?? '');
  const { documents } = getSearchIndex(listings);

  let filtered = filterRepositoryByCategoryTab(documents, options.categoryTab ?? 'all');
  filtered = applyRepositoryFilters(filtered, options.filters);
  filtered = applySearchFilters(filtered, options.filters);

  if (!query) {
    const results = sortSearchResults(
      filtered.map((doc) => enrichWithSimilarity({ ...doc, search_score: 0, similarity_percent: 0 })),
      options.sortBy ?? 'newest'
    );
    return {
      results,
      summary: buildSearchSummary(results, ''),
      parsed: parseSearchQuery(''),
      documents
    };
  }

  const { brands, models } = extractKnownBrandsModels(documents);
  const parsed = parseSearchQuery(query, { knownBrands: brands, knownModels: models });

  const ranked = filtered.map((doc) => {
    const { score } = rankDocument(doc, parsed);
    return enrichWithSimilarity({ ...doc, search_score: score });
  });

  let results = filterBySimilarityThreshold(ranked, {
    threshold: options.threshold,
    includeBelowThreshold: options.includeBelowThreshold
  });

  results = sortSearchResults(results, options.sortBy ?? 'best_match');

  return {
    results,
    summary: buildSearchSummary(results, query),
    parsed,
    documents
  };
}

/**
 * Clear memoization cache (testing).
 */
export function clearSearchMemoCache() {
  memoCache.clear();
}
