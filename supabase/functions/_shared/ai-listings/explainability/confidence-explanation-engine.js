/**
 * Decision Explainability — data confidence explanation (Sprint-25).
 */

import { clampScore } from '../engine/score-utils.js';
import { CONFIDENCE_LEVEL_LABELS, resolveConfidenceLevel } from './explainability-summary.js';

/**
 * @param {Record<string, unknown>} signals
 * @returns {number}
 */
export function computeExplainabilityConfidenceScore(signals) {
  let confidence = 15;
  confidence += Number(signals.qualityCompleteness ?? 50) * 0.2;
  confidence += Number(signals.trustScore ?? 50) * 0.18;
  if (signals.hasPriceEvidence) confidence += 15;
  if (signals.hasImageEvidence) confidence += 12;
  if (signals.hasOwnershipCostData) confidence += 10;
  if (signals.hasNegotiationData) confidence += 10;
  if (Number(signals.missingCritical?.length ?? 0) === 0) confidence += 10;

  return clampScore(Math.round(confidence));
}

/**
 * @param {Record<string, unknown>} signals
 * @param {number} confidenceScore
 * @returns {string}
 */
export function buildWhyThisConfidence(signals, confidenceScore) {
  const level = resolveConfidenceLevel(confidenceScore);
  const parts = [];

  if (Number(signals.qualityCompleteness) >= 70) {
    parts.push('temel ilan bilgileri mevcut');
  } else {
    parts.push('temel ilan bilgileri kısmen eksik');
  }

  if (!signals.hasPriceEvidence) parts.push('fiyat doğrulaması sınırlı');
  if (!signals.hasImageEvidence) parts.push('görsel kanıt sınırlı');
  if (Number(signals.missingCritical?.length ?? 0) > 0) {
    parts.push('kritik alanlar tamamlanmamış');
  }
  if (signals.hasOwnershipCostData) parts.push('maliyet verisi mevcut');
  if (signals.hasNegotiationData) parts.push('pazarlık verisi mevcut');

  const levelText = level === 'high' ? 'yüksek' : level === 'medium' ? 'orta' : 'düşük';
  return `Veri güveni ${levelText} seviyede çünkü ${parts.slice(0, 3).join(' ancak ')}.`;
}

/**
 * @param {Record<string, unknown>} signals
 * @returns {string[]}
 */
export function buildWhatWouldIncreaseConfidence(signals) {
  /** @type {string[]} */
  const items = [];

  if (Number(signals.missingCritical?.length ?? 0) > 0) {
    items.push('Kritik eksik alanları tamamlamak');
  }
  if (!signals.hasPriceEvidence) {
    items.push('Fiyat doğrulaması yapmak');
  }
  if (!signals.hasImageEvidence) {
    items.push('Görsel kanıt eklemek veya doğrulamak');
  }
  if (!signals.hasOwnershipCostData) {
    items.push('Toplam maliyet hesaplamasını tamamlamak');
  }
  if (!signals.hasNegotiationData) {
    items.push('Pazarlık ve fiyat karşılaştırması yapmak');
  }
  if (Number(signals.duplicateRisk) >= 35) {
    items.push('Mükerrer ilan kontrolü yapmak');
  }

  if (!items.length) {
    items.push('Mevcut doğrulamaları güncel tutmak');
    items.push('Alternatif ilanlarla karşılaştırma yapmak');
  }

  return items.slice(0, 5);
}

/**
 * @param {Record<string, unknown>} signals
 * @returns {{
 *   confidenceScore: number,
 *   confidenceLevel: string,
 *   confidenceLabel: string,
 *   whyThisConfidence: string,
 *   whatWouldIncreaseConfidence: string[]
 * }}
 */
export function buildConfidenceExplanation(signals) {
  const confidenceScore = computeExplainabilityConfidenceScore(signals);
  const confidenceLevel = resolveConfidenceLevel(confidenceScore);

  return {
    confidenceScore,
    confidenceLevel,
    confidenceLabel: CONFIDENCE_LEVEL_LABELS[confidenceLevel] ?? 'Orta veri güveni',
    whyThisConfidence: buildWhyThisConfidence(signals, confidenceScore),
    whatWouldIncreaseConfidence: buildWhatWouldIncreaseConfidence(signals)
  };
}
