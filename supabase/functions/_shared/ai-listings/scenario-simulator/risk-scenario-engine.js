/**
 * Scenario Simulator v1 — risk scenarios (Sprint-28).
 */

import { clampScore, safeNumber } from '../engine/score-utils.js';
import { computeDecisionScore } from '../purchase-decision/decision-strength-engine.js';
import { resolveDecisionLevel, DECISION_LEVEL_LABELS } from '../purchase-decision/decision-summary.js';
import { sanitizeScenarioText } from './scenario-summary.js';

/** @type {ReadonlyArray<{ key: string, label: string, adjust: (signals: Record<string, unknown>) => Record<string, unknown> }>} */
export const RISK_SCENARIO_PRESETS = Object.freeze([
  {
    key: 'missing_info_completed',
    label: 'Eksik bilgi tamamlandı',
    adjust: (signals) => ({
      ...signals,
      missingInfoPenalty: 0,
      missingCritical: [],
      qualityScore: clampScore(safeNumber(signals.qualityScore) + 8)
    })
  },
  {
    key: 'duplicate_risk_removed',
    label: 'Mükerrer risk kaldırıldı',
    adjust: (signals) => ({
      ...signals,
      duplicateRisk: 0,
      riskPenalty: clampScore(Math.max(0, safeNumber(signals.riskPenalty) - 20))
    })
  },
  {
    key: 'suspicious_price_verified',
    label: 'Fiyat doğrulandı',
    adjust: (signals) => ({
      ...signals,
      priceUncertainty: false,
      negotiationSignal: clampScore(safeNumber(signals.negotiationSignal) + 10),
      riskPenalty: clampScore(Math.max(0, safeNumber(signals.riskPenalty) - 15))
    })
  },
  {
    key: 'stale_listing_refreshed',
    label: 'İlan güncellendi',
    adjust: (signals) => ({
      ...signals,
      staleRisk: 0,
      riskPenalty: clampScore(Math.max(0, safeNumber(signals.riskPenalty) - 10))
    })
  }
]);

/**
 * @param {Record<string, unknown>} signals
 * @param {number} baseDecisionScore
 * @returns {Array<Record<string, unknown>>}
 */
export function buildRiskScenarios(signals, baseDecisionScore) {
  const baseLevel = resolveDecisionLevel(baseDecisionScore);
  const baseLabel = DECISION_LEVEL_LABELS[baseLevel] ?? 'Değerlendirme';

  return RISK_SCENARIO_PRESETS.map((preset) => {
    const adjusted = preset.adjust(signals);
    const estimatedDecisionScore = computeDecisionScore(adjusted);
    const newLevel = resolveDecisionLevel(estimatedDecisionScore);
    const newLabel = DECISION_LEVEL_LABELS[newLevel] ?? 'Değerlendirme';

    return {
      key: preset.key,
      label: preset.label,
      estimatedDecisionScore: clampScore(estimatedDecisionScore),
      scoreDelta: clampScore(estimatedDecisionScore - baseDecisionScore),
      decisionChange: baseLevel === newLevel ? 'unchanged' : `${baseLevel}_to_${newLevel}`,
      baseDecisionLabel: baseLabel,
      simulatedDecisionLabel: newLabel,
      explanation: sanitizeScenarioText(
        `${preset.label} senaryosunda tahmini karar skoru ${clampScore(estimatedDecisionScore)} olabilir (${baseLabel} → ${newLabel}).`
      )
    };
  });
}
