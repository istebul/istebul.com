/**
 * Market Intelligence — shared constants and labels (Sprint-7).
 */

/** @type {ReadonlyArray<string>} */
export const VEHICLE_SEGMENTS = Object.freeze([
  'premium_sedan',
  'compact_sedan',
  'suv',
  'hatchback',
  'commercial',
  'unknown'
]);

/** @type {Readonly<Record<string, string>>} */
export const SEGMENT_LABELS_TR = Object.freeze({
  premium_sedan: 'Premium Sedan',
  compact_sedan: 'Kompakt Sedan',
  suv: 'SUV',
  hatchback: 'Hatchback',
  commercial: 'Ticari',
  unknown: 'Belirlenemedi'
});

/** @type {Readonly<Record<string, number>>} */
export const SEGMENT_DEMAND_BASE = Object.freeze({
  premium_sedan: 75,
  compact_sedan: 80,
  suv: 85,
  hatchback: 78,
  commercial: 72,
  unknown: 50
});

/** @type {ReadonlyArray<string>} */
export const MAINSTREAM_BRANDS = Object.freeze([
  'toyota',
  'renault',
  'fiat',
  'volkswagen',
  'vw',
  'hyundai',
  'honda'
]);

/** @type {ReadonlyArray<string>} */
export const PREMIUM_BRANDS = Object.freeze(['bmw', 'mercedes', 'mercedes-benz', 'audi', 'volvo']);

/** @type {ReadonlyArray<string>} */
export const FORBIDDEN_MARKET_PHRASES = Object.freeze([
  'gerçek piyasa',
  'canlı piyasa verisine göre',
  'piyasadaki ilanlara göre',
  'satış garantisi',
  'kesin değer'
]);

/**
 * @param {number} score
 * @returns {string}
 */
export function getDemandLabel(score) {
  const value = Math.round(Number(score) || 0);
  if (value <= 39) return 'Düşük';
  if (value <= 59) return 'Orta';
  if (value <= 79) return 'Orta-Yüksek';
  return 'Yüksek';
}

/**
 * @param {number} score
 * @returns {string}
 */
export function getLiquidityLabel(score) {
  const value = Math.round(Number(score) || 0);
  if (value <= 39) return 'Düşük';
  if (value <= 59) return 'Orta';
  if (value <= 79) return 'İyi';
  return 'Çok iyi';
}

/**
 * @param {number} score
 * @returns {string}
 */
export function getMarketTrend(score) {
  const value = Math.round(Number(score) || 0);
  if (value >= 80) return 'güçlü';
  if (value >= 60) return 'dengeli';
  if (value >= 40) return 'zayıf';
  return 'riskli';
}

/**
 * @param {string} segment
 * @returns {string}
 */
export function getSegmentLabel(segment) {
  return SEGMENT_LABELS_TR[segment] ?? SEGMENT_LABELS_TR.unknown;
}
