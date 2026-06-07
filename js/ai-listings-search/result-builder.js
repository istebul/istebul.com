/**
 * AI Listings Search — search result builder (Sprint-15).
 */

import { buildSearchSummary } from '../../supabase/functions/_shared/ai-listings/search/summary.js';
import { buildHighlightedFields } from './highlight-engine.js';

/**
 * @param {Array<Record<string, unknown>>} results
 * @param {import('./query-parser.js').ReturnType<typeof import('./query-parser.js').parseSearchQuery>} parsed
 * @param {string} [query]
 * @returns {Array<Record<string, unknown>>}
 */
export function buildSearchResults(results, parsed, query = '') {
  return results.map((record) => {
    const highlighted = buildHighlightedFields(record, parsed);
    return {
      ...record,
      highlighted,
      display_title: highlighted.title || String(record.title ?? '—'),
      similarity_label: `%${Number(record.similarity_percent ?? record.search_score ?? 0)}`
    };
  });
}

/**
 * @param {Array<Record<string, unknown>>} results
 * @param {string} [query]
 * @returns {ReturnType<typeof buildSearchSummary>}
 */
export function buildResultSummary(results, query = '') {
  return buildSearchSummary(results, query);
}
