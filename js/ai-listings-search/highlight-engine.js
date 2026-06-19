/**
 * AI Listings Search — safe highlight engine (Sprint-15).
 */

import { escapeHtml } from '../core/dom-safe.js';
import { normalizeText } from './normalizer.js';

/**
 * @param {unknown} value
 * @returns {string}
 */
export function escapeSearchHtml(value) {
  return escapeHtml(String(value ?? ''));
}

/**
 * @param {unknown} text
 * @param {string|string[]} terms
 * @returns {string}
 */
export function highlightSearchTerms(text, terms) {
  const raw = String(text ?? '');
  if (!raw) return '';

  const escaped = escapeSearchHtml(raw);
  const termList = (Array.isArray(terms) ? terms : [terms])
    .map((term) => String(term ?? '').trim())
    .filter((term) => term.length >= 2);

  if (!termList.length) return escaped;

  let result = escaped;
  for (const term of termList) {
    const pattern = new RegExp(`(${escapeRegExp(term)})`, 'gi');
    result = result.replace(pattern, '<mark>$1</mark>');
  }

  return result;
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {Record<string, unknown>} record
 * @param {import('./query-parser.js').ReturnType<typeof import('./query-parser.js').parseSearchQuery>} parsed
 * @returns {Record<string, string>}
 */
export function buildHighlightedFields(record, parsed) {
  const terms = [
    parsed.brand,
    parsed.model,
    ...(parsed.text_terms ?? []),
    ...(parsed.attributes ?? [])
  ].filter(Boolean);

  return {
    title: highlightSearchTerms(record.title, terms),
    description: highlightSearchTerms(record.description, terms),
    brand: highlightSearchTerms(record.brand, terms),
    model: highlightSearchTerms(record.model, terms)
  };
}
