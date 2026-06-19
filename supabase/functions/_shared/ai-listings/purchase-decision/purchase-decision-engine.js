/**
 * Purchase Decision Intelligence v1 — deterministic orchestrator (Sprint-24).
 */

import { safeNumber } from '../engine/score-utils.js';
import {
  extractPurchaseSignals,
  computeDecisionScore,
  computeConfidenceScore,
  buildDecisionStrength,
  buildConfidenceMeta
} from './decision-strength-engine.js';
import { buildPositiveFactors, buildRiskFactors } from './action-recommendation-engine.js';
import { buildMissingInfoImpact } from './missing-info-impact-engine.js';
import { buildNegotiationScenarios } from './negotiation-scenario-engine.js';
import { buildWaitScenario } from './wait-scenario-engine.js';
import { buildPurchaseDecisionSummary, buildCategoryNextSteps } from './decision-summary.js';

/** @type {Map<string, unknown>} */
const memoCache = new Map();

/**
 * Clear memoization cache (testing).
 */
export function clearPurchaseDecisionMemoCache() {
  memoCache.clear();
}

/**
 * @param {Record<string, unknown>} recommendation
 * @param {Record<string, unknown>} userIntent
 * @returns {string}
 */
export function buildPurchaseDecisionCacheKey(recommendation, userIntent) {
  const id = String(recommendation?.id ?? '');
  return `pd:${id}:${JSON.stringify(userIntent ?? {})}`;
}

/**
 * @param {Record<string, unknown>} recommendation
 * @param {Record<string, unknown>} [userIntent]
 * @returns {Record<string, unknown>}
 */
export function buildPurchaseDecisionInput(recommendation, userIntent = {}) {
  const listing = /** @type {Record<string, unknown>} */ (recommendation?.listing ?? recommendation ?? {});
  const category = String(recommendation?.category ?? listing.category ?? userIntent.category ?? 'vehicle');

  return {
    recommendation,
    user_intent: userIntent,
    category,
    fit_score: safeNumber(recommendation?.fit_score ?? recommendation?.score),
    negotiation_intelligence: recommendation?.negotiation_intelligence ?? userIntent.negotiation_intelligence ?? null,
    listing_quality: recommendation?.listing_quality ?? userIntent.listing_quality ?? null,
    ownership_cost: recommendation?.ownership_cost ?? userIntent.ownership_cost ?? null
  };
}

/**
 * @param {Record<string, unknown>} input
 * @param {{ skipCache?: boolean }} [options]
 * @returns {Record<string, unknown>|null}
 */
export function runPurchaseDecisionEngine(input, options = {}) {
  const recommendation = /** @type {Record<string, unknown>} */ (input?.recommendation ?? {});
  const id = String(recommendation?.id ?? '');

  if (!id && !safeNumber(recommendation?.fit_score ?? recommendation?.score)) {
    return null;
  }

  const cacheKey = buildPurchaseDecisionCacheKey(recommendation, input.user_intent ?? {});

  if (!options.skipCache) {
    const cached = memoCache.get(cacheKey);
    if (cached) return /** @type {Record<string, unknown>} */ (cached);
  }

  const signals = extractPurchaseSignals(input);
  const decisionScore = computeDecisionScore(signals);
  const confidenceScore = computeConfidenceScore(signals);
  const strength = buildDecisionStrength(decisionScore, signals.riskScore);
  const confidence = buildConfidenceMeta(confidenceScore);

  const positiveFactors = buildPositiveFactors(signals, strength);
  const riskFactors = buildRiskFactors(signals, strength);
  const missingInfoImpact = buildMissingInfoImpact(signals.missingCritical);

  const listing = /** @type {Record<string, unknown>} */ (recommendation.listing ?? recommendation ?? {});
  const basePrice = safeNumber(recommendation.price ?? listing.price);
  const negotiationScenario = buildNegotiationScenarios(signals, decisionScore, basePrice);
  const waitScenario = buildWaitScenario(signals, strength, input.category);

  const summary = buildPurchaseDecisionSummary({
    decisionLabel: strength.decisionLabel,
    confidenceLabel: confidence.confidenceLabel,
    riskLabel: strength.riskLabel,
    primaryActionLabel: strength.primaryActionLabel,
    hasMissingInfo: safeNumber(signals.missingCritical?.length ?? 0) > 0,
    hasPriceUncertainty: Boolean(signals.priceUncertainty)
  });

  const nextSteps = buildCategoryNextSteps(input.category, strength.primaryAction);

  const purchaseDecision = {
    decisionScore: strength.decisionScore,
    decisionLevel: strength.decisionLevel,
    decisionLabel: strength.decisionLabel,
    confidenceScore: confidence.confidenceScore,
    confidenceLevel: confidence.confidenceLevel,
    confidenceLabel: confidence.confidenceLabel,
    riskLevel: strength.riskLevel,
    riskLabel: strength.riskLabel,
    primaryAction: strength.primaryAction,
    primaryActionLabel: strength.primaryActionLabel,
    positiveFactors,
    riskFactors,
    missingInfoImpact,
    negotiationScenario,
    waitScenario,
    summary,
    nextSteps
  };

  memoCache.set(cacheKey, purchaseDecision);
  if (memoCache.size > 8) {
    const oldest = memoCache.keys().next().value;
    if (oldest) memoCache.delete(oldest);
  }

  return purchaseDecision;
}
