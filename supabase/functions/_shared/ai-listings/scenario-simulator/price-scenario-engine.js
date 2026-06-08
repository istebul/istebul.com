/**
 * Scenario Simulator v1 — price scenarios (Sprint-28).
 */

import { clampScore, safeNumber } from '../engine/score-utils.js';
import {
  computeAdjustedPrice,
  estimateDecisionScoreAfterDiscount
} from '../purchase-decision/negotiation-scenario-engine.js';
import { resolveDecisionLevel, DECISION_LEVEL_LABELS } from '../purchase-decision/decision-summary.js';
import { sanitizeScenarioText } from './scenario-summary.js';

/** @type {ReadonlyArray<{ key: string, discountPct: number, label: string }>} */
export const PRICE_SCENARIO_PRESETS = Object.freeze([
  { key: 'price_minus_3', discountPct: 3, label: 'Fiyat -%3' },
  { key: 'price_minus_5', discountPct: 5, label: 'Fiyat -%5' },
  { key: 'price_minus_10', discountPct: 10, label: 'Fiyat -%10' }
]);

/**
 * @param {Record<string, unknown>} signals
 * @param {number} baseDecisionScore
 * @param {number} basePrice
 * @param {number} discountPct
 * @param {string} key
 * @returns {Record<string, unknown>}
 */
export function buildPriceScenario(signals, baseDecisionScore, basePrice, discountPct, key) {
  const estimatedDecisionScore = estimateDecisionScoreAfterDiscount(signals, discountPct);
  const baseLevel = resolveDecisionLevel(baseDecisionScore);
  const newLevel = resolveDecisionLevel(estimatedDecisionScore);
  const baseLabel = DECISION_LEVEL_LABELS[baseLevel] ?? 'Değerlendirme';
  const newLabel = DECISION_LEVEL_LABELS[newLevel] ?? 'Değerlendirme';

  return {
    key,
    discountPct,
    adjustedPrice: computeAdjustedPrice(basePrice, discountPct),
    estimatedDecisionScore: clampScore(estimatedDecisionScore),
    scoreDelta: clampScore(estimatedDecisionScore - baseDecisionScore),
    decisionChange: baseLevel === newLevel ? 'unchanged' : `${baseLevel}_to_${newLevel}`,
    baseDecisionLabel: baseLabel,
    simulatedDecisionLabel: newLabel,
    explanation: sanitizeScenarioText(
      `%${discountPct} fiyat indirimi senaryosunda tahmini karar skoru ${clampScore(estimatedDecisionScore)} olabilir (${baseLabel} → ${newLabel}).`
    )
  };
}

/**
 * @param {Record<string, unknown>} signals
 * @param {number} baseDecisionScore
 * @param {number} basePrice
 * @param {number} [customDiscountPct]
 * @returns {Array<Record<string, unknown>>}
 */
export function buildPriceScenarios(signals, baseDecisionScore, basePrice, customDiscountPct) {
  const scenarios = PRICE_SCENARIO_PRESETS.map((preset) =>
    buildPriceScenario(signals, baseDecisionScore, basePrice, preset.discountPct, preset.key)
  );

  if (customDiscountPct != null && Number.isFinite(Number(customDiscountPct))) {
    scenarios.push(
      buildPriceScenario(signals, baseDecisionScore, basePrice, Number(customDiscountPct), 'custom_price_change')
    );
  }

  return scenarios;
}
