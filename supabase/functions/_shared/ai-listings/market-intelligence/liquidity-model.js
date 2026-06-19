/**
 * Market Intelligence — liquidity scoring (Sprint-7).
 */

import { clampScore, safeNumber, CURRENT_YEAR } from '../engine/score-utils.js';
import { MAINSTREAM_BRANDS, PREMIUM_BRANDS, getLiquidityLabel } from './market-model.js';

const LIQUIDITY_BASE = 55;

/**
 * @param {string} brand
 * @returns {'mainstream'|'premium'|null}
 */
function classifyBrand(brand) {
  const normalized = String(brand ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR');
  if (!normalized) return null;
  if (MAINSTREAM_BRANDS.some((entry) => normalized.includes(entry))) return 'mainstream';
  if (PREMIUM_BRANDS.some((entry) => normalized.includes(entry))) return 'premium';
  return null;
}

/**
 * @param {string} transmission
 * @returns {boolean}
 */
function isAutomaticTransmission(transmission) {
  const value = String(transmission ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR');
  return (
    value.includes('otomatik') ||
    value.includes('automatic') ||
    value.includes('dsg') ||
    value.includes('cvt') ||
    value.includes('yarı otomatik') ||
    value.includes('yari otomatik')
  );
}

/**
 * @param {Record<string, unknown>} listing
 */
export function computeLiquidityScore(listing) {
  let score = LIQUIDITY_BASE;

  const brandClass = classifyBrand(String(listing.brand ?? ''));
  if (brandClass === 'mainstream') score += 10;
  if (brandClass === 'premium') score += 5;

  const km = listing.km !== null && listing.km !== undefined ? safeNumber(listing.km) : null;
  if (km !== null && km > 180000) {
    score -= 15;
  }

  const year = listing.year !== null && listing.year !== undefined ? safeNumber(listing.year) : 0;
  if (year > 0 && year < CURRENT_YEAR - 10) {
    score -= 12;
  }

  if (isAutomaticTransmission(listing.transmission)) {
    score += 3;
  }

  const images = Array.isArray(listing.images) ? listing.images : [];
  if (images.length === 0) {
    score -= 8;
  }

  if (!String(listing.location ?? '').trim()) {
    score -= 5;
  }

  const liquidity_score = clampScore(score);
  return {
    liquidity_score,
    liquidity_label: getLiquidityLabel(liquidity_score)
  };
}
