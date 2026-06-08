/**
 * Decision Explainability — score contribution breakdown (Sprint-25).
 */

import { clampScore } from '../engine/score-utils.js';
import { DECISION_WEIGHTS } from '../purchase-decision/decision-strength-engine.js';
import { CONTRIBUTION_LABELS } from './explainability-summary.js';

/** @type {ReadonlyArray<string>} */
export const CONTRIBUTION_KEYS = Object.freeze([
  'recommendation',
  'quality',
  'trust',
  'negotiation',
  'ownershipCost',
  'missingInfo',
  'duplicateRisk',
  'suspiciousPrice',
  'staleRisk'
]);

/**
 * @param {number} value
 * @returns {number}
 */
export function clampContribution(value) {
  return Math.min(100, Math.max(-100, Math.round(Number(value) || 0)));
}

/**
 * @param {number} score
 * @param {number} [neutral=50]
 * @returns {'positive'|'neutral'|'negative'}
 */
export function resolveContributionDirection(score, neutral = 50) {
  const s = Number(score) || 0;
  if (s >= neutral + 12) return 'positive';
  if (s <= neutral - 12) return 'negative';
  return 'neutral';
}

/**
 * @param {string} key
 * @param {number} rawScore
 * @param {number} weight
 * @param {boolean} [invert=false]
 * @returns {{ key: string, label: string, contribution: number, weight: number, direction: string, explanation: string }}
 */
export function buildContributionItem(key, rawScore, weight, invert = false) {
  const score = Number(rawScore) || 0;
  const normalized = invert ? 100 - score : score;
  const contribution = clampContribution((normalized - 50) * 2 * weight / 0.3);
  const direction = resolveContributionDirection(normalized);

  const explanations = {
    recommendation: 'Profil uyumu skoru kararın temel bileşenlerinden biridir.',
    quality: 'İlan kalite skoru veri tamlığı ve içerik gücünü yansıtır.',
    trust: 'Güven skoru doğrulama ve risk profilini özetler.',
    negotiation: 'Pazarlık sinyali fiyat konumunu ve pazarlık alanını gösterir.',
    ownershipCost: 'Toplam maliyet sinyali sahip olma yükünü değerlendirir.',
    missingInfo: 'Eksik bilgi cezası karar netliğini azaltır.',
    duplicateRisk: 'Mükerrer ilan riski güvenilirliği etkileyebilir.',
    suspiciousPrice: 'Şüpheli fiyat sinyali ek doğrulama gerektirir.',
    staleRisk: 'İlan güncelliği karar güncelliğini etkiler.'
  };

  return {
    key,
    label: CONTRIBUTION_LABELS[key] ?? key,
    contribution,
    weight,
    direction,
    explanation: explanations[key] ?? 'Bu faktör karar açıklamasına katkı sağlar.'
  };
}

/**
 * @param {Record<string, unknown>} signals
 * @returns {Array<{ key: string, label: string, contribution: number, weight: number, direction: string, explanation: string }>}
 */
export function buildScoreContributions(signals) {
  const w = DECISION_WEIGHTS;

  const items = [
    buildContributionItem('recommendation', signals.recommendationScore, w.recommendation),
    buildContributionItem('quality', signals.qualityScore, w.quality),
    buildContributionItem('trust', signals.trustScore, w.trust),
    buildContributionItem('negotiation', signals.negotiationSignal, w.negotiation),
    buildContributionItem('ownershipCost', signals.ownershipCostSignal, w.ownershipCost),
    buildContributionItem('missingInfo', signals.missingInfoPenalty, w.missingInfo, true),
    buildContributionItem('duplicateRisk', signals.duplicateRisk, 0.03, true),
    buildContributionItem('suspiciousPrice', signals.suspiciousPrice, 0.03, true),
    buildContributionItem('staleRisk', signals.staleRisk, 0.02, true)
  ];

  return items.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}
