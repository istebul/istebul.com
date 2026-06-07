/**
 * isteBul AI Listings Engine — Sprint-1 Enterprise
 *
 * Modular client-side pipeline:
 * parse → quality → market → risk → decision
 *
 * Does not replace Edge analyze endpoints; enriches admin UI and future ingest adapters.
 */

import { parseListingInput } from './parsers/index.js';
import { mergeCanonicalListing } from './models/canonical-listing.js';
import { runQualityEngine } from './quality/quality-engine.js';
import { runMarketEngine } from './market/market-engine.js';
import { runRiskEngine, getRiskLevel } from './risk/risk-engine.js';
import { runDecisionEngine, getRecommendationLabel } from './decision/decision-engine.js';
import { ENGINE_VERSION } from './scoring/score-utils.js';
import {
  parsePersistedAnalysisFields,
  parseTagNumber
} from '../../supabase/functions/_shared/ai-listings/engine/canonical-engine.js';

export { ENGINE_VERSION };
export { createCanonicalListing, mergeCanonicalListing } from './models/canonical-listing.js';
export { parseListingInput, PARTNER_SOURCE_TYPES } from './parsers/index.js';
export { runQualityEngine } from './quality/quality-engine.js';
export { runMarketEngine } from './market/market-engine.js';
export { runRiskEngine, getRiskLevel } from './risk/risk-engine.js';
export { runDecisionEngine, getRecommendationLabel } from './decision/decision-engine.js';
export { parsePersistedAnalysisFields, parseTagNumber } from '../../supabase/functions/_shared/ai-listings/engine/canonical-engine.js';

/**
 * @typedef {Object} EngineRunOptions
 * @property {string} [sourceType]
 * @property {Record<string, unknown>|null} [existingAnalysis]
 */

/**
 * @typedef {Object} EngineRunResult
 * @property {import('./models/canonical-listing.js').CanonicalListing} listing
 * @property {ReturnType<typeof runQualityEngine>} quality
 * @property {ReturnType<typeof runMarketEngine>} market
 * @property {ReturnType<typeof runRiskEngine>} risk
 * @property {ReturnType<typeof runDecisionEngine>} decision
 * @property {string} engine_version
 */

/**
 * Run full AI listings engine pipeline on raw listing input.
 * @param {unknown} rawInput
 * @param {EngineRunOptions} [options]
 * @returns {EngineRunResult}
 */
export function runAiListingsEngine(rawInput, options = {}) {
  const existingAnalysis = options.existingAnalysis ?? null;
  const listing = parseListingInput(rawInput, options.sourceType);

  const quality = runQualityEngine(listing);
  const market = runMarketEngine(listing, existingAnalysis);
  const risk = runRiskEngine(listing, quality, existingAnalysis);
  const decision = runDecisionEngine(listing, quality, market, risk, existingAnalysis);

  const aiScore = Number(existingAnalysis?.ai_score);
  const confidence = Number(existingAnalysis?.confidence);

  const enriched = mergeCanonicalListing(listing, {
    quality_score: quality.quality_score,
    market_score: market.market_score,
    risk_score: risk.risk_score,
    price_score: market.price_score,
    confidence_score: Number.isFinite(confidence) ? Math.round(confidence * 100) : null,
    decision_score: decision.decision_score,
    decision_summary: decision.decision_summary,
    strengths: decision.strengths,
    risks: decision.risks,
    tags: buildEngineTags(quality, market, risk, decision, existingAnalysis, aiScore)
  });

  return {
    listing: enriched,
    quality,
    market,
    risk,
    decision,
    engine_version: ENGINE_VERSION
  };
}

/**
 * @param {unknown} rawInput
 * @param {EngineRunOptions} [options]
 * @returns {import('./models/canonical-listing.js').CanonicalListing}
 */
export function processListing(rawInput, options = {}) {
  return runAiListingsEngine(rawInput, options).listing;
}

/**
 * Card-friendly metric snapshot for admin UI.
 * @param {unknown} rawInput
 * @param {EngineRunOptions} [options]
 */
export function getListingEngineMetrics(rawInput, options = {}) {
  const analysis = options.existingAnalysis ?? null;
  const parsed = parsePersistedAnalysisFields(analysis);
  const hasPersistedScores =
    parsed.hasDbAnalysis &&
    (Number.isFinite(Number(analysis?.ai_score)) ||
      Number.isFinite(Number(analysis?.risk_score)) ||
      parsed.isEngineV1);

  if (hasPersistedScores) {
    const clientFallback =
      parsed.quality_score === null || !parsed.recommendation_label
        ? runAiListingsEngine(rawInput, options)
        : null;

    return {
      ai:
        parsed.decision_score ??
        (Number.isFinite(Number(analysis?.ai_score)) ? Number(analysis.ai_score) : null),
      risk: Number.isFinite(Number(analysis?.risk_score)) ? Number(analysis.risk_score) : null,
      market: Number.isFinite(Number(analysis?.market_score)) ? Number(analysis.market_score) : null,
      quality: parsed.quality_score ?? clientFallback?.quality.quality_score ?? null,
      decision:
        parsed.recommendation_label ?? clientFallback?.decision.recommendation_label ?? 'Analiz Bekleniyor',
      decision_type: analysis?.recommendation ?? clientFallback?.decision.recommendation ?? 'pending',
      from_db: true
    };
  }

  const result = runAiListingsEngine(rawInput, options);
  const aiScore = Number(analysis?.ai_score);

  return {
    ai: Number.isFinite(aiScore) ? aiScore : result.decision.decision_score,
    risk: result.risk.risk_score,
    market: result.market.market_score,
    quality: result.quality.quality_score,
    decision: result.decision.recommendation_label,
    decision_type: result.decision.recommendation,
    from_db: false
  };
}

/**
 * @param {ReturnType<typeof runQualityEngine>} quality
 * @param {ReturnType<typeof runMarketEngine>} market
 * @param {ReturnType<typeof runRiskEngine>} risk
 * @param {ReturnType<typeof runDecisionEngine>} decision
 * @param {Record<string, unknown>|null} existingAnalysis
 * @param {number} aiScore
 * @returns {string[]}
 */
function buildEngineTags(quality, market, risk, decision, existingAnalysis, aiScore) {
  const tags = [];
  if (quality.quality_score >= 80) tags.push('high-quality');
  if (risk.risk_score <= 30) tags.push('low-risk');
  if (risk.risk_score > 60) tags.push('high-risk');
  if (market.deviation_pct !== undefined && market.deviation_pct < -5) tags.push('price-advantage');
  if (decision.recommendation === 'review') tags.push('review-needed');
  if (Array.isArray(existingAnalysis?.tags)) {
    for (const tag of existingAnalysis.tags) tags.push(String(tag));
  }
  if (Number.isFinite(aiScore) && aiScore >= 80) tags.push('strong-ai-score');
  return [...new Set(tags)].slice(0, 8);
}
