/**
 * AI Decision Simulator v1 — deterministic scenario simulation (Sprint-18).
 * Runs on recommendation + decision coach; lazy compute per selected item.
 */

import { clampScore } from '../engine/score-utils.js';
import { computeFitScore, getRecommendationLabel } from '../recommendation/fit-score-engine.js';
import {
  buildDefaultScenario,
  buildScenarioProfile,
  describeScenarioChanges
} from './scenario-builder.js';
import {
  computeFitDelta,
  computeSubscoreDelta,
  classifyDeltaDirection
} from './delta-engine.js';
import { buildSimulationExplanation } from './explanation-engine.js';
import {
  buildSimulatorSummary,
  buildSimulatorRecommendation
} from './simulator-summary.js';

/** @type {Map<string, unknown>} */
const memoCache = new Map();

/**
 * Clear memoization cache (testing).
 */
export function clearDecisionSimulatorMemoCache() {
  memoCache.clear();
}

/**
 * @param {Record<string, unknown>} input
 * @param {Record<string, unknown>} scenario
 * @returns {string}
 */
export function buildSimulatorCacheKey(input, scenario) {
  const id = String(input.recommendation?.id ?? '');
  return `${id}:${JSON.stringify(input.user_intent ?? {})}:${JSON.stringify(scenario ?? {})}`;
}

/**
 * @param {Record<string, unknown>} recommendation
 * @param {Record<string, unknown>} decisionCoach
 * @param {Record<string, unknown>} userIntent
 * @returns {Record<string, unknown>}
 */
export function buildSimulatorInput(recommendation, decisionCoach = {}, userIntent = {}) {
  return {
    recommendation: recommendation ?? null,
    decision_coach: decisionCoach ?? {},
    user_intent: userIntent ?? {},
    fit_score: recommendation?.fit_score ?? null,
    quality_score: recommendation?.quality_score ?? null,
    risk_score: recommendation?.risk_score ?? null,
    executive_label: recommendation?.executive_label ?? null,
    price_intelligence: recommendation?.price_intelligence ?? null,
    market_intelligence: recommendation?.market_intelligence ?? null
  };
}

/**
 * @param {Record<string, unknown>} input
 * @param {Record<string, unknown>} oldSubscores
 * @param {Record<string, unknown>} newSubscores
 * @param {number} delta
 * @returns {number}
 */
export function computeSimulatorConfidence(input, oldSubscores, newSubscores, delta) {
  const quality = Number(input.quality_score ?? input.recommendation?.quality_score ?? 50);
  const risk = Number(input.risk_score ?? input.recommendation?.risk_score ?? 50);
  const coachConf = Number(input.decision_coach?.confidence ?? 50);
  const magnitude = Math.min(30, Math.abs(delta) * 2);
  const stability = 100 - magnitude;

  let confidence = 25;
  confidence += quality * 0.15;
  confidence += (100 - risk) * 0.1;
  confidence += coachConf * 0.2;
  confidence += stability * 0.2;

  const changedCount = Object.keys(oldSubscores).filter((key) => {
    const diff = Number(newSubscores[key] ?? 0) - Number(oldSubscores[key] ?? 0);
    return Math.abs(diff) >= 3;
  }).length;
  confidence += Math.min(15, changedCount * 4);

  return clampScore(Math.round(confidence));
}

/**
 * @param {Record<string, unknown>} input
 * @param {Record<string, unknown>} [scenario]
 * @param {{ skipCache?: boolean }} [options]
 * @returns {{
 *   old_label: string,
 *   new_label: string,
 *   old_fit_score: number,
 *   new_fit_score: number,
 *   delta: number,
 *   positive_reasons: string[],
 *   negative_reasons: string[],
 *   recommendation: string,
 *   confidence: number,
 *   explanation: string,
 *   summary: string,
 *   scenario: Record<string, unknown>,
 *   scenario_changes: string[],
 *   direction: 'improved'|'worsened'|'unchanged'
 * }}
 */
export function runDecisionSimulator(input, scenario = {}, options = {}) {
  const resolvedScenario = { ...buildDefaultScenario(input.user_intent), ...scenario };
  const cacheKey = buildSimulatorCacheKey(input, resolvedScenario);

  if (!options.skipCache) {
    const cached = memoCache.get(cacheKey);
    if (cached) return /** @type {ReturnType<typeof runDecisionSimulator>} */ (cached);
  }

  if (!input?.recommendation?.id) {
    const empty = {
      old_label: '—',
      new_label: '—',
      old_fit_score: 0,
      new_fit_score: 0,
      delta: 0,
      positive_reasons: [],
      negative_reasons: [],
      recommendation: 'Simülasyon için seçili öneri bulunamadı.',
      confidence: 0,
      explanation: 'Senaryo simülasyonu için öneri seçimi gerekir.',
      summary: 'Mevcut bilgiler ışığında simülasyon üretilemedi.',
      scenario: resolvedScenario,
      scenario_changes: [],
      direction: /** @type {'unchanged'} */ ('unchanged')
    };
    memoCache.set(cacheKey, empty);
    return empty;
  }

  const recommendation = input.recommendation;
  const listing = /** @type {Record<string, unknown>} */ (recommendation.listing ?? recommendation);
  const record = { ...recommendation };
  const baseProfile = input.user_intent ?? {};
  const newProfile = buildScenarioProfile(baseProfile, resolvedScenario);

  const intelOverrides = {
    price_fit: Number(recommendation.subscores?.price_fit ?? 50),
    market_fit: Number(recommendation.subscores?.market_fit ?? 50)
  };

  const oldFit = Number(recommendation.fit_score ?? 0);
  const oldLabel = String(recommendation.recommendation_label ?? getRecommendationLabel(oldFit));
  const oldSubscores = /** @type {Record<string, number>} */ (recommendation.subscores ?? {});

  const newFitResult = computeFitScore(record, listing, newProfile, intelOverrides);
  const newFit = newFitResult.fit_score;
  const newLabel = newFitResult.recommendation_label;
  const newSubscores = newFitResult.subscores;

  const delta = computeFitDelta(oldFit, newFit);
  const subscoreDelta = computeSubscoreDelta(oldSubscores, newSubscores);
  const direction = classifyDeltaDirection(delta);
  const scenarioChanges = describeScenarioChanges(baseProfile, resolvedScenario);

  const result = {
    old_label: oldLabel,
    new_label: newLabel,
    old_fit_score: oldFit,
    new_fit_score: newFit,
    delta,
    positive_reasons: subscoreDelta.positive_reasons,
    negative_reasons: subscoreDelta.negative_reasons,
    recommendation: buildSimulatorRecommendation(newLabel, direction),
    confidence: computeSimulatorConfidence(input, oldSubscores, newSubscores, delta),
    explanation: buildSimulationExplanation(subscoreDelta, scenarioChanges),
    summary: buildSimulatorSummary(direction, delta),
    scenario: resolvedScenario,
    scenario_changes: scenarioChanges,
    direction
  };

  memoCache.set(cacheKey, result);
  if (memoCache.size > 30) {
    const oldest = memoCache.keys().next().value;
    if (oldest) memoCache.delete(oldest);
  }

  return result;
}
