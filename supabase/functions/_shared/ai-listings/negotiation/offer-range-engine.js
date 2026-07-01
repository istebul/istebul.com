/**
 * Negotiation Intelligence — deterministic offer range (Faz N-1).
 */

import { safeNumber } from '../engine/score-utils.js';

/** @type {Readonly<Record<string, { targetPct: number, minPct: number, maxPct: number }>>} */
const POSITION_BANDS = Object.freeze({
  overpriced: { targetPct: 8, minPct: 5, maxPct: 12 },
  fair_high: { targetPct: 5, minPct: 3, maxPct: 8 },
  fair: { targetPct: 3, minPct: 1, maxPct: 5 },
  underpriced: { targetPct: 2, minPct: 0.5, maxPct: 3 },
  unknown: { targetPct: 5, minPct: 2, maxPct: 9 }
});

/**
 * @param {number} priceDeltaPct
 * @param {boolean} hasMarketReference
 * @returns {keyof typeof POSITION_BANDS}
 */
function resolvePositionBand(priceDeltaPct, hasMarketReference) {
  if (!hasMarketReference) return 'unknown';
  if (priceDeltaPct > 8) return 'overpriced';
  if (priceDeltaPct > 3) return 'fair_high';
  if (priceDeltaPct >= -5) return 'fair';
  return 'underpriced';
}

/**
 * @param {number} price
 * @param {number} discountPct
 * @returns {number}
 */
function priceAfterDiscount(price, discountPct) {
  const base = safeNumber(price);
  const rate = Math.max(0, Math.min(25, safeNumber(discountPct)));
  if (base <= 0) return 0;
  return Math.round(base * (1 - rate / 100));
}

/**
 * @param {Record<string, unknown>} input
 * @returns {{
 *   targetOffer: number,
 *   minOffer: number,
 *   maxOffer: number,
 *   discountPercent: number,
 *   hasMarketReference: boolean,
 *   priceDeltaPct: number|null,
 *   confidencePenalty: number
 * }}
 */
export function buildOfferRange(input) {
  const price = safeNumber(input.price);
  const marketReference = /** @type {Record<string, unknown>} */ (input.marketReference ?? {});
  const medianPrice = safeNumber(marketReference.medianPrice);
  const explicitDelta = marketReference.priceDeltaPct;
  const hasMedian = medianPrice > 0;
  const hasExplicitDelta = explicitDelta !== undefined && explicitDelta !== null && Number.isFinite(Number(explicitDelta));

  let priceDeltaPct = null;
  if (hasExplicitDelta) {
    priceDeltaPct = Math.round(safeNumber(explicitDelta) * 10) / 10;
  } else if (hasMedian && price > 0) {
    priceDeltaPct = Math.round(((price - medianPrice) / medianPrice) * 1000) / 10;
  }

  const hasMarketReference = priceDeltaPct !== null;
  const band = POSITION_BANDS[resolvePositionBand(safeNumber(priceDeltaPct), hasMarketReference)];

  const targetOffer = priceAfterDiscount(price, band.targetPct);
  let minOffer = priceAfterDiscount(price, band.maxPct);
  let maxOffer = priceAfterDiscount(price, band.minPct);

  if (minOffer > maxOffer) {
    const swap = minOffer;
    minOffer = maxOffer;
    maxOffer = swap;
  }

  const discountPercent = Math.round(band.targetPct * 10) / 10;
  const confidencePenalty = hasMarketReference ? 0 : 0.18;

  return {
    targetOffer: Math.max(1, targetOffer),
    minOffer: Math.max(1, minOffer),
    maxOffer: Math.max(1, maxOffer),
    discountPercent,
    hasMarketReference,
    priceDeltaPct,
    confidencePenalty
  };
}
