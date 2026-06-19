/**
 * Finansman scenario → DecisionCategoryCardViewModel (shadow mode).
 */
import {
  assembleViewModel,
  buildCardAiExplanation,
  createFallbackViewModel,
  passthroughDecisionScore
} from '../decision-category-card-contract.js';
import {
  FINANSMAN_SIGNAL_DEFS,
  cashPressureToTone,
  compactSignals,
  signal
} from '../decision-category-card-signals.js';

/** @typedef {import('../decision-category-card-contract.js').DecisionCardAdapterInput} DecisionCardAdapterInput */
/** @typedef {import('../decision-category-card-contract.js').DecisionCategoryCardViewModel} DecisionCategoryCardViewModel */

/**
 * @param {object} scenario
 * @returns {import('../decision-category-card-signals.js').DecisionCardSignal[]}
 */
function buildFinansmanSignals(scenario = {}) {
  const metrics = scenario.metrics || {};
  const defs = FINANSMAN_SIGNAL_DEFS;

  return compactSignals([
    signal('estimatedCost', 'Aylık yük', String(scenario.estimatedCost || '').trim(), 'neutral'),
    signal(
      defs.cashPressure.key,
      defs.cashPressure.label,
      String(metrics.cashPressure || '').trim(),
      cashPressureToTone(metrics.cashPressure)
    ),
    signal(
      defs.financeFit.key,
      defs.financeFit.label,
      String(metrics.financeFit || scenario.suitability || '').trim(),
      'neutral'
    ),
    signal(
      defs.totalRepay.key,
      defs.totalRepay.label,
      Number.isFinite(Number(metrics.totalRepay))
        ? `~₺${Number(metrics.totalRepay).toLocaleString('tr-TR')}`
        : '—',
      'neutral'
    )
  ]);
}

/**
 * @param {DecisionCardAdapterInput} input
 * @returns {DecisionCategoryCardViewModel}
 */
export function adaptFinansmanCard(input = {}) {
  const scenario = input.scenario;
  if (!scenario || typeof scenario !== 'object') {
    return createFallbackViewModel('finansman', scenario || {});
  }

  const decisionScore = passthroughDecisionScore(scenario);
  if (decisionScore === null) {
    return createFallbackViewModel('finansman', scenario);
  }

  const state = input.state && typeof input.state === 'object' ? input.state : {};
  const metrics = {
    monthlyPayment: scenario.metrics?.monthlyPayment,
    ...(input.metrics || {})
  };

  return assembleViewModel('finansman', input, {
    signals: buildFinansmanSignals(scenario),
    aiExplanation: buildCardAiExplanation('finansman', scenario, input.engine || {}, state, metrics),
    cta: {
      primary: { label: 'Bu planı seç', action: 'select' },
      secondary: { label: 'Ödeme tablosunu karşılaştır', action: 'compare' }
    }
  });
}
