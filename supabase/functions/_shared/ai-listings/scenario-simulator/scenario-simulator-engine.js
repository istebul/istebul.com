/**
 * Scenario Simulator v1 — deterministic orchestrator (Sprint-28).
 * Does not modify any primary scores.
 */

import { safeNumber } from '../engine/score-utils.js';
import { extractPurchaseSignals } from '../purchase-decision/decision-strength-engine.js';
import { buildPurchaseDecisionInput, runPurchaseDecisionEngine } from '../purchase-decision/purchase-decision-engine.js';
import { resolveDecisionLevel, DECISION_LEVEL_LABELS } from '../purchase-decision/decision-summary.js';
import { buildPriceScenarios } from './price-scenario-engine.js';
import { buildCostScenarios } from './cost-scenario-engine.js';
import { buildRiskScenarios } from './risk-scenario-engine.js';
import {
  SCENARIO_LEVEL_LABELS,
  resolveScenarioLevel,
  buildScenarioSummary,
  buildScenarioNextSteps
} from './scenario-summary.js';

/** @type {Map<string, unknown>} */
const memoCache = new Map();

/**
 * Clear memoization cache (testing).
 */
export function clearScenarioSimulatorMemoCache() {
  memoCache.clear();
}

/**
 * @param {Record<string, unknown>} recommendation
 * @param {Record<string, unknown>} userIntent
 * @param {string} scenarioKey
 * @returns {string}
 */
export function buildScenarioCacheKey(recommendation, userIntent, scenarioKey) {
  const id = String(recommendation?.id ?? '');
  return `ss:${id}:${scenarioKey}:${JSON.stringify(userIntent ?? {})}`;
}

/**
 * @param {Record<string, unknown>} recommendation
 * @param {Record<string, unknown>} [userIntent]
 * @param {string} [scenarioKey]
 * @returns {Record<string, unknown>}
 */
export function buildScenarioInput(recommendation, userIntent = {}, scenarioKey = 'price_minus_5') {
  const listing = /** @type {Record<string, unknown>} */ (recommendation?.listing ?? recommendation ?? {});
  const category = String(recommendation?.category ?? listing.category ?? userIntent.category ?? 'vehicle');

  return {
    recommendation,
    user_intent: userIntent,
    category,
    scenario_key: scenarioKey
  };
}

/**
 * @param {Array<Record<string, unknown>>} scenarios
 * @param {string} key
 * @returns {Record<string, unknown>|null}
 */
function findScenario(scenarios, key) {
  return scenarios.find((s) => s.key === key) ?? scenarios[0] ?? null;
}

/**
 * @param {Record<string, unknown>} input
 * @returns {Record<string, unknown>|null}
 */
function assembleScenarioSimulation(input) {
  const recommendation = /** @type {Record<string, unknown>} */ (input.recommendation ?? {});
  const userIntent = /** @type {Record<string, unknown>} */ (input.user_intent ?? {});
  const category = String(input.category ?? 'vehicle');
  const scenarioKey = String(input.scenario_key ?? 'price_minus_5');

  const pdInput = buildPurchaseDecisionInput(recommendation, userIntent);
  const purchaseDecision = runPurchaseDecisionEngine(pdInput, { skipCache: true });
  const signals = extractPurchaseSignals(pdInput);

  const baseDecisionScore = safeNumber(purchaseDecision?.decisionScore);
  const baseLevel = resolveDecisionLevel(baseDecisionScore);
  const baseLabel = DECISION_LEVEL_LABELS[baseLevel] ?? 'Değerlendirme';

  const listing = /** @type {Record<string, unknown>} */ (recommendation.listing ?? recommendation ?? {});
  const basePrice = safeNumber(recommendation.price ?? listing.price);

  const priceScenarios = buildPriceScenarios(signals, baseDecisionScore, basePrice);
  const costScenarios = buildCostScenarios(signals, baseDecisionScore, category);
  const riskScenarios = buildRiskScenarios(signals, baseDecisionScore);

  const allScenarios = [...priceScenarios, ...costScenarios, ...riskScenarios];
  const selected = findScenario(allScenarios, scenarioKey);

  if (!selected && baseDecisionScore <= 0 && !recommendation.id) {
    return null;
  }

  const simulatedDecisionScore = safeNumber(selected?.estimatedDecisionScore ?? baseDecisionScore);
  const scoreDelta = clampDelta(simulatedDecisionScore - baseDecisionScore);
  const hasData = Boolean(recommendation.id) && baseDecisionScore > 0;
  const scenarioLevel = resolveScenarioLevel(scoreDelta, hasData);

  const simulatedLevel = resolveDecisionLevel(simulatedDecisionScore);
  const simulatedLabel = DECISION_LEVEL_LABELS[simulatedLevel] ?? 'Değerlendirme';

  const ctx = {
    scoreDelta,
    scenarioLevel,
    selectedScenario: selected
  };

  return {
    baseDecisionScore: clampDelta(baseDecisionScore),
    simulatedDecisionScore: clampDelta(simulatedDecisionScore),
    scoreDelta,
    baseDecisionLabel: baseLabel,
    simulatedDecisionLabel: simulatedLabel,
    scenarioLevel,
    scenarioLabel: SCENARIO_LEVEL_LABELS[scenarioLevel],
    selectedScenario: selected,
    priceScenarios,
    costScenarios,
    riskScenarios,
    summary: buildScenarioSummary(ctx),
    nextSteps: buildScenarioNextSteps(category)
  };
}

/**
 * @param {number} value
 * @returns {number}
 */
function clampDelta(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/**
 * @param {Record<string, unknown>} input
 * @param {{ skipCache?: boolean }} [options]
 * @returns {Record<string, unknown>|null}
 */
export function runScenarioSimulator(input, options = {}) {
  const recommendation = /** @type {Record<string, unknown>} */ (input?.recommendation ?? {});
  const scenarioKey = String(input?.scenario_key ?? 'price_minus_5');
  const id = String(recommendation?.id ?? '');

  if (!id && !safeNumber(recommendation?.fit_score ?? recommendation?.score)) {
    return null;
  }

  const cacheKey = buildScenarioCacheKey(recommendation, input.user_intent ?? {}, scenarioKey);

  if (!options.skipCache) {
    const cached = memoCache.get(cacheKey);
    if (cached) return /** @type {Record<string, unknown>} */ (cached);
  }

  const result = assembleScenarioSimulation(input);
  if (result) {
    memoCache.set(cacheKey, result);
    if (memoCache.size > 12) {
      const oldest = memoCache.keys().next().value;
      if (oldest) memoCache.delete(oldest);
    }
  }

  return result;
}
