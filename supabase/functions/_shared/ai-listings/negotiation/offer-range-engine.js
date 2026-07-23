/**
 * Negotiation Intelligence — deterministic offer range engine (Sprint-22 v1).
 */

import { safeNumber } from '../engine/score-utils.js';

/** @type {Readonly<Record<string, { lowPct: number, highPct: number, targetPct: number }>>} */
export const POSITION_DISCOUNT_PROFILES = Object.freeze({
  overpriced: { lowPct: 0.1, highPct: 0.04, targetPct: 0.072 },
  slightly_overpriced: { lowPct: 0.073, highPct: 0.039, targetPct: 0.056 },
  fair: { lowPct: 0.045, highPct: 0.02, targetPct: 0.032 },
  underpriced: { lowPct: 0.015, highPct: 0.005, targetPct: 0.01 },
  unknown: { lowPct: 0.05, highPct: 0.025, targetPct: 0.037 }
});

/**
 * @param {number} value
 * @returns {number}
 */
export function roundOfferAmount(value) {
  const n = Math.max(0, Math.round(Number(value) || 0));
  if (n >= 100000) return Math.round(n / 10000) * 10000;
  if (n >= 10000) return Math.round(n / 1000) * 1000;
  return Math.round(n / 100) * 100;
}

/**
 * @param {Record<string, unknown>} input
 * @returns {number}
 */
export function computeRiskDiscountAdjustment(input) {
  const risk = safeNumber(input.risk_score) || 50;
  if (risk >= 70) return 0.02;
  if (risk >= 55) return 0.012;
  if (risk >= 45) return 0.006;
  return 0;
}

/**
 * @param {Record<string, unknown>} input
 * @returns {number}
 */
export function computeQualityDiscountAdjustment(input) {
  const quality = safeNumber(input.quality_score) || 50;
  if (quality < 40) return 0.015;
  if (quality < 55) return 0.009;
  if (quality < 65) return 0.004;
  return 0;
}

/**
 * @param {Record<string, unknown>} input
 * @returns {number}
 */
export function computeOwnershipCostDiscountAdjustment(input) {
  const listingPrice = safeNumber(input.listing_price);
  const ownership = /** @type {Record<string, unknown>} */ (input.ownership_cost ?? {});
  const totalCost = safeNumber(ownership.total_cost);
  const monthly = safeNumber(ownership.monthly_estimate);

  if (listingPrice <= 0) return 0;

  const costRatio = totalCost / listingPrice;
  const monthlyRatio = monthly / (listingPrice / 12);

  let adjustment = 0;
  if (costRatio >= 1.35) adjustment += 0.012;
  else if (costRatio >= 1.2) adjustment += 0.007;
  if (monthlyRatio >= 0.025) adjustment += 0.005;

  return adjustment;
}

/**
 * @param {Record<string, unknown>} input
 * @returns {{
 *   listing_price: number,
 *   suggested_offer_low: number,
 *   suggested_offer_high: number,
 *   target_offer: number,
 *   negotiation_room_pct: number,
 *   discount_profile: Record<string, number>
 * }}
 */
export function computeOfferRange(input) {
  const listingPrice = safeNumber(input.listing_price);
  const priceIntel = /** @type {Record<string, unknown>} */ (input.price_intelligence ?? {});
  const position = String(priceIntel.price_position ?? 'unknown');

  const profile = POSITION_DISCOUNT_PROFILES[position] ?? POSITION_DISCOUNT_PROFILES.unknown;
  const riskAdj = computeRiskDiscountAdjustment(input);
  const qualityAdj = computeQualityDiscountAdjustment(input);
  const costAdj = computeOwnershipCostDiscountAdjustment(input);
  const totalAdj = riskAdj + qualityAdj + costAdj;

  const lowDiscount = Math.min(0.18, profile.lowPct + totalAdj);
  const highDiscount = Math.min(0.12, profile.highPct + totalAdj * 0.55);
  const targetDiscount = Math.min(0.14, profile.targetPct + totalAdj * 0.75);

  if (listingPrice <= 0) {
    return {
      listing_price: 0,
      suggested_offer_low: 0,
      suggested_offer_high: 0,
      target_offer: 0,
      negotiation_room_pct: 0,
      discount_profile: { lowDiscount, highDiscount, targetDiscount, position }
    };
  }

  const suggestedLow = roundOfferAmount(listingPrice * (1 - lowDiscount));
  const suggestedHigh = roundOfferAmount(listingPrice * (1 - highDiscount));
  let targetOffer = roundOfferAmount(listingPrice * (1 - targetDiscount));

  targetOffer = Math.max(suggestedLow, Math.min(suggestedHigh, targetOffer));

  const negotiationRoomPct =
    listingPrice > 0 ? Math.round(((listingPrice - targetOffer) / listingPrice) * 1000) / 10 : 0;

  return {
    listing_price: listingPrice,
    suggested_offer_low: suggestedLow,
    suggested_offer_high: suggestedHigh,
    target_offer: targetOffer,
    negotiation_room_pct: negotiationRoomPct,
    discount_profile: { lowDiscount, highDiscount, targetDiscount, position, totalAdj }
  };
}
