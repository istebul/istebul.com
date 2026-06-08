/**
 * AI Decision Simulator v1 — client entry (Sprint-18).
 */

export {
  clearDecisionSimulatorMemoCache,
  buildSimulatorCacheKey,
  buildSimulatorInput,
  computeSimulatorConfidence,
  runDecisionSimulator
} from './simulator-engine.js';

export {
  SIMULATOR_BUDGET_DELTAS,
  SIMULATOR_RISK_OPTIONS,
  SIMULATOR_USAGE_OPTIONS,
  SIMULATOR_ANNUAL_KM_OPTIONS,
  SIMULATOR_PRIORITY_OPTIONS,
  applyBudgetDelta,
  mapSimulatorUsageToProfile,
  mapSimulatorPriorityToProfile,
  buildDefaultScenario,
  buildScenarioProfile,
  describeScenarioChanges
} from './scenario-builder.js';

export {
  SUBSCORE_DELTA_LABELS,
  DELTA_REASON_TEMPLATES,
  computeFitDelta,
  computeSubscoreDelta,
  classifyDeltaDirection
} from './delta-engine.js';

export {
  buildSimulationExplanation,
  buildFactorChangeList
} from './explanation-engine.js';

export {
  SIMULATOR_FORBIDDEN_PHRASES,
  sanitizeSimulatorSummary,
  buildSimulatorSummary,
  buildSimulatorRecommendation
} from './simulator-summary.js';

export {
  buildSimulatorFormHtml,
  buildSimulatorResultBodyHtml,
  buildSimulatorPanelHtml,
  buildSimulatorDrawerPanelHtml,
  buildSimulatorDrawerHtml,
  buildSimulatorShellHtml
} from './simulator-card-builder.js';
