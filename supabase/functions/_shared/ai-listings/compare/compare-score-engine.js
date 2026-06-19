/**
 * Compare Intelligence v1 — weighted score engine (Sprint-27).
 */

import { clampScore, safeNumber } from '../engine/score-utils.js';

/** @type {Readonly<Record<string, number>>} */
export const COMPARE_WEIGHTS = Object.freeze({
  purchaseDecision: 0.25,
  recommendation: 0.2,
  qualityTrust: 0.2,
  ownershipCost: 0.15,
  negotiation: 0.1,
  explainabilityConfidence: 0.05,
  riskPenalty: 0.05
});

/**
 * @param {number} costRiskLevel
 * @param {number} totalCost
 * @param {number} maxCost
 * @returns {number}
 */
export function normalizeCostSignal(costRiskLevel, totalCost, maxCost) {
  const riskMap = { low: 85, medium: 55, high: 30 };
  const riskScore = riskMap[String(costRiskLevel)] ?? 50;

  if (totalCost > 0 && maxCost > 0) {
    const costRatio = totalCost / maxCost;
    const costScore = clampScore(Math.round((1 - costRatio * 0.5) * 100));
    return clampScore(Math.round(riskScore * 0.6 + costScore * 0.4));
  }

  return clampScore(riskScore);
}

/**
 * @param {Record<string, unknown>} signals
 * @param {Record<string, unknown>|null} purchaseDecision
 * @param {Record<string, unknown>|null} explainability
 * @param {Record<string, unknown>|null} ownershipCost
 * @param {number} [maxCost]
 * @returns {number}
 */
export function computeItemCompareScore(signals, purchaseDecision, explainability, ownershipCost, maxCost = 0) {
  const decisionScore = clampScore(safeNumber(purchaseDecision?.decisionScore));
  const recommendationScore = clampScore(safeNumber(signals.recommendationScore));
  const qualityTrust = clampScore(
    (safeNumber(signals.qualityScore) + safeNumber(signals.trustScore)) / 2
  );

  const costRiskLevel = String(ownershipCost?.cost_risk_level ?? '');
  const totalCost = safeNumber(ownershipCost?.total_cost);
  const costSignal = normalizeCostSignal(costRiskLevel, totalCost, maxCost || totalCost || 1);

  const negotiationSignal = clampScore(safeNumber(signals.negotiationSignal));
  const explanationScore = clampScore(safeNumber(explainability?.explanationScore));
  const confidenceScore = clampScore(safeNumber(purchaseDecision?.confidenceScore));
  const explainabilityConfidence = clampScore((explanationScore + confidenceScore) / 2);

  const riskPenalty = clampScore(safeNumber(signals.riskPenalty));
  const riskComponent = clampScore(100 - riskPenalty);

  const score = Math.round(
    decisionScore * COMPARE_WEIGHTS.purchaseDecision +
    recommendationScore * COMPARE_WEIGHTS.recommendation +
    qualityTrust * COMPARE_WEIGHTS.qualityTrust +
    costSignal * COMPARE_WEIGHTS.ownershipCost +
    negotiationSignal * COMPARE_WEIGHTS.negotiation +
    explainabilityConfidence * COMPARE_WEIGHTS.explainabilityConfidence +
    riskComponent * COMPARE_WEIGHTS.riskPenalty
  );

  return clampScore(score);
}

/**
 * @param {Array<Record<string, unknown>>} items
 * @returns {Record<string, unknown>}
 */
export function buildScoreComparison(items) {
  const scores = items.map((item) => ({
    id: item.id,
    title: item.title,
    compareScore: item.score,
    decisionScore: item.decisionScore ?? 0,
    recommendationScore: item.recommendationScore ?? 0,
    qualityScore: item.qualityScore ?? 0,
    trustScore: item.trustScore ?? 0,
    explanationScore: item.explanationScore ?? 0
  }));

  const best = scores.reduce((a, b) => (b.compareScore > a.compareScore ? b : a), scores[0] ?? {});
  const worst = scores.reduce((a, b) => (b.compareScore < a.compareScore ? b : a), scores[0] ?? {});

  return {
    items: scores,
    bestId: best.id ?? null,
    worstId: worst.id ?? null,
    gap: clampScore((best.compareScore ?? 0) - (worst.compareScore ?? 0)),
    summary: scores.length >= 2
      ? `Karşılaştırma skoru aralığı ${worst.compareScore ?? 0}–${best.compareScore ?? 0} puan.`
      : 'Yeterli karşılaştırma verisi yok.'
  };
}
