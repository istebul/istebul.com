/**
 * AI Listings Search — dataset-driven suggestions (Sprint-15).
 */

import { normalizeText } from './normalizer.js';

/**
 * @param {Array<Record<string, unknown>>} documents
 * @param {string} query
 * @param {{ limit?: number }} [options]
 * @returns {string[]}
 */
export function buildSearchSuggestions(documents, query, options = {}) {
  const limit = options.limit ?? 8;
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery || normalizedQuery.length < 2) return [];

  /** @type {Map<string, number>} */
  const suggestions = new Map();

  for (const doc of documents) {
    const brand = String(doc.brand ?? '').trim();
    const model = String(doc.model ?? '').trim();
    if (!brand) continue;

    const full = model ? `${brand} ${model}` : brand;
    const normalizedFull = normalizeText(full);
    const normalizedBrand = normalizeText(brand);

    if (normalizedBrand.startsWith(normalizedQuery) || normalizedFull.includes(normalizedQuery)) {
      const score = normalizedBrand.startsWith(normalizedQuery) ? 2 : 1;
      suggestions.set(full, (suggestions.get(full) ?? 0) + score);
    }
  }

  return [...suggestions.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr'))
    .slice(0, limit)
    .map(([label]) => label);
}

/**
 * @param {string[]} suggestions
 * @param {Array<Record<string, unknown>>} documents
 * @returns {boolean}
 */
export function suggestionsAreFromDataset(suggestions, documents) {
  const known = new Set();
  for (const doc of documents) {
    const brand = String(doc.brand ?? '').trim();
    const model = String(doc.model ?? '').trim();
    if (brand) known.add(model ? `${brand} ${model}` : brand);
  }
  return suggestions.every((item) => known.has(item));
}
