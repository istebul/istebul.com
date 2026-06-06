/**
 * isteBul AI Listings Engine v1 — deterministic scoring engine.
 *
 * Canonical scores are produced here. AI models must NOT override these values.
 */

import { clampScore } from '../utils/guards.js';

/** @typedef {import('../models/listing.js').Listing} Listing */

/**
 * @typedef {Object} ScoringInput
 * @property {Listing} listing
 * @property {number} [market_score]
 * @property {number} [price_score]
 */

/**
 * @typedef {Object} ScoringResult
 * @property {number} ai_score
 * @property {number} risk_score
 * @property {number} market_score
 * @property {number} price_score
 * @property {number} confidence
 */

/**
 * Compute placeholder deterministic scores.
 * TODO: Replace with category-specific rules (vehicle, housing, vacation).
 * TODO: Align with js/verticals/listing-analysis/listing-analysis-engine.js scoring philosophy.
 *
 * @param {ScoringInput} input
 * @returns {ScoringResult}
 */
export function computeScores(input) {
  const { listing, market_score = 0, price_score = 0 } = input;

  const hasTitle = listing.title.trim().length > 0;
  const hasDescription = listing.description.trim().length > 10;
  const hasPrice = listing.price > 0;
  const hasLocation = listing.location.trim().length > 0;

  const completeness =
    (hasTitle ? 25 : 0) +
    (hasDescription ? 25 : 0) +
    (hasPrice ? 25 : 0) +
    (hasLocation ? 25 : 0);

  const ai_score = clampScore((completeness * 0.4) + (market_score * 0.3) + (price_score * 0.3));
  const risk_score = clampScore(100 - ai_score);
  const rawConfidence =
    (hasTitle && hasPrice ? 0.6 : 0.3) + (market_score > 0 ? 0.2 : 0) + (price_score > 0 ? 0.2 : 0);
  const confidence = Math.min(1, Math.max(0, rawConfidence));

  return {
    ai_score,
    risk_score,
    market_score: clampScore(market_score),
    price_score: clampScore(price_score),
    confidence: Math.min(1, confidence)
  };
}
