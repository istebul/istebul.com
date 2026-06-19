/**
 * AI Listings Search v2 — shared entry (Sprint-16).
 */

export {
  normalizeTurkishChars,
  normalizeText,
  normalizeToken,
  parseKmValue,
  parsePriceValue,
  sanitizeSearchQuery
} from './normalizer.js';

export { tokenize, joinTokens, buildTokenIndex, findCandidateIds, clearTokenCache } from './tokenizer.js';

export { SYNONYM_MAP, resolveSynonym, resolveSynonymTokens, resolvePhraseSynonym } from './synonym-engine.js';

export { parseSearchQuery, extractKnownBrandsModels } from './query-parser.js';

export {
  SEARCHABLE_FIELDS,
  SEMANTIC_WEIGHTS,
  buildSearchableText,
  getCachedNormalizedText,
  computeSemanticScores,
  computeSemanticScore,
  clearNormalizedTextCache
} from './semantic-engine.js';

export { BOOST_WEIGHTS, computeBoosts } from './boost-engine.js';

export {
  buildMatchExplanation,
  formatExplanationLines,
  scoreToStarCount,
  scoreToStars
} from './explain-engine.js';

export {
  RANKING_WEIGHTS,
  MIN_SIMILARITY_THRESHOLD,
  clampScore,
  scoreToSimilarityPercent,
  rankDocument,
  sortSearchResults
} from './ranking-engine.js';

export {
  MIN_FILTER_SIMILARITY_THRESHOLD,
  isFilterOnlyQuery,
  resolveSimilarityThreshold,
  passesSimilarityThreshold,
  filterBySimilarityThreshold,
  enrichWithSimilarity
} from './similarity-engine.js';

export { buildSearchSummary } from './summary.js';

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
