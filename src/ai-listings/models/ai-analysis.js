/**
 * isteBul AI Listings Engine v1 — AIAnalysis domain model.
 */

import { CONFIDENCE_MAX, CONFIDENCE_MIN, SCORE_MAX, SCORE_MIN } from '../core/constants.js';

/**
 * AI-generated analysis output attached to a listing.
 * @typedef {Object} AIAnalysis
 * @property {number} ai_score Overall AI quality score (0–100)
 * @property {number} risk_score Risk exposure score (0–100, higher = more risk)
 * @property {number} market_score Market fit score (0–100)
 * @property {number} price_score Price competitiveness score (0–100)
 * @property {number} confidence Model confidence (0–1)
 * @property {string} summary Executive summary
 * @property {string[]} pros Identified strengths
 * @property {string[]} cons Identified weaknesses
 * @property {string[]} tags Classification / facet tags
 */

/**
 * @typedef {Partial<AIAnalysis>} AIAnalysisInput
 */

/**
 * Create an empty analysis scaffold.
 * @param {AIAnalysisInput} [overrides]
 * @returns {AIAnalysis}
 */
export function createEmptyAIAnalysis(overrides = {}) {
  return {
    ai_score: overrides.ai_score ?? 0,
    risk_score: overrides.risk_score ?? 0,
    market_score: overrides.market_score ?? 0,
    price_score: overrides.price_score ?? 0,
    confidence: overrides.confidence ?? 0,
    summary: overrides.summary ?? '',
    pros: overrides.pros ?? [],
    cons: overrides.cons ?? [],
    tags: overrides.tags ?? []
  };
}

/**
 * Clamp numeric fields to valid ranges.
 * @param {AIAnalysis} analysis
 * @returns {AIAnalysis}
 */
export function normalizeAIAnalysis(analysis) {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
  return {
    ...analysis,
    ai_score: clamp(analysis.ai_score, SCORE_MIN, SCORE_MAX),
    risk_score: clamp(analysis.risk_score, SCORE_MIN, SCORE_MAX),
    market_score: clamp(analysis.market_score, SCORE_MIN, SCORE_MAX),
    price_score: clamp(analysis.price_score, SCORE_MIN, SCORE_MAX),
    confidence: clamp(analysis.confidence, CONFIDENCE_MIN, CONFIDENCE_MAX),
    summary: String(analysis.summary ?? '').trim(),
    pros: Array.isArray(analysis.pros) ? analysis.pros.map(String) : [],
    cons: Array.isArray(analysis.cons) ? analysis.cons.map(String) : [],
    tags: Array.isArray(analysis.tags) ? analysis.tags.map(String) : []
  };
}

/**
 * Validate analysis shape.
 * @param {unknown} value
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateAIAnalysis(value) {
  const errors = [];
  if (!value || typeof value !== 'object') {
    return { valid: false, errors: ['AIAnalysis must be an object'] };
  }

  const analysis = /** @type {AIAnalysis} */ (value);
  const fields = ['ai_score', 'risk_score', 'market_score', 'price_score', 'confidence'];

  for (const field of fields) {
    if (!Number.isFinite(analysis[field])) errors.push(`${field} must be a number`);
  }
  if (typeof analysis.summary !== 'string') errors.push('summary must be a string');
  if (!Array.isArray(analysis.pros)) errors.push('pros must be an array');
  if (!Array.isArray(analysis.cons)) errors.push('cons must be an array');
  if (!Array.isArray(analysis.tags)) errors.push('tags must be an array');

  return { valid: errors.length === 0, errors };
}
