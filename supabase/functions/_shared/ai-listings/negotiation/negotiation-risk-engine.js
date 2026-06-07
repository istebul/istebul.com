/**
 * Negotiation Intelligence — risk level engine (Sprint-22 v1).
 */

import { safeNumber } from '../engine/score-utils.js';

/** @type {ReadonlyArray<string>} */
export const NEGOTIATION_RISK_LEVELS = Object.freeze(['Düşük', 'Orta', 'Yüksek']);

/**
 * @param {'Düşük'|'Orta'|'Yüksek'|string} level
 * @returns {string}
 */
export function buildNegotiationRiskLabel(level) {
  if (level === 'Düşük') return 'Düşük pazarlık riski';
  if (level === 'Yüksek') return 'Yüksek pazarlık riski';
  return 'Orta pazarlık riski';
}

/**
 * @param {'Düşük'|'Orta'|'Yüksek'|string} level
 * @returns {'low'|'mid'|'high'}
 */
export function mapNegotiationRiskClass(level) {
  if (level === 'Düşük') return 'low';
  if (level === 'Yüksek') return 'high';
  return 'mid';
}

/**
 * @param {Record<string, unknown>} input
 * @param {Record<string, unknown>} offerRange
 * @returns {'Düşük'|'Orta'|'Yüksek'}
 */
export function classifyNegotiationRiskLevel(input, offerRange = {}) {
  const risk = safeNumber(input.risk_score) || 50;
  const quality = safeNumber(input.quality_score) || 50;
  const duplicate = String(input.duplicate_status ?? 'new');
  const priceIntel = /** @type {Record<string, unknown>} */ (input.price_intelligence ?? {});
  const position = String(priceIntel.price_position ?? 'unknown');
  const confidence = safeNumber(input.confidence) || 50;
  const roomPct = safeNumber(offerRange.negotiation_room_pct);

  let score = 0;

  if (risk >= 70) score += 3;
  else if (risk >= 55) score += 2;
  else if (risk >= 40) score += 1;

  if (quality < 45) score += 2;
  else if (quality < 60) score += 1;

  if (duplicate === 'exact') score += 3;
  else if (duplicate === 'similar') score += 2;

  if (position === 'underpriced') score += 2;
  else if (position === 'unknown') score += 1;

  if (confidence < 40) score += 2;
  else if (confidence < 55) score += 1;

  if (roomPct >= 9) score += 1;

  const executive = String(input.executive_label ?? '');
  if (/riskli|dikkatli|uygun görünmüyor/i.test(executive)) score += 2;

  if (score >= 5) return 'Yüksek';
  if (score <= 2) return 'Düşük';
  return 'Orta';
}
