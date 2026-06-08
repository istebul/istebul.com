/**
 * Executive Decision Report v1 — deterministic orchestrator (Sprint-26).
 * Reporting / summarization layer only — does not modify any primary scores.
 */

import { safeNumber } from '../engine/score-utils.js';
import { extractPurchaseSignals } from '../purchase-decision/decision-strength-engine.js';
import { buildPurchaseDecisionInput, runPurchaseDecisionEngine } from '../purchase-decision/purchase-decision-engine.js';
import { buildOwnershipCostInput, runOwnershipCostSimulator } from '../ownership-cost/ownership-cost-engine.js';
import { buildExplainabilityInput, runExplainabilityEngine } from '../explainability/explainability-engine.js';
import {
  REPORT_LEVEL_LABELS,
  resolveReportLevel,
  computeReportScore,
  buildExecutiveSummary,
  buildDataLimitations,
  buildVerificationChecklist
} from './report-summary-engine.js';
import {
  buildRecommendationSection,
  buildOwnershipCostSection,
  buildQualityTrustSection,
  buildNegotiationSection,
  buildPurchaseDecisionSection,
  buildExplainabilitySection,
  buildDecisionSnapshot
} from './report-section-builder.js';
import { buildRiskSummary } from './report-risk-engine.js';
import { buildActionPlan } from './report-action-plan-engine.js';
import { buildPdfPayload } from './report-pdf-payload-builder.js';

/** @type {Map<string, unknown>} */
const memoCache = new Map();

/**
 * Clear memoization cache (testing).
 */
export function clearExecutiveReportMemoCache() {
  memoCache.clear();
}

/**
 * @param {Record<string, unknown>} recommendation
 * @param {Record<string, unknown>} userIntent
 * @returns {string}
 */
export function buildExecutiveReportCacheKey(recommendation, userIntent) {
  const id = String(recommendation?.id ?? '');
  return `edr:${id}:${JSON.stringify(userIntent ?? {})}`;
}

/**
 * @param {Record<string, unknown>} recommendation
 * @param {Record<string, unknown>} [userIntent]
 * @param {{ ownership_cost?: Record<string, unknown>, purchase_decision?: Record<string, unknown>, explainability?: Record<string, unknown> }} [precomputed]
 * @returns {Record<string, unknown>}
 */
export function buildExecutiveReportInput(recommendation, userIntent = {}, precomputed = {}) {
  const listing = /** @type {Record<string, unknown>} */ (recommendation?.listing ?? recommendation ?? {});
  const category = String(recommendation?.category ?? listing.category ?? userIntent.category ?? 'vehicle');

  return {
    recommendation,
    user_intent: userIntent,
    category,
    fit_score: safeNumber(recommendation?.fit_score ?? recommendation?.score),
    negotiation_intelligence: recommendation?.negotiation_intelligence ?? userIntent.negotiation_intelligence ?? null,
    listing_quality: recommendation?.listing_quality ?? userIntent.listing_quality ?? null,
    ownership_cost: precomputed.ownership_cost ?? recommendation?.ownership_cost ?? userIntent.ownership_cost ?? null,
    purchase_decision: precomputed.purchase_decision ?? recommendation?.purchase_decision ?? userIntent.purchase_decision ?? null,
    explainability: precomputed.explainability ?? recommendation?.explainability ?? userIntent.explainability ?? null
  };
}

/**
 * @param {Record<string, unknown>} input
 * @returns {Record<string, unknown>}
 */
function assembleExecutiveDecisionReport(input) {
  const recommendation = /** @type {Record<string, unknown>} */ (input.recommendation ?? {});
  const category = String(input.category ?? 'vehicle');

  const signals = extractPurchaseSignals(input);

  let ownershipCost = /** @type {Record<string, unknown>|null} */ (input.ownership_cost ?? null);
  if (!ownershipCost || ownershipCost.total_cost == null) {
    const costInput = buildOwnershipCostInput(recommendation, input.user_intent ?? {});
    ownershipCost = runOwnershipCostSimulator(costInput, { skipCache: true });
  }

  let purchaseDecision = /** @type {Record<string, unknown>|null} */ (input.purchase_decision ?? null);
  if (!purchaseDecision || purchaseDecision.decisionScore == null) {
    const pdInput = buildPurchaseDecisionInput(recommendation, input.user_intent ?? {});
    if (ownershipCost) {
      pdInput.ownership_cost = ownershipCost;
    }
    purchaseDecision = runPurchaseDecisionEngine(pdInput, { skipCache: true });
  }

  let explainability = /** @type {Record<string, unknown>|null} */ (input.explainability ?? null);
  if (!explainability || explainability.explanationScore == null) {
    const expInput = buildExplainabilityInput(recommendation, input.user_intent ?? {});
    if (ownershipCost) expInput.ownership_cost = ownershipCost;
    if (purchaseDecision) expInput.purchase_decision = purchaseDecision;
    explainability = runExplainabilityEngine(expInput, { skipCache: true });
  }

  const recommendationSection = buildRecommendationSection(recommendation);
  const ownershipCostSection = buildOwnershipCostSection(ownershipCost);
  const qualityTrustSection = buildQualityTrustSection(signals);
  const negotiationSection = buildNegotiationSection(signals, purchaseDecision);
  const purchaseDecisionSection = buildPurchaseDecisionSection(purchaseDecision);
  const explainabilitySection = buildExplainabilitySection(explainability);

  const sections = [
    recommendationSection,
    ownershipCostSection,
    qualityTrustSection,
    negotiationSection,
    purchaseDecisionSection,
    explainabilitySection
  ];

  const ctx = {
    recommendation,
    signals,
    purchase_decision: purchaseDecision,
    explainability,
    ownership_cost: ownershipCost,
    sections,
    category
  };

  const reportScore = computeReportScore(ctx);
  const reportLevel = resolveReportLevel(reportScore);
  const reportLabel = REPORT_LEVEL_LABELS[reportLevel];

  ctx.reportLevel = reportLevel;
  ctx.reportScore = reportScore;

  const executiveSummary = buildExecutiveSummary(ctx);
  const decisionSnapshot = buildDecisionSnapshot(ctx);
  const riskSummary = buildRiskSummary(signals, purchaseDecision, ownershipCost);
  const actionPlan = buildActionPlan(category, signals, purchaseDecision);
  const dataLimitations = buildDataLimitations(signals, explainability ?? {});
  const verificationChecklist = buildVerificationChecklist(category, signals);

  const executiveDecisionReport = {
    reportScore,
    reportLevel,
    reportLabel,
    executiveSummary,
    decisionSnapshot,
    recommendationSection,
    ownershipCostSection,
    qualityTrustSection,
    negotiationSection,
    purchaseDecisionSection,
    explainabilitySection,
    riskSummary,
    actionPlan,
    dataLimitations,
    verificationChecklist,
    category,
    pdfPayload: null
  };

  executiveDecisionReport.pdfPayload = buildPdfPayload(executiveDecisionReport);

  return executiveDecisionReport;
}

/**
 * @param {Record<string, unknown>} input
 * @param {{ skipCache?: boolean }} [options]
 * @returns {Record<string, unknown>|null}
 */
export function runExecutiveReportEngine(input, options = {}) {
  const recommendation = /** @type {Record<string, unknown>} */ (input?.recommendation ?? {});
  const id = String(recommendation?.id ?? '');

  if (!id && !safeNumber(recommendation?.fit_score ?? recommendation?.score)) {
    return null;
  }

  const cacheKey = buildExecutiveReportCacheKey(recommendation, input.user_intent ?? {});

  if (!options.skipCache) {
    const cached = memoCache.get(cacheKey);
    if (cached) return /** @type {Record<string, unknown>} */ (cached);
  }

  const result = assembleExecutiveDecisionReport(input);
  memoCache.set(cacheKey, result);

  if (memoCache.size > 8) {
    const oldest = memoCache.keys().next().value;
    if (oldest) memoCache.delete(oldest);
  }

  return result;
}
