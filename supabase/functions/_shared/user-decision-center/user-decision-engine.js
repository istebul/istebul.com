/**
 * User Decision Center — orchestrator (Sprint-30).
 * Reuses existing AI engines without mutating primary scores.
 */

import { safeNumber } from '../ai-listings/engine/score-utils.js';
import {
  buildPurchaseDecisionInput,
  runPurchaseDecisionEngine,
  clearPurchaseDecisionMemoCache
} from '../ai-listings/purchase-decision/purchase-decision-engine.js';
import {
  buildExplainabilityInput,
  runExplainabilityEngine,
  clearExplainabilityMemoCache
} from '../ai-listings/explainability/explainability-engine.js';
import {
  buildOwnershipCostInput,
  runOwnershipCostSimulator,
  clearOwnershipCostMemoCache
} from '../ai-listings/ownership-cost/ownership-cost-engine.js';
import {
  buildScenarioInput,
  runScenarioSimulator,
  clearScenarioSimulatorMemoCache
} from '../ai-listings/scenario-simulator/scenario-simulator-engine.js';
import { RISK_LEVEL_LABELS } from '../ai-listings/purchase-decision/decision-summary.js';

/** @type {Map<string, unknown>} */
const contextMemoCache = new Map();

export const USER_DECISION_EMPTY_MESSAGE = 'Bu ilan için karar analizi henüz hazır değil.';

export const USER_DECISION_FORBIDDEN_PHRASES = Object.freeze([
  'kesin al',
  'garanti kazanç',
  'kaçırılmaz fırsat',
  'mutlaka al',
  'garantili getiri'
]);

/**
 * Clear all memo caches used by user decision center.
 */
export function clearUserDecisionMemoCache() {
  contextMemoCache.clear();
  clearPurchaseDecisionMemoCache();
  clearExplainabilityMemoCache();
  clearOwnershipCostMemoCache();
  clearScenarioSimulatorMemoCache();
}

/**
 * @param {Record<string, unknown>} listing
 * @param {Record<string, unknown>} [userIntent]
 * @returns {Record<string, unknown>}
 */
export function buildListingRecommendationInput(listing, userIntent = {}) {
  const analysis = /** @type {Record<string, unknown>} */ (listing.latest_analysis ?? {});
  const category = String(listing.category ?? userIntent.category ?? 'vehicle');
  const fitScore = safeNumber(
    listing.fit_score ?? listing.score ?? analysis.decision_score ?? analysis.ai_score
  );

  return {
    id: String(listing.id ?? ''),
    category,
    title: String(listing.title ?? 'İlan'),
    price: safeNumber(listing.price),
    location: String(listing.location ?? ''),
    fit_score: fitScore || 50,
    quality_score: safeNumber(analysis.quality_score),
    risk_score: safeNumber(analysis.risk_score),
    trust_score: safeNumber(analysis.trust_score),
    listing,
    latest_analysis: analysis
  };
}

/**
 * @param {Record<string, unknown>} listing
 * @param {Record<string, unknown>} [userIntent]
 * @returns {string}
 */
export function buildUserDecisionCacheKey(listing, userIntent = {}) {
  const id = String(listing?.id ?? '');
  return `udc:${id}:${JSON.stringify(userIntent ?? {})}`;
}

/**
 * @param {string} text
 * @returns {string}
 */
export function sanitizeUserDecisionText(text = '') {
  let out = String(text ?? '');
  for (const phrase of USER_DECISION_FORBIDDEN_PHRASES) {
    const re = new RegExp(phrase, 'gi');
    out = out.replace(re, '');
  }
  return out.trim();
}

/**
 * @param {Record<string, unknown>} listing
 * @param {Record<string, unknown>} [userIntent]
 * @param {{ skipCache?: boolean, lazyScenario?: boolean }} [options]
 * @returns {Record<string, unknown>}
 */
export function resolveUserDecisionContext(listing, userIntent = {}, options = {}) {
  const cacheKey = buildUserDecisionCacheKey(listing, userIntent);

  if (!options.skipCache) {
    const cached = contextMemoCache.get(cacheKey);
    if (cached) return /** @type {Record<string, unknown>} */ (cached);
  }

  const recommendation = buildListingRecommendationInput(listing, userIntent);
  const hasData =
    Boolean(recommendation.id) &&
    safeNumber(listing.price ?? recommendation.price) > 0 &&
    safeNumber(recommendation.fit_score) > 0;

  /** @type {Record<string, unknown>} */
  const ctx = {
    listing,
    recommendation,
    ready: false,
    emptyMessage: USER_DECISION_EMPTY_MESSAGE,
    decisionScore: null,
    confidenceScore: null,
    confidenceLevel: null,
    riskLevel: null,
    riskLabel: null,
    qualityScore: null,
    trustScore: null,
    explanationScore: null,
    decisionLabel: null,
    decisionSummary: null,
    ownershipCost: null,
    totalCostSummary: null,
    purchaseDecision: null,
    explainability: null,
    scenario: null,
    checklist: [],
    limitedData: !listing?.title || !listing?.price
  };

  if (!hasData) {
    if (!options.skipCache) contextMemoCache.set(cacheKey, ctx);
    return ctx;
  }

  try {
    const pdInput = buildPurchaseDecisionInput(recommendation, userIntent);
    const costInput = buildOwnershipCostInput(recommendation, userIntent);
    const ownershipCost = runOwnershipCostSimulator(costInput, { skipCache: options.skipCache });
    if (ownershipCost) pdInput.ownership_cost = ownershipCost;

    const purchaseDecision = runPurchaseDecisionEngine(pdInput, { skipCache: options.skipCache });
    const expInput = buildExplainabilityInput(recommendation, userIntent);
    if (ownershipCost) expInput.ownership_cost = ownershipCost;
    if (purchaseDecision) expInput.purchase_decision = purchaseDecision;
    const explainability = runExplainabilityEngine(expInput, { skipCache: options.skipCache });

    let scenario = null;
    if (!options.lazyScenario) {
      const scenarioInput = buildScenarioInput(recommendation, userIntent);
      scenario = runScenarioSimulator(scenarioInput, { skipCache: options.skipCache });
    }

    const qualityScore = safeNumber(
      explainability?.decisionSnapshot?.qualityScore ??
        recommendation.quality_score ??
        listing.latest_analysis?.quality_score
    );
    const trustScore = safeNumber(
      explainability?.decisionSnapshot?.trustScore ?? recommendation.trust_score
    );

    ctx.ready = Boolean(purchaseDecision?.decisionScore != null);
    ctx.decisionScore = purchaseDecision?.decisionScore ?? null;
    ctx.confidenceScore = purchaseDecision?.confidenceScore ?? null;
    ctx.confidenceLevel = purchaseDecision?.confidenceLevel ?? null;
    ctx.riskLevel = purchaseDecision?.riskLevel ?? null;
    ctx.riskLabel = RISK_LEVEL_LABELS[String(purchaseDecision?.riskLevel)] ?? null;
    ctx.qualityScore = qualityScore || null;
    ctx.trustScore = trustScore || null;
    ctx.explanationScore = explainability?.explanationScore ?? null;
    ctx.decisionLabel = purchaseDecision?.decisionLabel ?? null;
    ctx.decisionSummary = sanitizeUserDecisionText(
      String(purchaseDecision?.summary ?? explainability?.userFriendlyExplanation ?? '')
    );
    ctx.ownershipCost = ownershipCost;
    ctx.totalCostSummary = ownershipCost?.total_cost != null
      ? {
          total: ownershipCost.total_cost,
          annual: ownershipCost.annual_cost,
          label: ownershipCost.cost_label ?? 'Toplam maliyet tahmini'
        }
      : null;
    ctx.purchaseDecision = purchaseDecision;
    ctx.explainability = explainability;
    ctx.scenario = scenario;
    ctx.checklist = buildDecisionChecklistItems(purchaseDecision, explainability, ownershipCost);
  } catch {
    ctx.limitedData = true;
  }

  if (!options.skipCache) {
    if (contextMemoCache.size >= 8) {
      const firstKey = contextMemoCache.keys().next().value;
      if (firstKey) contextMemoCache.delete(firstKey);
    }
    contextMemoCache.set(cacheKey, ctx);
  }

  return ctx;
}

/**
 * Lazy scenario compute — separate from main context for on-demand loading.
 * @param {Record<string, unknown>} ctx
 * @param {Record<string, unknown>} [userIntent]
 * @param {{ skipCache?: boolean }} [options]
 * @returns {Record<string, unknown>|null}
 */
export function resolveUserDecisionScenario(ctx, userIntent = {}, options = {}) {
  const recommendation = /** @type {Record<string, unknown>} */ (ctx?.recommendation ?? {});
  if (!recommendation?.id) return null;
  const scenarioInput = buildScenarioInput(recommendation, userIntent);
  const scenario = runScenarioSimulator(scenarioInput, { skipCache: options.skipCache });
  if (ctx && typeof ctx === 'object') ctx.scenario = scenario;
  return scenario;
}

/**
 * @param {Record<string, unknown>|null} purchaseDecision
 * @param {Record<string, unknown>|null} explainability
 * @param {Record<string, unknown>|null} ownershipCost
 * @returns {Array<Record<string, unknown>>}
 */
export function buildDecisionChecklistItems(purchaseDecision, explainability, ownershipCost) {
  /** @type {Array<Record<string, unknown>>} */
  const items = [];

  if (purchaseDecision?.decisionScore != null) {
    items.push({
      id: 'decision_score',
      label: 'Karar skoru incelendi',
      done: true,
      note: `Tahmini skor: ${purchaseDecision.decisionScore}`
    });
  }

  if (ownershipCost?.total_cost != null) {
    items.push({
      id: 'ownership_cost',
      label: 'Toplam maliyet simülasyonu gözden geçirildi',
      done: true,
      note: 'Dönemsel maliyet tahmini mevcut'
    });
  } else {
    items.push({
      id: 'ownership_cost',
      label: 'Toplam maliyet verisini doğrulayın',
      done: false,
      note: 'Maliyet simülasyonu sınırlı'
    });
  }

  const verificationSteps = Array.isArray(explainability?.verificationSteps)
    ? explainability.verificationSteps
    : [];
  for (const step of verificationSteps.slice(0, 3)) {
    items.push({
      id: `verify_${items.length}`,
      label: String(step),
      done: false,
      note: 'Doğrulama önerisi'
    });
  }

  const nextSteps = Array.isArray(purchaseDecision?.nextSteps) ? purchaseDecision.nextSteps : [];
  for (const step of nextSteps.slice(0, 2)) {
    items.push({
      id: `next_${items.length}`,
      label: String(step),
      done: false,
      note: 'Sonraki adım'
    });
  }

  return items.slice(0, 8);
}

/**
 * @param {Record<string, unknown>} recommendation
 * @returns {{ fit_score: number, quality_score: number, decisionScore: number, explanationScore: number }}
 */
export function snapshotPrimaryScores(recommendation) {
  return {
    fit_score: safeNumber(recommendation.fit_score),
    quality_score: safeNumber(recommendation.quality_score),
    decisionScore: safeNumber(recommendation.decisionScore),
    explanationScore: safeNumber(recommendation.explanationScore)
  };
}
