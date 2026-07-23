/**
 * Auto (araba) scenario → DecisionCategoryCardViewModel (shadow mode).
 */
import {
  assembleViewModel,
  buildCardAiExplanation,
  createFallbackViewModel,
  passthroughDecisionScore
} from '../decision-category-card-contract.js';
import { AUTO_SIGNAL_DEFS, compactSignals, signal } from '../decision-category-card-signals.js';

/** @typedef {import('../decision-category-card-contract.js').DecisionCardAdapterInput} DecisionCardAdapterInput */
/** @typedef {import('../decision-category-card-contract.js').DecisionCategoryCardViewModel} DecisionCategoryCardViewModel */

/**
 * @param {object} scenario
 * @returns {import('../decision-category-card-signals.js').DecisionCardSignal[]}
 */
function buildAutoSignals(scenario = {}) {
  const defs = AUTO_SIGNAL_DEFS;
  const vehicle = scenario.vehicle || scenario;
  const costs = vehicle.costs || scenario.costs || {};
  const monthly =
    scenario.monthlyCost ??
    costs.ownership?.annual?.allInTotal ??
    costs.ownership?.annual?.operatingTotal;

  return compactSignals([
    signal(
      defs.monthlyCost.key,
      defs.monthlyCost.label,
      Number.isFinite(Number(monthly))
        ? `~₺${Math.round(Number(monthly) / 12).toLocaleString('tr-TR')}/ay`
        : String(scenario.estimatedCost || '').trim() || '—'
    ),
    signal(defs.fuel.key, defs.fuel.label, String(scenario.fuelDisplay || scenario.fuel || '').trim()),
    signal(defs.resale.key, defs.resale.label, String(scenario.resaleDisplay || '').trim()),
    signal(
      defs.suitability.key,
      defs.suitability.label,
      String(scenario.suitability || scenario.confidenceLabel || '').trim()
    )
  ]);
}

/**
 * @param {DecisionCardAdapterInput} input
 * @returns {DecisionCategoryCardViewModel}
 */
export function adaptAutoCard(input = {}) {
  const scenario = input.scenario;
  if (!scenario || typeof scenario !== 'object') {
    return createFallbackViewModel('araba', scenario || {});
  }

  const decisionScore = passthroughDecisionScore(scenario);
  if (decisionScore === null) {
    return createFallbackViewModel('araba', scenario);
  }

  const state = input.state && typeof input.state === 'object' ? input.state : {};
  const metrics = input.metrics && typeof input.metrics === 'object' ? input.metrics : {};
  const vehicleName = scenario.name || scenario.vehicle?.name || scenario.title || 'Araç';

  return assembleViewModel(
    'araba',
    input,
    {
      title: String(scenario.title || vehicleName),
      signals: buildAutoSignals(scenario),
      aiExplanation: buildCardAiExplanation('auto', scenario, input.engine || {}, state, metrics),
      pros: scenario.reasons || scenario.pros,
      cautions: scenario.risks || scenario.cautions,
      cta: {
        primary: { label: `${vehicleName} — seç`, action: 'select' },
        secondary: { label: 'TCO karşılaştır', action: 'compare' }
      }
    }
  );
}
