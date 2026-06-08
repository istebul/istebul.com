/**
 * Market Intelligence — demand scoring (Sprint-7).
 */

import { clampScore, safeNumber, CURRENT_YEAR } from '../engine/score-utils.js';
import { SEGMENT_DEMAND_BASE, getDemandLabel } from './market-model.js';
import { detectVehicleSegment } from './segment-model.js';

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
 * @param {{
 *   segment?: string,
 *   quality?: { quality_score?: number },
 *   risk?: { risk_score?: number, risk_label?: string }
 * }} [context]
 */
export function computeDemandScore(listing, context = {}) {
  const segment = context.segment ?? detectVehicleSegment(listing);
  let score = SEGMENT_DEMAND_BASE[segment] ?? SEGMENT_DEMAND_BASE.unknown;

  const year = listing.year !== null && listing.year !== undefined ? safeNumber(listing.year) : 0;
  const km = listing.km !== null && listing.km !== undefined ? safeNumber(listing.km) : null;

  if (year >= CURRENT_YEAR - 3) {
    score += 8;
  }

  if (km !== null && km >= 0 && km < 60000) {
    score += 6;
  }

  if (isAutomaticTransmission(listing.transmission)) {
    score += 4;
  }

  const qualityScore = Number(context.quality?.quality_score);
  if (Number.isFinite(qualityScore) && qualityScore < 40) {
    score -= 10;
  }

  const riskScore = Number(context.risk?.risk_score);
  const riskLabel = String(context.risk?.risk_label ?? '');
  if ((Number.isFinite(riskScore) && riskScore > 60) || riskLabel === 'Yüksek') {
    score -= 12;
  }

  const demand_score = clampScore(score);
  return {
    demand_score,
    demand_label: getDemandLabel(demand_score)
  };
}
