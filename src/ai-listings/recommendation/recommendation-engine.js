/**
 * isteBul AI Listings Engine v1 — recommendation engine (placeholder).
 */

import { clampScore } from '../utils/guards.js';

/** @typedef {import('../models/listing.js').Listing} Listing */
/** @typedef {import('../models/ai-analysis.js').AIAnalysis} AIAnalysis */
/** @typedef {import('../services/recommendation-service.js').ListingRecommendation} ListingRecommendation */

/**
 * @param {{ listing: Listing, analysis: AIAnalysis|null, market_score: number, price_score: number }} input
 * @returns {ListingRecommendation}
 */
export function generateRecommendations(input) {
  const { listing, analysis, market_score, price_score } = input;

  const ai_score = analysis?.ai_score ?? 0;
  const rank_score = clampScore(ai_score * 0.5 + market_score * 0.25 + price_score * 0.25);

  const reasons = [];
  if (ai_score >= 70) reasons.push('High overall quality score');
  if (price_score >= 70) reasons.push('Competitive pricing');
  if (market_score >= 50) reasons.push('Favorable market context');
  if (!reasons.length) reasons.push('Placeholder ranking — enable engine for live recommendations');

  // TODO: Add collaborative filtering when user listing history is connected
  // TODO: Add partner inventory prioritization rules

  return {
    listing,
    analysis,
    rank_score,
    reasons
  };
}
