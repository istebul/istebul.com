/**
 * Purchase Decision Intelligence — negotiation discount scenarios (Sprint-24).
 */

import { clampScore, safeNumber } from '../engine/score-utils.js';
import { computeDecisionScore } from './decision-strength-engine.js';
import { DECISION_LEVEL_LABELS, resolveDecisionLevel } from './decision-summary.js';

/** @type {ReadonlyArray<number>} */
export const NEGOTIATION_DISCOUNT_RATES = Object.freeze([3, 5, 10]);

/**
 * @param {number} basePrice
 * @param {number} discountPct
 * @returns {number}
 */
export function computeAdjustedPrice(basePrice, discountPct) {
  const price = safeNumber(basePrice);
  const rate = safeNumber(discountPct);
  if (price <= 0) return 0;
  return Math.round(price * (1 - rate / 100));
}

/**
 * @param {Record<string, unknown>} signals
 * @param {number} discountPct
 * @returns {number}
 */
export function estimateDecisionScoreAfterDiscount(signals, discountPct) {
  const boostedSignals = {
    ...signals,
    negotiationSignal: clampScore(safeNumber(signals.negotiationSignal) + discountPct * 1.8),
    offerAdvantage: clampScore(safeNumber(signals.offerAdvantage) + discountPct * 2),
    ownershipCostSignal: clampScore(safeNumber(signals.ownershipCostSignal) + discountPct * 0.5)
  };
  return computeDecisionScore(boostedSignals);
}

/**
 * @param {string} fromLabel
 * @param {string} toLabel
 * @param {number} discountPct
 * @returns {string}
 */
export function buildNegotiationExplanation(fromLabel, toLabel, discountPct) {
  if (fromLabel === toLabel) {
    return `%${discountPct} indirim gerçekleşirse karar seviyesi '${fromLabel}' seviyesinde kalabilir; ek doğrulama yine önerilir.`;
  }
  return `%${discountPct} indirim gerçekleşirse karar seviyesi '${fromLabel}' seviyesinden '${toLabel}' seviyesine çıkabilir.`;
}

/**
 * @param {Record<string, unknown>} signals
 * @param {number} baseDecisionScore
 * @param {number} basePrice
 * @returns {Array<{
 *   discountPct: number,
 *   adjustedPrice: number,
 *   estimatedDecisionScore: number,
 *   decisionChange: string,
 *   explanation: string
 * }>}
 */
export function buildNegotiationScenarios(signals, baseDecisionScore, basePrice) {
  const baseLevel = resolveDecisionLevel(baseDecisionScore);
  const baseLabel = DECISION_LEVEL_LABELS[baseLevel] ?? 'Değerlendirilebilir';

  return NEGOTIATION_DISCOUNT_RATES.map((discountPct) => {
    const estimatedDecisionScore = estimateDecisionScoreAfterDiscount(signals, discountPct);
    const newLevel = resolveDecisionLevel(estimatedDecisionScore);
    const newLabel = DECISION_LEVEL_LABELS[newLevel] ?? 'Değerlendirilebilir';
    const decisionChange = baseLevel === newLevel ? 'unchanged' : `${baseLevel}_to_${newLevel}`;

    return {
      discountPct,
      adjustedPrice: computeAdjustedPrice(basePrice, discountPct),
      estimatedDecisionScore,
      decisionChange,
      explanation: buildNegotiationExplanation(baseLabel, newLabel, discountPct)
    };
  });
}
