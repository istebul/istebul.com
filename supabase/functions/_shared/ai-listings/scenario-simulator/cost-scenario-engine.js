/**
 * Scenario Simulator v1 — cost scenarios (Sprint-28).
 */

import { clampScore, safeNumber } from '../engine/score-utils.js';
import { computeDecisionScore } from '../purchase-decision/decision-strength-engine.js';
import { sanitizeScenarioText } from './scenario-summary.js';

/**
 * @param {string} category
 * @returns {Array<{ key: string, label: string, signalBoost: number }>}
 */
export function getCostScenarioPresets(category) {
  const cat = String(category ?? 'vehicle').toLowerCase();

  if (cat.includes('housing') || cat === 'konut') {
    return [
      { key: 'financing_rate_change', label: 'Finansman faizi değişimi', signalBoost: -6 },
      { key: 'dues_change', label: 'Aidat değişimi', signalBoost: -4 },
      { key: 'renovation_cost_change', label: 'Renovasyon maliyeti', signalBoost: -8 }
    ];
  }

  if (cat.includes('vacation') || cat === 'tatil' || cat === 'travel') {
    return [
      { key: 'extra_fee_change', label: 'Ek ücret değişimi', signalBoost: -5 },
      { key: 'date_change', label: 'Tarih değişimi', signalBoost: 3 },
      { key: 'cancellation_policy_change', label: 'İptal koşulu değişimi', signalBoost: 4 }
    ];
  }

  return [
    { key: 'yearly_km_change', label: 'Yıllık km değişimi', signalBoost: -5 },
    { key: 'fuel_cost_change', label: 'Yakıt maliyeti değişimi', signalBoost: -6 },
    { key: 'maintenance_cost_change', label: 'Bakım maliyeti değişimi', signalBoost: -4 }
  ];
}

/**
 * @param {Record<string, unknown>} signals
 * @param {number} baseDecisionScore
 * @param {string} category
 * @returns {Array<Record<string, unknown>>}
 */
export function buildCostScenarios(signals, baseDecisionScore, category) {
  return getCostScenarioPresets(category).map((preset) => {
    const adjustedSignals = {
      ...signals,
      ownershipCostSignal: clampScore(safeNumber(signals.ownershipCostSignal) + preset.signalBoost)
    };
    const estimatedDecisionScore = computeDecisionScore(adjustedSignals);

    return {
      key: preset.key,
      label: preset.label,
      estimatedDecisionScore: clampScore(estimatedDecisionScore),
      scoreDelta: clampScore(estimatedDecisionScore - baseDecisionScore),
      decisionChange: estimatedDecisionScore > baseDecisionScore ? 'improves' : estimatedDecisionScore < baseDecisionScore ? 'worsens' : 'neutral',
      explanation: sanitizeScenarioText(
        `${preset.label} senaryosunda tahmini karar skoru ${clampScore(estimatedDecisionScore)} olabilir (fark: ${clampScore(estimatedDecisionScore - baseDecisionScore)}).`
      )
    };
  });
}
