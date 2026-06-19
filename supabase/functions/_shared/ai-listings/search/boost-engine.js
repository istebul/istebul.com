/**
 * AI Listings Search — relevance boost engine (Sprint-16 v2).
 * Exact phrase, multi-token, recency, and quality boosts.
 */

import { normalizeText } from './normalizer.js';
import { getCachedNormalizedText } from './semantic-engine.js';

/** @type {Readonly<Record<string, number>>} */
export const BOOST_WEIGHTS = Object.freeze({
  exact_phrase: 8,
  multi_token: 6,
  recent_listing: 5,
  quality_score: 6
});

const RECENT_LISTING_DAYS = 90;

/**
 * @param {Record<string, unknown>} doc
 * @param {import('./query-parser.js').ParsedSearchQuery} parsed
 * @param {string} [rawQuery]
 * @returns {{ boosts: Record<string, number>, total: number }}
 */
export function computeBoosts(doc, parsed, rawQuery = '') {
  /** @type {Record<string, number>} */
  const boosts = {
    exact_phrase: 0,
    multi_token: 0,
    recent_listing: 0,
    quality_score: 0
  };

  const haystack = getCachedNormalizedText(doc);
  const queryNorm = normalizeText(rawQuery || parsed.raw || parsed.normalized);

  if (queryNorm && queryNorm.length >= 3 && haystack.includes(queryNorm)) {
    boosts.exact_phrase = BOOST_WEIGHTS.exact_phrase;
  }

  const tokens = parsed.tokens.filter((token) => token.length >= 2);
  if (tokens.length >= 2) {
    const matchedTokens = tokens.filter((token) => haystack.includes(normalizeText(token))).length;
    const ratio = matchedTokens / tokens.length;
    if (ratio >= 0.5) {
      boosts.multi_token = Math.round(ratio * BOOST_WEIGHTS.multi_token);
    }
  }

  const updatedAt = String(doc.updated_at ?? doc.created_at ?? '');
  if (updatedAt) {
    const ageMs = Date.now() - new Date(updatedAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (Number.isFinite(ageDays) && ageDays <= RECENT_LISTING_DAYS) {
      const recencyFactor = 1 - ageDays / RECENT_LISTING_DAYS;
      boosts.recent_listing = Math.round(recencyFactor * BOOST_WEIGHTS.recent_listing);
    }
  }

  const quality = Number(doc.quality_score);
  const ai = Number(doc.decision_score);
  if (Number.isFinite(quality) || Number.isFinite(ai)) {
    const avg = [quality, ai].filter(Number.isFinite).reduce((sum, v) => sum + v, 0) / 2;
    boosts.quality_score = Math.round((avg / 100) * BOOST_WEIGHTS.quality_score);
  }

  const total = Object.values(boosts).reduce((sum, value) => sum + value, 0);
  return { boosts, total };
}
