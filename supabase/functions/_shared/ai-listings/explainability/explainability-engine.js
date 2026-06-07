/**
 * Decision Explainability v1 — deterministic orchestrator (Sprint-25).
 */

import { safeNumber } from '../engine/score-utils.js';
import { extractPurchaseSignals } from '../purchase-decision/decision-strength-engine.js';
import { buildPurchaseDecisionInput, runPurchaseDecisionEngine } from '../purchase-decision/purchase-decision-engine.js';
import { buildScoreContributions } from './score-contribution-engine.js';
import { buildTopPositiveDrivers, buildTopNegativeDrivers } from './factor-impact-engine.js';
import { buildDecisionPath } from './decision-path-engine.js';
import { buildConfidenceExplanation } from './confidence-explanation-engine.js';
import {
  EXPLANATION_LEVEL_LABELS,
  resolveExplanationLevel,
  buildReasoningSummary,
  buildUserFriendlyExplanation,
  buildVerificationSteps
} from './explainability-summary.js';

/** @type {Map<string, unknown>} */
const memoCache = new Map();

/**
 * Clear memoization cache (testing).
 */
export function clearExplainabilityMemoCache() {
  memoCache.clear();
}

/**
 * @param {Record<string, unknown>} recommendation
 * @param {Record<string, unknown>} userIntent
 * @returns {string}
 */
export function buildExplainabilityCacheKey(recommendation, userIntent) {
  const id = String(recommendation?.id ?? '');
  return `exp:${id}:${JSON.stringify(userIntent ?? {})}`;
}

/**
 * @param {Record<string, unknown>} recommendation
 * @param {Record<string, unknown>} [userIntent]
 * @returns {Record<string, unknown>}
 */
export function buildExplainabilityInput(recommendation, userIntent = {}) {
  const listing = /** @type {Record<string, unknown>} */ (recommendation?.listing ?? recommendation ?? {});
  const category = String(recommendation?.category ?? listing.category ?? userIntent.category ?? 'vehicle');

  return {
    recommendation,
    user_intent: userIntent,
    category,
    fit_score: safeNumber(recommendation?.fit_score ?? recommendation?.score),
    negotiation_intelligence: recommendation?.negotiation_intelligence ?? userIntent.negotiation_intelligence ?? null,
    listing_quality: recommendation?.listing_quality ?? userIntent.listing_quality ?? null,
    ownership_cost: recommendation?.ownership_cost ?? userIntent.ownership_cost ?? null,
    purchase_decision: recommendation?.purchase_decision ?? userIntent.purchase_decision ?? null
  };
}

/**
 * @param {Record<string, unknown>} signals
 * @param {Record<string, unknown>} confidenceExplanation
 * @returns {number}
 */
export function computeExplanationScore(signals, confidenceExplanation) {
  const dataCoverage =
    (signals.hasPriceEvidence ? 15 : 0) +
    (signals.hasImageEvidence ? 12 : 0) +
    (signals.hasOwnershipCostData ? 10 : 0) +
    (signals.hasNegotiationData ? 10 : 0) +
    Math.max(0, 25 - Number(signals.missingCritical?.length ?? 0) * 6);

  const signalClarity =
    (Number(signals.qualityScore) >= 60 ? 12 : 5) +
    (Number(signals.trustScore) >= 60 ? 12 : 5) +
    (Number(signals.recommendationScore) >= 60 ? 12 : 5);

  const confidenceBoost = Number(confidenceExplanation.confidenceScore) * 0.25;
  const gapPenalty = Number(signals.missingCritical?.length ?? 0) * 5;

  const score = dataCoverage + signalClarity + confidenceBoost - gapPenalty;
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * @param {Record<string, unknown>} signals
 * @returns {string[]}
 */
export function buildDataGaps(signals) {
  /** @type {string[]} */
  const gaps = [];

  const missing = Array.isArray(signals.missingCritical) ? signals.missingCritical : [];
  for (const field of missing) {
    gaps.push(`Eksik: ${field}`);
  }
  if (!signals.hasPriceEvidence) gaps.push('Fiyat doğrulama verisi eksik');
  if (!signals.hasImageEvidence) gaps.push('Görsel kanıt eksik');
  if (!signals.hasOwnershipCostData) gaps.push('Toplam maliyet verisi eksik');
  if (!signals.hasNegotiationData) gaps.push('Pazarlık verisi eksik');
  if (Number(signals.duplicateRisk) >= 40) gaps.push('Mükerrer ilan kontrolü önerilir');
  if (Number(signals.staleRisk) >= 45) gaps.push('İlan güncelliği doğrulanmalı');

  return gaps.slice(0, 8);
}

/**
 * @param {Record<string, unknown>} input
 * @param {{ skipCache?: boolean }} [options]
 * @returns {Record<string, unknown>|null}
 */
export function runExplainabilityEngine(input, options = {}) {
  const recommendation = /** @type {Record<string, unknown>} */ (input?.recommendation ?? {});
  const id = String(recommendation?.id ?? '');

  if (!id && !safeNumber(recommendation?.fit_score ?? recommendation?.score)) {
    return null;
  }

  const cacheKey = buildExplainabilityCacheKey(recommendation, input.user_intent ?? {});

  if (!options.skipCache) {
    const cached = memoCache.get(cacheKey);
    if (cached) return /** @type {Record<string, unknown>} */ (cached);
  }

  const signals = extractPurchaseSignals(input);

  let purchaseDecision = /** @type {Record<string, unknown>|null} */ (input.purchase_decision ?? null);
  if (!purchaseDecision) {
    const pdInput = buildPurchaseDecisionInput(recommendation, input.user_intent ?? {});
    purchaseDecision = runPurchaseDecisionEngine(pdInput, { skipCache: true });
  }

  const confidenceExplanation = buildConfidenceExplanation(signals);
  const explanationScore = computeExplanationScore(signals, confidenceExplanation);
  const explanationLevel = resolveExplanationLevel(explanationScore);

  const topPositiveDrivers = buildTopPositiveDrivers(signals);
  const topNegativeDrivers = buildTopNegativeDrivers(signals);
  const scoreContributions = buildScoreContributions(signals);
  const decisionPath = buildDecisionPath(signals, purchaseDecision);
  const dataGaps = buildDataGaps(signals);

  const reasoningSummary = buildReasoningSummary({
    hasQuality: Number(signals.qualityScore) >= 50,
    hasTrust: Number(signals.trustScore) >= 50,
    hasCost: Boolean(signals.hasOwnershipCostData),
    hasNegotiation: Boolean(signals.hasNegotiationData),
    hasGaps: dataGaps.length > 0
  });

  const userFriendlyExplanation = buildUserFriendlyExplanation({
    decisionLabel: purchaseDecision?.decisionLabel ?? 'değerlendirilebilir',
    positiveCount: topPositiveDrivers.length,
    negativeCount: topNegativeDrivers.length,
    confidenceLabel: confidenceExplanation.confidenceLabel
  });

  const nextVerificationSteps = buildVerificationSteps(input.category);

  const decisionExplainability = {
    explanationScore,
    explanationLevel,
    explanationLabel: EXPLANATION_LEVEL_LABELS[explanationLevel] ?? 'Açıklanabilir',
    decisionPath,
    topPositiveDrivers,
    topNegativeDrivers,
    scoreContributions,
    confidenceExplanation,
    dataGaps,
    reasoningSummary,
    userFriendlyExplanation,
    nextVerificationSteps
  };

  memoCache.set(cacheKey, decisionExplainability);
  if (memoCache.size > 8) {
    const oldest = memoCache.keys().next().value;
    if (oldest) memoCache.delete(oldest);
  }

  return decisionExplainability;
}
