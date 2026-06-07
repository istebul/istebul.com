/**
 * AI Listings Search v1 — shared entry (Sprint-15).
 */

export {
  normalizeTurkishChars,
  normalizeText,
  normalizeToken,
  parseKmValue,
  parsePriceValue,
  sanitizeSearchQuery
} from './normalizer.js';

export { tokenize, joinTokens, buildTokenIndex } from './tokenizer.js';

export { SYNONYM_MAP, resolveSynonym, resolveSynonymTokens, resolvePhraseSynonym } from './synonym-engine.js';

export { parseSearchQuery, extractKnownBrandsModels } from './query-parser.js';

export {
  RANKING_WEIGHTS,
  MIN_SIMILARITY_THRESHOLD,
  clampScore,
  scoreToSimilarityPercent,
  rankDocument,
  sortSearchResults
} from './ranking-engine.js';

export {
  passesSimilarityThreshold,
  filterBySimilarityThreshold,
  enrichWithSimilarity
} from './similarity-engine.js';

export { buildSearchSummary } from './summary.js';

export {
  SEARCHABLE_FIELDS,
  buildSearchableText,
  documentMatchesSearchQuery,
  SEARCH_SORT_OPTIONS,
  SEARCH_FILTER_CHIPS,
  buildSearchDocument,
  buildSearchDocuments,
  getSearchIndex,
  recordMatchesSearchFilter,
  applySearchFilters,
  runRepositorySearch,
  clearSearchMemoCache
} from './search-engine.js';
