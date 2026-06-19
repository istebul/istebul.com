/**
 * Tatil scenario → DecisionCategoryCardViewModel (shadow mode).
 */
import {
  assembleViewModel,
  buildCardAiExplanation,
  createFallbackViewModel,
  passthroughDecisionScore
} from '../decision-category-card-contract.js';
import { TATIL_SIGNAL_DEFS, compactSignals, signal } from '../decision-category-card-signals.js';

/** @typedef {import('../decision-category-card-contract.js').DecisionCardAdapterInput} DecisionCardAdapterInput */
/** @typedef {import('../decision-category-card-contract.js').DecisionCategoryCardViewModel} DecisionCategoryCardViewModel */

/**
 * @param {object} scenario
 * @returns {import('../decision-category-card-signals.js').DecisionCardSignal[]}
 */
function buildTatilSignals(scenario = {}) {
  const defs = TATIL_SIGNAL_DEFS;
  const budgetFit = scenario.scores?.budgetFit || scenario.budgetFit;

  return compactSignals([
    signal(defs.estimatedCost.key, defs.estimatedCost.label, String(scenario.estimatedCost || '').trim()),
    signal(defs.suitability.key, defs.suitability.label, String(scenario.suitability || '').trim()),
    signal(defs.audience.key, defs.audience.label, String(scenario.audience || '').trim()),
    signal(
      defs.budgetFit.key,
      defs.budgetFit.label,
      budgetFit ? String(budgetFit) : '—',
      budgetFit === 'high' ? 'positive' : budgetFit === 'low' ? 'caution' : 'neutral'
    )
  ]);
}

/**
 * @param {DecisionCardAdapterInput} input
 * @returns {DecisionCategoryCardViewModel}
 */
export function adaptTatilCard(input = {}) {
  const scenario = input.scenario;
  if (!scenario || typeof scenario !== 'object') {
    return createFallbackViewModel('tatil', scenario || {});
  }

  const decisionScore = passthroughDecisionScore(scenario);
  if (decisionScore === null) {
    return createFallbackViewModel('tatil', scenario);
  }

  const state = input.state && typeof input.state === 'object' ? input.state : {};
  const metrics = {
    totalCost: scenario.costs?.realTotal,
    budgetTarget: scenario.costs?.target,
    ...(input.metrics || {})
  };

  return assembleViewModel('tatil', input, {
    signals: buildTatilSignals(scenario),
    aiExplanation: buildCardAiExplanation('tatil', scenario, input.engine || {}, state, metrics),
    cta: {
      primary: { label: 'Bu senaryoyu seç', action: 'select' },
      secondary: { label: 'Alternatifleri karşılaştır', action: 'compare' }
    }
  });
}
