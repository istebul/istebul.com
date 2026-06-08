/**
 * Ownership Cost — travel cost model (Sprint-21 v1).
 */

import { safeNumber } from '../engine/score-utils.js';

/**
 * @param {Record<string, unknown>} input
 * @returns {{
 *   accommodation: number,
 *   transport: number,
 *   food: number,
 *   extra_fees: number,
 *   cancel_risk_buffer: number,
 *   season_adjustment: number,
 *   total_trip: number,
 *   days: number
 * }}
 */
export function computeTravelOwnershipCosts(input) {
  const basePrice = safeNumber(input.listing_price);
  const risk = Math.min(100, Math.max(0, safeNumber(input.risk_score) || 50));
  const quality = Math.min(100, Math.max(0, safeNumber(input.quality_score) || 50));
  const usage = String(input.usage_type ?? 'family');
  const familySize = Math.max(1, safeNumber(input.family_size) || (usage === 'family' ? 4 : 2));
  const days = Math.max(3, Math.min(21, safeNumber(input.ownership_period) || 7));

  const market = /** @type {Record<string, unknown>} */ (input.market_intelligence ?? {});
  const seasonFactor = Number(market.season_factor ?? market.seasonality ?? 1) || 1;
  const seasonAdjustment = Math.round(basePrice * Math.max(0, seasonFactor - 1) * 0.35);

  const accommodation = Math.round(basePrice * (seasonFactor > 1.05 ? 1.08 : 1));
  const transport = Math.round(accommodation * (0.14 + familySize * 0.02));
  const food = Math.round(days * familySize * (quality >= 70 ? 1850 : 1420));
  const extraFees = Math.round(accommodation * 0.085);
  const cancelRiskBuffer = Math.round(accommodation * (0.04 + risk * 0.0006));

  const totalTrip = accommodation + transport + food + extraFees + cancelRiskBuffer + seasonAdjustment;

  return {
    accommodation,
    transport,
    food,
    extra_fees: extraFees,
    cancel_risk_buffer: cancelRiskBuffer,
    season_adjustment: seasonAdjustment,
    total_trip: totalTrip,
    days
  };
}
