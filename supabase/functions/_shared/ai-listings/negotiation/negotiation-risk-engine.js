/**
 * Negotiation Intelligence — risk assessment and evidence signals (Faz N-1).
 */

import { clampScore, safeNumber } from '../engine/score-utils.js';

/**
 * @param {number} score
 * @returns {'low'|'medium'|'high'}
 */
function resolveNegotiationRiskLevel(score) {
  if (score <= 35) return 'low';
  if (score <= 60) return 'medium';
  return 'high';
}

/**
 * @param {string} signal
 * @param {'positive'|'negative'|'neutral'} impact
 * @param {number} weight
 * @returns {{ signal: string, impact: 'positive'|'negative'|'neutral', weight: number }}
 */
function buildEvidenceSignal(signal, impact, weight) {
  return {
    signal,
    impact,
    weight: Math.round(Math.max(0, Math.min(1, weight)) * 100) / 100
  };
}

/**
 * @param {Record<string, unknown>} input
 * @param {ReturnType<typeof import('./offer-range-engine.js').buildOfferRange>} offerRange
 * @returns {{
 *   negotiationRisk: 'low'|'medium'|'high',
 *   evidenceSignals: Array<{ signal: string, impact: 'positive'|'negative'|'neutral', weight: number }>,
 *   confidenceAdjustment: number,
 *   riskScore: number
 * }}
 */
export function assessNegotiationRisk(input, offerRange) {
  const ownershipSignal = /** @type {Record<string, unknown>} */ (input.ownershipSignal ?? {});
  const qualitySignal = /** @type {Record<string, unknown>} */ (input.qualitySignal ?? {});
  const sellerType = String(ownershipSignal.sellerType ?? 'unknown').toLowerCase();
  const verificationLevel = String(qualitySignal.verificationLevel ?? 'none').toLowerCase();
  const qualityScore = safeNumber(qualitySignal.listingQualityScore);
  const inputConfidence = safeNumber(input.confidence) || 0.5;
  const priceDeltaPct = offerRange.priceDeltaPct;

  let riskScore = 48;
  const evidenceSignals = [];

  if (offerRange.hasMarketReference && priceDeltaPct !== null) {
    if (priceDeltaPct > 8) {
      riskScore += 14;
      evidenceSignals.push(buildEvidenceSignal('price_position', 'negative', 0.28));
    } else if (priceDeltaPct > 3) {
      riskScore += 6;
      evidenceSignals.push(buildEvidenceSignal('price_position', 'negative', 0.16));
    } else if (priceDeltaPct < -5) {
      riskScore -= 10;
      evidenceSignals.push(buildEvidenceSignal('price_position', 'positive', 0.22));
    } else {
      evidenceSignals.push(buildEvidenceSignal('price_position', 'neutral', 0.12));
    }
    evidenceSignals.push(buildEvidenceSignal('market_reference', 'positive', 0.2));
  } else {
    riskScore += 12;
    evidenceSignals.push(buildEvidenceSignal('market_reference', 'negative', 0.24));
  }

  if (sellerType === 'dealer') {
    riskScore += 8;
    evidenceSignals.push(buildEvidenceSignal('seller_type', 'negative', 0.14));
  } else if (sellerType === 'owner') {
    riskScore -= 5;
    evidenceSignals.push(buildEvidenceSignal('seller_type', 'positive', 0.1));
  } else {
    evidenceSignals.push(buildEvidenceSignal('seller_type', 'neutral', 0.08));
  }

  if (verificationLevel === 'none') {
    riskScore += 12;
    evidenceSignals.push(buildEvidenceSignal('verification', 'negative', 0.2));
  } else if (verificationLevel === 'partial') {
    riskScore += 5;
    evidenceSignals.push(buildEvidenceSignal('verification', 'neutral', 0.12));
  } else if (verificationLevel === 'full') {
    riskScore -= 8;
    evidenceSignals.push(buildEvidenceSignal('verification', 'positive', 0.18));
  }

  if (qualityScore > 0) {
    if (qualityScore < 50) {
      riskScore += 10;
      evidenceSignals.push(buildEvidenceSignal('quality', 'negative', 0.16));
    } else if (qualityScore >= 75) {
      riskScore -= 8;
      evidenceSignals.push(buildEvidenceSignal('quality', 'positive', 0.14));
    } else {
      evidenceSignals.push(buildEvidenceSignal('quality', 'neutral', 0.1));
    }
  }

  if (inputConfidence < 0.5) {
    riskScore += 10;
    evidenceSignals.push(buildEvidenceSignal('confidence', 'negative', 0.18));
  } else if (inputConfidence >= 0.8) {
    riskScore -= 4;
    evidenceSignals.push(buildEvidenceSignal('confidence', 'positive', 0.1));
  } else {
    evidenceSignals.push(buildEvidenceSignal('confidence', 'neutral', 0.08));
  }

  riskScore = clampScore(riskScore);
  const confidenceAdjustment = -(offerRange.confidencePenalty ?? 0) - (inputConfidence < 0.5 ? 0.12 : 0);

  return {
    negotiationRisk: resolveNegotiationRiskLevel(riskScore),
    evidenceSignals,
    confidenceAdjustment,
    riskScore
  };
}
