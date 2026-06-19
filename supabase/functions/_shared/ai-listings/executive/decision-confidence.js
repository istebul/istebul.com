/**
 * Executive Decision Engine — deterministic confidence scoring (Sprint-8).
 */

import { clampScore } from '../engine/score-utils.js';

/**
 * @param {{ price_score?: number, market_average?: number }} priceIntelligence
 * @param {Record<string, unknown>} listing
 * @returns {number}
 */
export function computePriceConfidence(priceIntelligence, listing) {
  const priceScore = Number(priceIntelligence?.price_score);
  const price = Number(listing.price);

  if (Number.isFinite(priceScore) && priceScore > 0) {
    return clampScore(priceScore * 0.22);
  }

  if (Number.isFinite(price) && price > 0) {
    return 28;
  }

  return 0;
}

/**
 * @param {{
 *   quality?: { quality_score?: number, missing_fields?: string[] },
 *   price_intelligence?: { price_score?: number, market_average?: number },
 *   market_intelligence?: { market_context_score?: number },
 *   risk?: { risk_score?: number },
 *   duplicate?: { status?: string|null, similarity?: number|null }
 * }} engines
 * @param {Record<string, unknown>} listing
 * @returns {number}
 */
export function computeExecutiveConfidence(engines, listing) {
  const qualityScore = Number(engines.quality?.quality_score) || 0;
  const marketContext = Number(engines.market_intelligence?.market_context_score) || 0;
  const riskScore = Number(engines.risk?.risk_score) || 0;
  const missingCount = engines.quality?.missing_fields?.length ?? 0;

  let confidence = 32;
  confidence += qualityScore * 0.18;
  confidence += computePriceConfidence(engines.price_intelligence ?? {}, listing);
  confidence += marketContext * 0.12;
  confidence += (100 - riskScore) * 0.16;
  confidence -= missingCount * 4;

  const duplicateStatus = String(engines.duplicate?.status ?? '');
  if (duplicateStatus === 'exact') {
    confidence -= 18;
  } else if (duplicateStatus === 'similar') {
    confidence -= 10;
  }

  const similarity = Number(engines.duplicate?.similarity);
  if (Number.isFinite(similarity) && similarity >= 90) {
    confidence -= 6;
  }

  return clampScore(confidence);
}
