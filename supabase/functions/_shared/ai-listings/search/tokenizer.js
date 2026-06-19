/**
 * AI Listings Search — tokenizer with Turkish normalization (Sprint-16 v2).
 * Cached tokenizer for performance at 10k+ records.
 */

import { normalizeText, normalizeToken } from './normalizer.js';

/** @type {Map<string, string[]>} */
const tokenCache = new Map();

/**
 * Clear tokenizer cache (testing).
 */
export function clearTokenCache() {
  tokenCache.clear();
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
export function tokenize(value) {
  const normalized = normalizeText(value);
  if (!normalized) return [];

  const cached = tokenCache.get(normalized);
  if (cached) return cached;

  const tokens = normalized.split(' ').map((token) => normalizeToken(token)).filter(Boolean);
  tokenCache.set(normalized, tokens);

  if (tokenCache.size > 1000) {
    const oldest = tokenCache.keys().next().value;
    if (oldest) tokenCache.delete(oldest);
  }

  return tokens;
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
      doc.fuel,
      doc.transmission,
      doc.body_type,
      doc.segment,
      doc.executive_label,
      doc.source,
      doc.category,
      doc.searchableText,
      doc.normalizedText,
      Array.isArray(doc.tags) ? doc.tags.join(' ') : doc.tags,
      doc.features
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

/**
 * @param {Map<string, Set<string>>} tokenIndex
 * @param {string[]} queryTokens
 * @returns {Set<string>|null}
 */
export function findCandidateIds(tokenIndex, queryTokens) {
  const tokens = queryTokens.filter((token) => token.length >= 2);
  if (!tokens.length) return null;

  /** @type {Set<string>|null} */
  let candidates = null;

  for (const token of tokens) {
    const bucket = tokenIndex.get(token);
    if (!bucket || !bucket.size) continue;

    if (!candidates) {
      candidates = new Set(bucket);
    } else {
      for (const id of candidates) {
        if (!bucket.has(id)) candidates.delete(id);
      }
    }

    if (candidates.size === 0) break;
  }

  if (candidates && candidates.size > 0) return candidates;

  /** @type {Set<string>} */
  const union = new Set();
  for (const token of tokens) {
    const bucket = tokenIndex.get(token);
    if (bucket) {
      for (const id of bucket) union.add(id);
    }
  }

  return union.size > 0 ? union : null;
}
