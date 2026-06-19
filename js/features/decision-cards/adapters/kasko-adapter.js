/**
 * Kasko scenario → DecisionCategoryCardViewModel (shadow mode).
 */
import {
  assembleViewModel,
  buildCardAiExplanation,
  createFallbackViewModel,
  passthroughDecisionScore
} from '../decision-category-card-contract.js';
import {
  KASKO_SIGNAL_DEFS,
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
function buildKaskoSignals(scenario = {}, engine = {}) {
  const defs = KASKO_SIGNAL_DEFS;
  const premium = scenario.metrics?.premiumBand;

  return compactSignals([
    signal(defs.premium.key, defs.premium.label, formatPremiumBand(premium), 'neutral'),
    signal(
      defs.coverage.key,
      defs.coverage.label,
      formatScoreSignal(engine.coverageScore),
      engine.coverageScore >= 72 ? 'positive' : engine.coverageScore < 55 ? 'caution' : 'neutral'
    ),
    signal(
      defs.repairRisk.key,
      defs.repairRisk.label,
      formatScoreSignal(engine.repairRiskScore),
      engine.repairRiskScore >= 65 ? 'positive' : engine.repairRiskScore < 55 ? 'caution' : 'neutral'
    ),
    signal(
      defs.efficiency.key,
      defs.efficiency.label,
      formatScoreSignal(engine.premiumEfficiencyScore),
      engine.premiumEfficiencyScore >= 68 ? 'positive' : engine.premiumEfficiencyScore < 55 ? 'caution' : 'neutral'
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
export function adaptKaskoCard(input = {}) {
  const scenario = input.scenario;
  if (!scenario || typeof scenario !== 'object') {
    return createFallbackViewModel('kasko', scenario || {});
  }

  const engine = input.engine && typeof input.engine === 'object' ? input.engine : {};
  const state = input.state && typeof input.state === 'object' ? input.state : {};

  const decisionScore = passthroughDecisionScore(scenario);
  if (decisionScore === null) {
    return createFallbackViewModel('kasko', scenario);
  }

  const packageLabel =
    scenario.id === 'economic'
      ? 'Ekonomik kasko'
      : scenario.id === 'premium'
        ? 'Geniş teminat'
        : 'Önerilen kasko';

  return assembleViewModel('kasko', input, {
    signals: buildKaskoSignals(scenario, engine),
    aiExplanation: buildCardAiExplanation('kasko', scenario, engine, state),
    cta: {
      primary: { label: `${packageLabel} — teklif al`, action: 'select' },
      secondary: { label: 'Muafiyet tablosunu karşılaştır', action: 'compare' }
    }
  });
}
