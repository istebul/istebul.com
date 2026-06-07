/**
 * AI Decision Report v1 — deterministic report orchestrator (Sprint-19).
 * Combines Recommendation + Decision Coach + Decision Simulator outputs.
 */

import { runQualityEngine } from '../engine/quality-engine.js';
import { buildDecisionCoachInput, runDecisionCoach } from '../decision-coach/decision-coach.js';
import { buildDefaultScenario } from '../decision-simulator/scenario-builder.js';
import { buildSimulatorInput, runDecisionSimulator } from '../decision-simulator/simulator-engine.js';
import { buildExecutiveSummary } from './executive-summary.js';
import { buildRecommendationSection } from './recommendation-section.js';
import { buildCoachSection } from './coach-section.js';
import { buildSimulatorSection } from './simulator-section.js';
import { buildStrengthsSection } from './strengths-section.js';
import { buildWeaknessesSection } from './weaknesses-section.js';
import { buildRiskSection } from './risk-section.js';
import { buildVerificationSection } from './verification-section.js';
import { buildAlternativesSection } from './alternatives-section.js';
import { buildFinalDecisionSection, computeFinalConfidence } from './final-decision-section.js';

/** @type {Map<string, unknown>} */
const memoCache = new Map();

/**
 * Clear memoization cache (testing).
 */
export function clearDecisionReportMemoCache() {
  memoCache.clear();
}

/**
 * @param {Record<string, unknown>} input
 * @returns {string}
 */
export function buildReportCacheKey(input) {
  const id = String(input.recommendation?.id ?? '');
  const topIds = (Array.isArray(input.top_recommendations) ? input.top_recommendations : [])
    .map((item) => String(item.id ?? ''))
    .join(',');
  return `${id}:${topIds}:${JSON.stringify(input.user_intent ?? {})}`;
}

/**
 * @param {Record<string, unknown>} recommendation
 * @param {Record<string, unknown>} userIntent
 * @param {Array<Record<string, unknown>>} topRecommendations
 * @param {{ coach?: Record<string, unknown>, simulator?: Record<string, unknown> }} [precomputed]
 * @returns {Record<string, unknown>}
 */
export function buildReportInput(
  recommendation,
  userIntent = {},
  topRecommendations = [],
  precomputed = {}
) {
  const listing = /** @type {Record<string, unknown>} */ (recommendation?.listing ?? recommendation ?? {});
  const quality = recommendation?.id ? runQualityEngine(listing) : { missing_fields: [] };

  let coach = precomputed.coach ?? null;
  let simulator = precomputed.simulator ?? null;

  if (!coach && recommendation?.id) {
    const coachInput = buildDecisionCoachInput(userIntent, recommendation, topRecommendations);
    coach = runDecisionCoach(coachInput);
  }

  if (!simulator && recommendation?.id && coach) {
    const simInput = buildSimulatorInput(recommendation, coach, userIntent);
    simulator = runDecisionSimulator(simInput, buildDefaultScenario(userIntent));
  }

  return {
    recommendation,
    user_intent: userIntent,
    top_recommendations: topRecommendations,
    coach: coach ?? {},
    simulator: simulator ?? null,
    missing_fields: quality.missing_fields ?? []
  };
}

/**
 * @param {Record<string, unknown>} ctx
 * @returns {Record<string, unknown>}
 */
function assembleReport(ctx) {
  const strengths = buildStrengthsSection(ctx);
  const weaknesses = buildWeaknessesSection(ctx);
  const enriched = { ...ctx, strengths, weaknesses, final_confidence: 0 };

  const finalDecision = buildFinalDecisionSection(enriched);
  enriched.final_confidence = finalDecision.confidence;

  return {
    executive_summary: buildExecutiveSummary(enriched),
    recommendation: buildRecommendationSection(ctx.recommendation),
    decision_coach: buildCoachSection(ctx.coach),
    decision_simulator: buildSimulatorSection(ctx.simulator),
    strengths,
    weaknesses,
    risk_analysis: buildRiskSection(ctx),
    verification_checklist: buildVerificationSection(ctx),
    alternatives: buildAlternativesSection(ctx),
    final_decision: finalDecision,
    confidence: finalDecision.confidence,
    generated_at: new Date().toISOString()
  };
}

/**
 * @param {Record<string, unknown>} input
 * @param {{ skipCache?: boolean }} [options]
 * @returns {ReturnType<typeof assembleReport>}
 */
export function runDecisionReport(input, options = {}) {
  const cacheKey = buildReportCacheKey(input);
  if (!options.skipCache) {
    const cached = memoCache.get(cacheKey);
    if (cached) return /** @type {ReturnType<typeof runDecisionReport>} */ (cached);
  }

  if (!input?.recommendation?.id) {
    const empty = {
      executive_summary:
        'Mevcut bilgiler ışığında karar raporu üretilemedi. Öneri seçimi ve profil bilgilerini kontrol edin.',
      recommendation: buildRecommendationSection(null),
      decision_coach: buildCoachSection({}),
      decision_simulator: buildSimulatorSection(null),
      strengths: [],
      weaknesses: [],
      risk_analysis: buildRiskSection({ recommendation: {} }),
      verification_checklist: buildVerificationSection({ user_intent: input?.user_intent ?? {} }),
      alternatives: [],
      final_decision: { label: 'Önerilmez', confidence: 0, explanation: 'Rapor için yeterli veri yok.' },
      confidence: 0,
      generated_at: new Date().toISOString()
    };
    memoCache.set(cacheKey, empty);
    return empty;
  }

  const result = assembleReport(input);
  memoCache.set(cacheKey, result);
  if (memoCache.size > 20) {
    const oldest = memoCache.keys().next().value;
    if (oldest) memoCache.delete(oldest);
  }

  return result;
}

export { computeFinalConfidence };
