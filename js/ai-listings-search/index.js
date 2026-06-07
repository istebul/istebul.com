/**
 * AI Listings Search v1 — client entry (Sprint-15).
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

export {
  SYNONYM_MAP,
  resolveSynonym,
  resolveSynonymTokens,
  resolvePhraseSynonym
} from './synonym-engine.js';

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

export {
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

export { escapeSearchHtml, highlightSearchTerms, buildHighlightedFields } from './highlight-engine.js';

export { buildSearchSuggestions, suggestionsAreFromDataset } from './suggestion-engine.js';

export { buildSearchResults, buildResultSummary } from './result-builder.js';

export { buildSearchSummary } from '../../supabase/functions/_shared/ai-listings/search/summary.js';
