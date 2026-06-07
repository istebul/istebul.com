/**
 * AI Listings Search — tokenizer with Turkish normalization (Sprint-15).
 */

import { normalizeText, normalizeToken } from './normalizer.js';
import { buildSearchableText } from './search-fields.js';

/**
 * @param {unknown} value
 * @returns {string[]}
 */
export function tokenize(value) {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  return normalized.split(' ').map((token) => normalizeToken(token)).filter(Boolean);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function joinTokens(value) {
  return tokenize(value).join(' ');
}

/**
 * @param {Array<Record<string, unknown>>} documents
 * @returns {Map<string, Set<string>>}
 */
export function buildTokenIndex(documents) {
  /** @type {Map<string, Set<string>>} */
  const index = new Map();

  for (const doc of documents) {
    const id = String(doc.id ?? '');
    if (!id) continue;

    const fields = [
      doc.title,
      doc.description,
      doc.brand,
      doc.model,
      doc.year,
      doc.tags,
      doc.attributes,
      doc.features,
      doc.normalizedText,
      doc.searchableText ?? buildSearchableText(doc),
      doc.fuel,
      doc.transmission,
      doc.body_type,
      doc.segment,
      doc.executive_label,
      doc.source,
      doc.category
    ];

    const tokens = new Set();
    for (const field of fields) {
      for (const token of tokenize(field)) {
        tokens.add(token);
      }
    }

    for (const token of tokens) {
      const bucket = index.get(token) ?? new Set();
      bucket.add(id);
      index.set(token, bucket);
    }
  }

  return index;
}
