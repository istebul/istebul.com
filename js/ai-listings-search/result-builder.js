/**
 * AI Listings Search — search result builder (Sprint-16 v2).
 */

import { buildSearchSummary } from '../../supabase/functions/_shared/ai-listings/search/summary.js';
import { buildHighlightedFields } from './highlight-engine.js';
import { formatExplanationLines, scoreToStars } from './explain-engine.js';

/**
 * @param {Array<Record<string, unknown>>} results
 * @param {import('./query-parser.js').ReturnType<typeof import('./query-parser.js').parseSearchQuery>} parsed
 * @param {string} [query]
 * @returns {Array<Record<string, unknown>>}
 */
export function buildSearchResults(results, parsed, query = '') {
  return results.map((record) => {
    const highlighted = buildHighlightedFields(record, parsed);
    const score = Number(record.similarity_percent ?? record.search_score ?? 0);
    const matchReasons = Array.isArray(record.match_reasons) ? record.match_reasons : [];

    return {
      ...record,
      highlighted,
      display_title: highlighted.title || String(record.title ?? '—'),
      similarity_label: `Benzerlik %${score}`,
      similarity_stars: scoreToStars(score),
      match_explanation: formatExplanationLines(matchReasons),
      match_reasons: matchReasons
    };
  });
}

/**
 * @param {Array<Record<string, unknown>>} results
 * @param {string} [query]
 * @param {import('./query-parser.js').ParsedSearchQuery|null} [parsed]
 * @returns {ReturnType<typeof buildSearchSummary>}
 */
export function buildResultSummary(results, query = '', parsed = null) {
  return buildSearchSummary(results, query, parsed);
}
