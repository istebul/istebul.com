/**
 * isteBul AI Listings Engine v1 — deterministic scoring engine.
 *
 * Canonical scores are produced here. AI models must NOT override these values.
 */

import { clampScore } from '../utils/guards.js';
import { computeHousingScores } from './housing-scoring.js';
import { SCORING_ENGINE_VERSION } from './scoring-rules.js';
import { computeVehicleScores } from './vehicle-scoring.js';

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
 * @property {Record<string, number>} [factor_scores]
 * @property {string} [scoring_version]
 */

/**
 * Fallback scoring for general / vacation categories.
 * @param {Listing} listing
 * @returns {ScoringResult}
 */
function computeGeneralScores(listing) {
  const hasTitle = listing.title.trim().length > 0;
  const hasDescription = listing.description.trim().length > 10;
  const hasPrice = listing.price > 0;
  const hasLocation = listing.location.trim().length > 0;

  const completeness =
    (hasTitle ? 25 : 0) + (hasDescription ? 25 : 0) + (hasPrice ? 25 : 0) + (hasLocation ? 25 : 0);

  const market_score = 0;
  const price_score = hasPrice ? 40 : 0;
  const ai_score = clampScore(completeness * 0.4 + market_score * 0.3 + price_score * 0.3);
  const risk_score = clampScore(100 - ai_score);
  const rawConfidence =
    (hasTitle && hasPrice ? 0.6 : 0.3) + (market_score > 0 ? 0.2 : 0) + (price_score > 0 ? 0.2 : 0);

  return {
    ai_score,
    risk_score,
    market_score,
    price_score,
    confidence: Math.min(1, Math.max(0, rawConfidence)),
    scoring_version: SCORING_ENGINE_VERSION
  };
}

/**
 * Compute deterministic category-specific scores.
 *
 * @param {ScoringInput} input
 * @returns {ScoringResult}
 */
export function computeScores(input) {
  const { listing } = input;

  if (listing.category === 'vehicle') {
    const vehicle = computeVehicleScores(listing);
    return {
      ai_score: vehicle.ai_score,
      risk_score: vehicle.risk_score,
      market_score: vehicle.market_score,
      price_score: vehicle.price_score,
      confidence: vehicle.confidence,
      factor_scores: {
        price_score: vehicle.price_score,
        mileage_score: vehicle.mileage_score,
        age_score: vehicle.age_score,
        fuel_score: vehicle.fuel_score,
        risk_score: vehicle.risk_score
      },
      scoring_version: SCORING_ENGINE_VERSION
    };
  }

  if (listing.category === 'housing') {
    const housing = computeHousingScores(listing);
    return {
      ai_score: housing.ai_score,
      risk_score: housing.risk_score,
      market_score: housing.market_score,
      price_score: housing.price_score,
      confidence: housing.confidence,
      factor_scores: {
        price_score: housing.price_score,
        location_score: housing.location_score,
        size_score: housing.size_score,
        building_age_score: housing.building_age_score,
        risk_score: housing.risk_score
      },
      scoring_version: SCORING_ENGINE_VERSION
    };
  }

  return computeGeneralScores(listing);
}

export { SCORING_ENGINE_VERSION };
