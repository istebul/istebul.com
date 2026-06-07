/**
 * AI Decision Flow — end-to-end runner (Sprint-20 QA).
 */

import { runRecommendationEngine } from '../ai-recommendation-engine/index.js';
import { buildDecisionCoachInput, runDecisionCoach, clearDecisionCoachMemoCache } from '../ai-decision-coach/index.js';
import { buildDefaultScenario, buildSimulatorInput, runDecisionSimulator, clearDecisionSimulatorMemoCache } from '../ai-decision-simulator/index.js';
import { buildReportInput, runDecisionReport, clearDecisionReportMemoCache } from '../ai-decision-report/index.js';
import { escapeHtml } from '../core/dom-safe.js';
import { checkDecisionFlowConsistency } from './consistency-checker.js';
import { buildCalibrationSummary } from './calibration-summary.js';

/**
 * @param {unknown} value
 * @returns {string}
 */
function safe(value) {
  return escapeHtml(String(value ?? ''));
}

/** @type {Map<string, unknown>} */
const memoCache = new Map();

/**
 * Clear memoization cache (testing).
 */
export function clearDecisionFlowMemoCache() {
  memoCache.clear();
  clearDecisionCoachMemoCache();
  clearDecisionSimulatorMemoCache();
  clearDecisionReportMemoCache();
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @param {Record<string, unknown>} profile
 * @param {string} [selectedId]
 * @returns {string}
 */
export function buildDecisionFlowCacheKey(listings, profile, selectedId = '') {
  const first = String(listings[0]?.id ?? '');
  const last = String(listings[listings.length - 1]?.id ?? '');
  return `${listings.length}:${first}:${last}:${selectedId}:${JSON.stringify(profile ?? {})}`;
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @param {Record<string, unknown>} profile
 * @param {{ selectedId?: string, scenario?: Record<string, unknown>, skipCache?: boolean }} [options]
 * @returns {{
 *   recommendation: Record<string, unknown>|null,
 *   coach: Record<string, unknown>|null,
 *   simulator: Record<string, unknown>|null,
 *   report: Record<string, unknown>|null,
 *   calibration: ReturnType<typeof buildCalibrationSummary>,
 *   checks: Array<{ id: string, passed: boolean, message: string }>,
 *   top_recommendations: Array<Record<string, unknown>>
 * }}
 */
export function runDecisionFlow(listings, profile = {}, options = {}) {
  const selectedId = options.selectedId ?? '';
  const cacheKey = buildDecisionFlowCacheKey(listings, profile, selectedId);

  if (!options.skipCache) {
    const cached = memoCache.get(cacheKey);
    if (cached) return /** @type {ReturnType<typeof runDecisionFlow>} */ (cached);
  }

  if (!Array.isArray(listings) || !listings.length) {
    const empty = {
      recommendation: null,
      coach: null,
      simulator: null,
      report: runDecisionReport({ recommendation: null, user_intent: profile, top_recommendations: [] }),
      calibration: buildCalibrationSummary({
        checks: [{ id: 'has_recommendation', passed: false, message: 'Kayıt yok' }],
        warnings: ['Boş repository için güvenli fallback uygulandı']
      }),
      checks: [{ id: 'has_recommendation', passed: false, message: 'Kayıt yok' }],
      top_recommendations: []
    };
    memoCache.set(cacheKey, empty);
    return empty;
  }

  const recResult = runRecommendationEngine(listings, profile);
  const top = recResult.top ?? [];
  const selected =
    (selectedId ? top.find((item) => String(item.id) === String(selectedId)) : null) ?? top[0] ?? null;

  if (!selected) {
    const fallback = {
      recommendation: null,
      coach: null,
      simulator: null,
      report: runDecisionReport({ recommendation: null, user_intent: profile, top_recommendations: top }),
      calibration: buildCalibrationSummary({
        checks: [{ id: 'has_recommendation', passed: false, message: 'Öneri yok' }],
        warnings: ['Profil için öneri üretilemedi']
      }),
      checks: [{ id: 'has_recommendation', passed: false, message: 'Öneri yok' }],
      top_recommendations: top
    };
    memoCache.set(cacheKey, fallback);
    return fallback;
  }

  const coachInput = buildDecisionCoachInput(profile, selected, top);
  const coach = runDecisionCoach(coachInput);
  const scenario = { ...buildDefaultScenario(profile), ...options.scenario };
  const simInput = buildSimulatorInput(selected, coach, profile);
  const simulator = runDecisionSimulator(simInput, scenario);
  const reportInput = buildReportInput(selected, profile, top, { coach, simulator });
  const report = runDecisionReport(reportInput);

  const { checks, warnings } = checkDecisionFlowConsistency({
    recommendation: selected,
    coach,
    simulator,
    report,
    profile
  });

  const calibration = buildCalibrationSummary({ checks, warnings });

  const result = {
    recommendation: selected,
    coach,
    simulator,
    report,
    calibration,
    checks,
    top_recommendations: top
  };

  memoCache.set(cacheKey, result);
  if (memoCache.size > 15) {
    const oldest = memoCache.keys().next().value;
    if (oldest) memoCache.delete(oldest);
  }

  return result;
}

/**
 * @param {ReturnType<typeof buildCalibrationSummary>} calibration
 * @returns {string}
 */
export function buildCalibrationBlockHtml(calibration) {
  const align = calibration.alignment ?? {};
  const warnHtml =
    calibration.warnings?.length > 0
      ? `<ul class="ai-flow-cal__warnings">${calibration.warnings
          .map((w) => `<li>${safe(w)}</li>`)
          .join('')}</ul>`
      : '';

  const dot = (ok) => (ok ? '✓' : '⚠');
  const scoreClass =
    calibration.consistency_score >= 80
      ? 'ai-flow-cal__score--high'
      : calibration.consistency_score >= 55
        ? 'ai-flow-cal__score--mid'
        : 'ai-flow-cal__score--low';

  return `
    <section class="ai-flow-cal" aria-label="Karar Tutarlılığı">
      <header class="ai-flow-cal__head">
        <h3>Karar Tutarlılığı</h3>
        <span class="ai-flow-cal__score ${scoreClass}">${safe(calibration.consistency_score)}</span>
      </header>
      <p class="ai-flow-cal__status">${safe(calibration.status)}</p>
      <div class="ai-flow-cal__alignment">
        <span>${dot(align.recommendation)} Recommendation</span>
        <span>${dot(align.coach)} Coach</span>
        <span>${dot(align.simulator)} Simulator</span>
        <span>${dot(align.report)} Report</span>
      </div>
      <p class="ai-flow-cal__summary">${safe(calibration.summary)}</p>
      ${warnHtml}
    </section>`;
}
