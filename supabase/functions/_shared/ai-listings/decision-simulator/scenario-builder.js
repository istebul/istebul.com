/**
 * AI Decision Simulator — scenario parameter builder (Sprint-18 v1).
 */

import { applyProfileFallbacks } from '../recommendation/fit-score-engine.js';

/** @type {ReadonlyArray<number>} */
export const SIMULATOR_BUDGET_DELTAS = Object.freeze([-20, -10, 0, 10, 20]);

/** @type {ReadonlyArray<{ value: string, label: string }>} */
export const SIMULATOR_RISK_OPTIONS = Object.freeze([
  { value: 'low', label: 'Düşük' },
  { value: 'medium', label: 'Orta' },
  { value: 'high', label: 'Yüksek' }
]);

/** @type {ReadonlyArray<{ value: string, label: string, profile_usage: string }>} */
export const SIMULATOR_USAGE_OPTIONS = Object.freeze([
  { value: 'family', label: 'Aile', profile_usage: 'family' },
  { value: 'city', label: 'Şehir içi', profile_usage: 'city' },
  { value: 'long_distance', label: 'Uzun yol', profile_usage: 'commute' },
  { value: 'investment', label: 'Yatırım', profile_usage: 'general' },
  { value: 'commercial', label: 'Ticari', profile_usage: 'general' }
]);

/** @type {ReadonlyArray<number>} */
export const SIMULATOR_ANNUAL_KM_OPTIONS = Object.freeze([5000, 10000, 15000, 20000, 30000]);

/** @type {ReadonlyArray<{ value: string, label: string, profile_priority: string }>} */
export const SIMULATOR_PRIORITY_OPTIONS = Object.freeze([
  { value: 'total_cost', label: 'Toplam maliyet', profile_priority: 'total_cost' },
  { value: 'trust', label: 'Güven', profile_priority: 'comfort' },
  { value: 'performance', label: 'Performans', profile_priority: 'performance' },
  { value: 'low_risk', label: 'Düşük risk', profile_priority: 'low_risk' },
  { value: 'value', label: 'Değer', profile_priority: 'resale' }
]);

/**
 * @param {number|null} budget
 * @param {number} deltaPct
 * @returns {number|null}
 */
export function applyBudgetDelta(budget, deltaPct) {
  if (!Number.isFinite(Number(budget)) || Number(budget) <= 0) return null;
  const base = Number(budget);
  const multiplier = 1 + Number(deltaPct) / 100;
  return Math.round(base * multiplier);
}

/**
 * @param {string} usage
 * @returns {string}
 */
export function mapSimulatorUsageToProfile(usage) {
  const key = String(usage ?? 'family').toLowerCase();
  const match = SIMULATOR_USAGE_OPTIONS.find((opt) => opt.value === key);
  return match?.profile_usage ?? 'general';
}

/**
 * @param {string} priority
 * @returns {string}
 */
export function mapSimulatorPriorityToProfile(priority) {
  const key = String(priority ?? 'total_cost').toLowerCase();
  const match = SIMULATOR_PRIORITY_OPTIONS.find((opt) => opt.value === key);
  return match?.profile_priority ?? 'total_cost';
}

/**
 * @param {Record<string, unknown>} userIntent
 * @returns {Record<string, unknown>}
 */
export function buildDefaultScenario(userIntent = {}) {
  const resolved = applyProfileFallbacks(userIntent);
  return {
    budget_delta_pct: 0,
    risk_tolerance: resolved.risk_tolerance ?? 'medium',
    usage_type: 'family',
    annual_km: resolved.annual_km ?? 15000,
    priority: 'total_cost'
  };
}

/**
 * @param {Record<string, unknown>} userIntent
 * @param {Record<string, unknown>} scenario
 * @returns {Record<string, unknown>}
 */
export function buildScenarioProfile(userIntent, scenario = {}) {
  const resolved = applyProfileFallbacks(userIntent);
  const budgetDelta = Number(scenario.budget_delta_pct ?? 0);
  const baseBudget = resolved.budget;
  const newBudget = applyBudgetDelta(baseBudget, budgetDelta);

  const risk = String(scenario.risk_tolerance ?? resolved.risk_tolerance ?? 'medium').toLowerCase();
  const validRisk = SIMULATOR_RISK_OPTIONS.some((opt) => opt.value === risk) ? risk : 'medium';

  const usage = mapSimulatorUsageToProfile(String(scenario.usage_type ?? 'family'));
  const priority = mapSimulatorPriorityToProfile(String(scenario.priority ?? 'total_cost'));
  const annualKm = Number(scenario.annual_km ?? resolved.annual_km ?? 15000);
  const validKm = SIMULATOR_ANNUAL_KM_OPTIONS.includes(annualKm) ? annualKm : 15000;

  return applyProfileFallbacks({
    ...resolved,
    budget: newBudget,
    risk_tolerance: validRisk,
    usage_type: usage,
    annual_km: validKm,
    priority
  });
}

/**
 * @param {Record<string, unknown>} base
 * @param {Record<string, unknown>} scenario
 * @returns {string[]}
 */
export function describeScenarioChanges(base, scenario) {
  /** @type {string[]} */
  const changes = [];
  const deltaPct = Number(scenario.budget_delta_pct ?? 0);
  if (deltaPct !== 0) changes.push(`Bütçe ${deltaPct > 0 ? '+' : ''}${deltaPct}%`);
  if (scenario.risk_tolerance && scenario.risk_tolerance !== base.risk_tolerance) {
    const label = SIMULATOR_RISK_OPTIONS.find((o) => o.value === scenario.risk_tolerance)?.label;
    changes.push(`Risk toleransı: ${label ?? scenario.risk_tolerance}`);
  }
  if (scenario.usage_type) {
    const label = SIMULATOR_USAGE_OPTIONS.find((o) => o.value === scenario.usage_type)?.label;
    changes.push(`Kullanım: ${label ?? scenario.usage_type}`);
  }
  if (scenario.annual_km) changes.push(`Yıllık km: ${scenario.annual_km}`);
  if (scenario.priority) {
    const label = SIMULATOR_PRIORITY_OPTIONS.find((o) => o.value === scenario.priority)?.label;
    changes.push(`Öncelik: ${label ?? scenario.priority}`);
  }
  return changes;
}
