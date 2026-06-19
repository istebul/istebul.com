/**
 * AI Recommendation Engine — user intent parser (client).
 */

import { applyProfileFallbacks } from '../../supabase/functions/_shared/ai-listings/recommendation/fit-score-engine.js';

/** @type {ReadonlyArray<string>} */
export const PRIORITY_OPTIONS = Object.freeze([
  'total_cost',
  'low_risk',
  'comfort',
  'performance',
  'resale',
  'family',
  'economy'
]);

/** @type {ReadonlyArray<string>} */
export const USAGE_TYPE_OPTIONS = Object.freeze(['general', 'family', 'commute', 'city', 'performance']);

/** @type {ReadonlyArray<string>} */
export const RISK_TOLERANCE_OPTIONS = Object.freeze(['low', 'medium', 'high']);

/** @type {ReadonlyArray<string>} */
export const CATEGORY_OPTIONS = Object.freeze(['vehicle', 'housing', 'vacation', 'general']);

/**
 * @param {unknown} value
 * @returns {number|null}
 */
function parseNumber(value) {
  const num = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(num) && num > 0 ? num : null;
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {Record<string, unknown>}
 */
export function parseUserIntent(raw = {}) {
  const category = String(raw.category ?? 'vehicle').trim().toLowerCase();
  const priority = String(raw.priority ?? 'total_cost').trim().toLowerCase();
  const usage_type = String(raw.usage_type ?? 'general').trim().toLowerCase();
  const risk_tolerance = String(raw.risk_tolerance ?? 'medium').trim().toLowerCase();

  return applyProfileFallbacks({
    category: CATEGORY_OPTIONS.includes(category) ? category : 'vehicle',
    budget: parseNumber(raw.budget),
    city: String(raw.city ?? '').trim() || null,
    usage_type: USAGE_TYPE_OPTIONS.includes(usage_type) ? usage_type : 'general',
    family_size: parseNumber(raw.family_size),
    annual_km: parseNumber(raw.annual_km),
    risk_tolerance: RISK_TOLERANCE_OPTIONS.includes(risk_tolerance) ? risk_tolerance : 'medium',
    priority: PRIORITY_OPTIONS.includes(priority) ? priority : 'total_cost'
  });
}

/**
 * @param {Record<string, unknown>} profile
 * @returns {string[]}
 */
export function listMissingProfileFields(profile) {
  /** @type {string[]} */
  const missing = [];
  if (!profile.budget) missing.push('budget');
  if (!profile.city) missing.push('city');
  if (!profile.family_size) missing.push('family_size');
  if (!profile.annual_km) missing.push('annual_km');
  return missing;
}
