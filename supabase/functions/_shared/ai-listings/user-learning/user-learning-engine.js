/**
 * User Learning Engine — real usage signal aggregation (Sprint-30 / Faz B).
 * Does not mutate recommendation, decision, or quality scores.
 */

import { safeNumber } from '../engine/score-utils.js';

/** @type {Readonly<string[]>} */
export const LEARNING_EVENT_TYPES = Object.freeze([
  'recommendation_viewed',
  'report_viewed',
  'compare_viewed',
  'scenario_viewed',
  'decision_center_viewed',
  'feedback_submitted'
]);

/** @type {Readonly<Record<string, string>>} */
export const LEARNING_MODULE_LABELS = Object.freeze({
  recommendation: 'Öneri',
  report: 'Karar Raporu',
  compare: 'Karşılaştırma',
  scenario: 'Senaryo Simülasyonu',
  decision_center: 'Karar Merkezi',
  feedback: 'Geri Bildirim'
});

/** @type {Map<string, unknown>} */
const memoCache = new Map();

/**
 * Clear memoization cache (testing).
 */
export function clearUserLearningMemoCache() {
  memoCache.clear();
}

/**
 * @param {Array<Record<string, unknown>>} events
 * @returns {string}
 */
export function buildUserLearningCacheKey(events) {
  const count = Array.isArray(events) ? events.length : 0;
  const tail = count > 0 ? String(events[count - 1]?.timestamp ?? events[count - 1]?.created_at ?? '') : '';
  return `ul:${count}:${tail}`;
}

/**
 * @param {unknown} value
 * @returns {Record<string, unknown>|null}
 */
export function normalizeLearningEvent(value) {
  if (!value || typeof value !== 'object') return null;

  const event = /** @type {Record<string, unknown>} */ (value);
  const eventType = String(event.event_type ?? event.type ?? '').trim();
  if (!LEARNING_EVENT_TYPES.includes(eventType)) return null;

  return {
    event_type: eventType,
    module: String(event.module ?? resolveModuleFromEventType(eventType)),
    listing_id: String(event.listing_id ?? event.listingId ?? '').trim() || null,
    report_id: String(event.report_id ?? event.reportId ?? '').trim() || null,
    scenario_id: String(event.scenario_id ?? event.scenarioId ?? '').trim() || null,
    category: String(event.category ?? 'general').trim() || 'general',
    helpful: event.helpful === true || event.helpful === 'true' || event.helpful === 1,
    timestamp: String(event.timestamp ?? event.created_at ?? new Date().toISOString())
  };
}

/**
 * @param {string} eventType
 * @returns {string}
 */
export function resolveModuleFromEventType(eventType) {
  if (eventType === 'recommendation_viewed') return 'recommendation';
  if (eventType === 'report_viewed') return 'report';
  if (eventType === 'compare_viewed') return 'compare';
  if (eventType === 'scenario_viewed') return 'scenario';
  if (eventType === 'decision_center_viewed') return 'decision_center';
  if (eventType === 'feedback_submitted') return 'feedback';
  return 'unknown';
}

/**
 * @param {Array<Record<string, unknown>>} events
 * @returns {Array<Record<string, unknown>>}
 */
export function normalizeLearningEvents(events) {
  if (!Array.isArray(events)) return [];
  return events
    .map((event) => normalizeLearningEvent(event))
    .filter((event) => event !== null);
}

/**
 * @param {Array<Record<string, unknown>>} events
 * @returns {Record<string, number>}
 */
export function countEventsByModule(events) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const event of events) {
    const module = String(event.module ?? 'unknown');
    counts[module] = (counts[module] ?? 0) + 1;
  }
  return counts;
}

/**
 * @param {Array<Record<string, unknown>>} events
 * @returns {Array<{ report_id: string, count: number }>}
 */
export function rankReportViews(events) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const event of events) {
    if (event.event_type !== 'report_viewed') continue;
    const id = String(event.report_id ?? event.listing_id ?? 'unknown');
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([report_id, count]) => ({ report_id, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * @param {Array<Record<string, unknown>>} events
 * @returns {Array<{ scenario_id: string, count: number }>}
 */
export function rankScenarioRuns(events) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const event of events) {
    if (event.event_type !== 'scenario_viewed') continue;
    const id = String(event.scenario_id ?? event.listing_id ?? 'unknown');
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([scenario_id, count]) => ({ scenario_id, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * @param {Array<Record<string, unknown>>} events
 * @returns {{ helpful: number, total: number, rate: number }}
 */
export function computeHelpfulDecisionRate(events) {
  const feedbackEvents = events.filter((event) => event.event_type === 'feedback_submitted');
  const helpful = feedbackEvents.filter((event) => event.helpful === true).length;
  const total = feedbackEvents.length;
  const rate = total > 0 ? Math.round((helpful / total) * 100) : 0;
  return { helpful, total, rate };
}

/**
 * @param {Array<Record<string, unknown>>} events
 * @param {{ skipCache?: boolean }} [options]
 * @returns {Record<string, unknown>}
 */
export function runUserLearningEngine(events, options = {}) {
  const normalized = normalizeLearningEvents(events ?? []);
  const cacheKey = buildUserLearningCacheKey(normalized);

  if (!options.skipCache) {
    const cached = memoCache.get(cacheKey);
    if (cached) return /** @type {Record<string, unknown>} */ (cached);
  }

  const moduleCounts = countEventsByModule(normalized);
  const topModules = Object.entries(moduleCounts)
    .map(([module, count]) => ({
      module,
      label: LEARNING_MODULE_LABELS[module] ?? module,
      count
    }))
    .sort((a, b) => b.count - a.count);

  const topReports = rankReportViews(normalized).slice(0, 5);
  const topScenarios = rankScenarioRuns(normalized).slice(0, 5);
  const helpfulStats = computeHelpfulDecisionRate(normalized);

  const result = {
    eventCount: normalized.length,
    moduleCounts,
    topModules,
    topReports,
    topScenarios,
    helpfulStats,
    decisionCenterViews: safeNumber(moduleCounts.decision_center),
    totalFeedback: helpfulStats.total
  };

  memoCache.set(cacheKey, result);
  if (memoCache.size > 8) {
    const oldest = memoCache.keys().next().value;
    if (oldest) memoCache.delete(oldest);
  }

  return result;
}
