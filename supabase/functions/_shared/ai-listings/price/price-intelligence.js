/**
 * Price Intelligence orchestrator — AI Listings v1.
 * Produces deterministic estimated market value; never claims live market data.
 */

import { safeNumber } from '../engine/score-utils.js';
import { estimateBaselineValue } from './price-model.js';
import { computePriceConfidence, hasSufficientPriceData } from './price-confidence.js';
import { buildPriceSummary } from './price-summary.js';

/** @type {Readonly<Record<string, { min: number, max: number }>>} */
export const PRICE_POSITION_THRESHOLDS = Object.freeze({
  underpriced: { min: -Infinity, max: -8 },
  fair: { min: -8, max: 8 },
  slightly_overpriced: { min: 8, max: 18 },
  overpriced: { min: 18, max: Infinity }
});

/**
 * @param {number} deviationPct
 * @param {boolean} sufficientData
 * @returns {'underpriced'|'fair'|'slightly_overpriced'|'overpriced'|'unknown'}
 */
export function mapPricePosition(deviationPct, sufficientData) {
  if (!sufficientData || !Number.isFinite(deviationPct)) return 'unknown';
  if (deviationPct <= -8) return 'underpriced';
  if (deviationPct <= 8) return 'fair';
  if (deviationPct <= 18) return 'slightly_overpriced';
  return 'overpriced';
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {{
 *   estimated_market_value: number,
 *   listing_price: number,
 *   deviation_amount: number,
 *   deviation_pct: number,
 *   price_position: string,
 *   price_confidence: number,
 *   price_summary: string,
 *   price_reasons: string[]
 * }}
 */
export function runPriceIntelligence(listing) {
  const listing_price = safeNumber(listing.price);
  const { estimated, reasons } = estimateBaselineValue(listing);
  const price_confidence = computePriceConfidence(listing, estimated);
  const sufficientData = hasSufficientPriceData(price_confidence) && estimated > 0 && listing_price > 0;

  let deviation_amount = 0;
  let deviation_pct = 0;
  if (sufficientData) {
    deviation_amount = listing_price - estimated;
    deviation_pct = (deviation_amount / estimated) * 100;
    deviation_pct = Math.round(deviation_pct * 10) / 10;
  }

  const price_position = mapPricePosition(deviation_pct, sufficientData);

  const result = {
    estimated_market_value: estimated,
    listing_price,
    deviation_amount: sufficientData ? Math.round(deviation_amount) : 0,
    deviation_pct,
    price_position,
    price_confidence,
    price_reasons: reasons
  };

  return {
    ...result,
    price_summary: buildPriceSummary(result)
  };
}

/**
 * @param {ReturnType<typeof runPriceIntelligence>} priceIntelligence
 * @returns {string[]}
 */
export function buildPriceIntelligenceTags(priceIntelligence) {
  if (!priceIntelligence || priceIntelligence.price_position === 'unknown') {
    return ['price_position:unknown'];
  }

  return [
    `price_position:${priceIntelligence.price_position}`,
    `estimated_market_value:${priceIntelligence.estimated_market_value}`,
    `deviation_pct:${priceIntelligence.deviation_pct}`,
    `price_confidence:${priceIntelligence.price_confidence}`
  ];
}

/**
 * @param {string[]|null|undefined} tags
 * @returns {Partial<ReturnType<typeof runPriceIntelligence>>|null}
 */
export function parsePriceIntelligenceFromTags(tags) {
  if (!Array.isArray(tags)) return null;

  const readTag = (key) => {
    const prefix = `${key}:`;
    const match = tags.find((tag) => String(tag).startsWith(prefix));
    if (!match) return null;
    return String(match).slice(prefix.length);
  };

  const position = readTag('price_position');
  if (!position) return null;

  const estimated = Number(readTag('estimated_market_value'));
  const deviation = Number(readTag('deviation_pct'));
  const confidence = Number(readTag('price_confidence'));

  return {
    estimated_market_value: Number.isFinite(estimated) ? estimated : 0,
    deviation_pct: Number.isFinite(deviation) ? deviation : 0,
    price_position: position,
    price_confidence: Number.isFinite(confidence) ? confidence : 0
  };
}
