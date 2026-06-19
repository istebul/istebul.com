/**
 * Purchase Decision Intelligence — missing info impact (Sprint-24).
 */

import { clampScore } from '../engine/score-utils.js';

/**
 * @param {string[]} missingCriticalFields
 * @returns {'low'|'medium'|'high'}
 */
export function resolveImpactLevel(missingCriticalFields) {
  const count = Array.isArray(missingCriticalFields) ? missingCriticalFields.length : 0;
  if (count >= 3) return 'high';
  if (count >= 1) return 'medium';
  return 'low';
}

/**
 * @param {string[]} missingCriticalFields
 * @returns {number}
 */
export function computePotentialDecisionLift(missingCriticalFields) {
  const count = Array.isArray(missingCriticalFields) ? missingCriticalFields.length : 0;
  if (count >= 4) return 20;
  if (count === 3) return 15;
  if (count === 2) return 10;
  if (count === 1) return 5;
  return 0;
}

/**
 * @param {string[]} missingCriticalFields
 * @returns {string}
 */
export function buildMissingInfoExplanation(missingCriticalFields) {
  const fields = Array.isArray(missingCriticalFields) ? missingCriticalFields : [];
  if (!fields.length) {
    return 'Kritik alanlar büyük ölçüde tamamlanmış görünüyor; ek bilgi karar güvenini sınırlı ölçüde artırabilir.';
  }

  const joined = fields.slice(0, 3).join(' ve ');
  return `Eksik ${joined.toLowerCase()} bilgisi tamamlanırsa karar güveni belirgin şekilde artabilir.`;
}

/**
 * @param {string[]} missingCriticalFields
 * @returns {{
 *   missingCriticalFields: string[],
 *   impactLevel: 'low'|'medium'|'high',
 *   potentialDecisionLift: number,
 *   explanation: string
 * }}
 */
export function buildMissingInfoImpact(missingCriticalFields) {
  const fields = Array.isArray(missingCriticalFields) ? [...missingCriticalFields] : [];
  const impactLevel = resolveImpactLevel(fields);
  const potentialDecisionLift = clampScore(computePotentialDecisionLift(fields));

  return {
    missingCriticalFields: fields,
    impactLevel,
    potentialDecisionLift,
    explanation: buildMissingInfoExplanation(fields)
  };
}
