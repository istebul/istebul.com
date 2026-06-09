/**
 * Konut scenario → DecisionCategoryCardViewModel (shadow mode).
 */
import {
  assembleViewModel,
  buildCardAiExplanation,
  createFallbackViewModel,
  passthroughDecisionScore
} from '../decision-category-card-contract.js';
import { KONUT_SIGNAL_DEFS, compactSignals, signal } from '../decision-category-card-signals.js';

/** @typedef {import('../decision-category-card-contract.js').DecisionCardAdapterInput} DecisionCardAdapterInput */
/** @typedef {import('../decision-category-card-contract.js').DecisionCategoryCardViewModel} DecisionCategoryCardViewModel */

/**
 * @param {object} scenario
 * @param {object} [metrics]
 * @returns {import('../decision-category-card-signals.js').DecisionCardSignal[]}
 */
function buildKonutSignals(scenario = {}, metrics = {}) {
  const defs = KONUT_SIGNAL_DEFS;

  return compactSignals([
    signal(defs.monthlyEffect.key, defs.monthlyEffect.label, String(scenario.monthlyEffect || '').trim()),
    signal(defs.totalEffect.key, defs.totalEffect.label, String(scenario.totalEffect || '').trim()),
    signal(defs.riskEffect.key, defs.riskEffect.label, String(scenario.riskEffect || '').trim(), 'neutral'),
    signal(
      defs.dti.key,
      defs.dti.label,
      Number.isFinite(Number(metrics.dti)) ? `%${Math.round(Number(metrics.dti))}` : '—',
      Number(metrics.dti) > 45 ? 'caution' : Number(metrics.dti) <= 35 ? 'positive' : 'neutral'
    )
  ]);
}

/**
 * @param {DecisionCardAdapterInput} input
 * @returns {DecisionCategoryCardViewModel}
 */
export function adaptKonutCard(input = {}) {
  const scenario = input.scenario;
  if (!scenario || typeof scenario !== 'object') {
    return createFallbackViewModel('konut', scenario || {});
  }

  const decisionScore = passthroughDecisionScore(scenario);
  if (decisionScore === null) {
    return createFallbackViewModel('konut', scenario);
  }

  const state = input.state && typeof input.state === 'object' ? input.state : {};
  const metrics = input.metrics && typeof input.metrics === 'object' ? input.metrics : {};

  return assembleViewModel('konut', input, {
    signals: buildKonutSignals(scenario, metrics),
    aiExplanation: buildCardAiExplanation('konut', scenario, input.engine || {}, state, metrics),
    cta: {
      primary: { label: 'Bu senaryoyu seç', action: 'select' },
      secondary: { label: 'Senaryoları karşılaştır', action: 'compare' }
    }
  });
}
