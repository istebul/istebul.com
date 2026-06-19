/**
 * Scenario Simulator v1 — shared entry (Sprint-28).
 */

export {
  clearScenarioSimulatorMemoCache,
  buildScenarioCacheKey,
  buildScenarioInput,
  runScenarioSimulator
} from './scenario-simulator-engine.js';

export {
  SCENARIO_LEVEL_LABELS,
  SCENARIO_FORBIDDEN_PHRASES,
  sanitizeScenarioText,
  containsForbiddenScenarioPhrase,
  resolveScenarioLevel,
  buildScenarioSummary,
  buildScenarioNextSteps
} from './scenario-summary.js';

export {
  PRICE_SCENARIO_PRESETS,
  buildPriceScenario,
  buildPriceScenarios
} from './price-scenario-engine.js';

export { getCostScenarioPresets, buildCostScenarios } from './cost-scenario-engine.js';
export { RISK_SCENARIO_PRESETS, buildRiskScenarios } from './risk-scenario-engine.js';
