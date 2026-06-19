/**
 * AI Listings Search — typo tolerance engine (Sprint-16 v2, client).
 */

import { normalizeText } from './normalizer.js';

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function levenshteinDistance(a, b) {
  const left = String(a ?? '');
  const right = String(b ?? '');
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  /** @type {number[]} */
  const prev = Array.from({ length: right.length + 1 }, (_, i) => i);
  /** @type {number[]} */
  const curr = new Array(right.length + 1);

  for (let i = 1; i <= left.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= right.length; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= right.length; j++) prev[j] = curr[j];
  }

  return prev[right.length];
}

/**
 * @param {string} token
 * @param {Iterable<string>} vocabulary
 * @param {number} [maxDistance]
 * @returns {string|null}
 */
export function findClosestToken(token, vocabulary, maxDistance = 2) {
  const needle = normalizeText(token);
  if (!needle || needle.length < 3) return null;

  let best = null;
  let bestDistance = maxDistance + 1;

  for (const candidate of vocabulary) {
    const normalized = normalizeText(candidate);
    if (!normalized) continue;
    if (normalized === needle) return candidate;

    const distance = levenshteinDistance(needle, normalized);
    const threshold = needle.length <= 4 ? 1 : maxDistance;
    if (distance <= threshold && distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }

  return best;
}

/**
 * @param {string[]} tokens
 * @param {Iterable<string>} vocabulary
 * @param {number} [maxDistance]
 * @returns {{ tokens: string[], corrections: Array<{ from: string, to: string }> }}
 */
export function correctQueryTypos(tokens, vocabulary, maxDistance = 2) {
  /** @type {string[]} */
  const corrected = [];
  /** @type {Array<{ from: string, to: string }>} */
  const corrections = [];

  for (const token of tokens) {
    const match = findClosestToken(token, vocabulary, maxDistance);
    if (match && normalizeText(match) !== normalizeText(token)) {
      corrected.push(match);
      corrections.push({ from: token, to: match });
    } else {
      corrected.push(token);
    }
  }

  return { tokens: corrected, corrections };
}

/**
 * @param {string} query
 * @param {Iterable<string>} vocabulary
 * @returns {{ query: string, corrections: Array<{ from: string, to: string }> }}
 */
export function correctQueryString(query, vocabulary) {
  const raw = String(query ?? '').trim();
  if (!raw) return { query: '', corrections: [] };

  const tokens = raw.split(/\s+/).filter(Boolean);
  const { tokens: corrected, corrections } = correctQueryTypos(tokens, vocabulary);
  return { query: corrected.join(' '), corrections };
}
