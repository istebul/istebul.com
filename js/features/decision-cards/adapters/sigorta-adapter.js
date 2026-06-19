/**
 * Sigorta scenario → DecisionCategoryCardViewModel (shadow mode).
 */
import {
  assembleViewModel,
  buildCardAiExplanation,
  createFallbackViewModel,
  passthroughDecisionScore
} from '../decision-category-card-contract.js';
import {
  SIGORTA_SIGNAL_DEFS,
  compactSignals,
  formatPremiumBand,
  formatScoreSignal,
  riskLabelToTone,
  signal
} from '../decision-category-card-signals.js';

/** @typedef {import('../decision-category-card-contract.js').DecisionCardAdapterInput} DecisionCardAdapterInput */
/** @typedef {import('../decision-category-card-contract.js').DecisionCategoryCardViewModel} DecisionCategoryCardViewModel */

/**
 * @param {object} scenario
 * @param {object} [engine]
 * @returns {import('../decision-category-card-signals.js').DecisionCardSignal[]}
 */
function buildSigortaSignals(scenario = {}, engine = {}) {
  const defs = SIGORTA_SIGNAL_DEFS;
  const premium =
    scenario.metrics?.premiumBand ?? engine.premiumBand ?? engine.metrics?.premiumBand;

  return compactSignals([
    signal(defs.premium.key, defs.premium.label, formatPremiumBand(premium), 'neutral'),
    signal(
      defs.protection.key,
      defs.protection.label,
      formatScoreSignal(engine.protectionScore),
      engine.protectionScore >= 68 ? 'positive' : engine.protectionScore < 55 ? 'caution' : 'neutral'
    ),
    signal(
      defs.coverage.key,
      defs.coverage.label,
      formatScoreSignal(engine.coverageScore),
      engine.coverageScore >= 68 ? 'positive' : engine.coverageScore < 55 ? 'caution' : 'neutral'
    ),
    signal(
      defs.efficiency.key,
      defs.efficiency.label,
      formatScoreSignal(engine.costEfficiencyScore),
      engine.costEfficiencyScore >= 68 ? 'positive' : engine.costEfficiencyScore < 52 ? 'caution' : 'neutral'
    ),
    signal(
      defs.overallRisk.key,
      defs.overallRisk.label,
      String(engine.overallRisk || scenario.suitability || '').trim(),
      riskLabelToTone(engine.overallRisk)
    ),
    signal('estimatedCost', 'Tahmini prim', String(scenario.estimatedCost || '').trim(), 'neutral')
  ]);
}

/**
 * @param {DecisionCardAdapterInput} input
 * @returns {DecisionCategoryCardViewModel}
 */
export function adaptSigortaCard(input = {}) {
  const scenario = input.scenario;
  if (!scenario || typeof scenario !== 'object') {
    return createFallbackViewModel('sigorta', scenario || {});
  }

  const engine = input.engine && typeof input.engine === 'object' ? input.engine : {};
  const state = input.state && typeof input.state === 'object' ? input.state : {};

  const decisionScore = passthroughDecisionScore(scenario);
  if (decisionScore === null) {
    return createFallbackViewModel('sigorta', scenario);
  }

  const packageLabel =
    scenario.id === 'economic'
      ? 'Ekonomik paket'
      : scenario.id === 'premium'
        ? 'Geniş teminat'
        : 'Dengeli paket';

  return assembleViewModel('sigorta', input, {
    signals: buildSigortaSignals(scenario, engine),
    aiExplanation: buildCardAiExplanation('sigorta', scenario, engine, state),
    cta: {
      primary: { label: `${packageLabel} — teklif karşılaştır`, action: 'select' },
      secondary: { label: 'Teminat tablosunu incele', action: 'compare' }
    }
  });
}
