/**
 * Compare Intelligence v1 — deterministic orchestrator (Sprint-27).
 * Comparison layer only — does not modify any primary scores.
 */

import { safeNumber } from '../engine/score-utils.js';
import { extractPurchaseSignals } from '../purchase-decision/decision-strength-engine.js';
import { buildPurchaseDecisionInput, runPurchaseDecisionEngine } from '../purchase-decision/purchase-decision-engine.js';
import { buildOwnershipCostInput, runOwnershipCostSimulator } from '../ownership-cost/ownership-cost-engine.js';
import { buildExplainabilityInput, runExplainabilityEngine } from '../explainability/explainability-engine.js';
import { computeItemCompareScore, normalizeCostSignal, buildScoreComparison } from './compare-score-engine.js';
import { buildRanking, resolveWinner, buildWinnerReason, WINNER_GAP_THRESHOLD } from './compare-winner-engine.js';
import { buildRiskComparison } from './compare-risk-engine.js';
import { buildCostComparison } from './compare-cost-engine.js';
import {
  COMPARE_LEVEL_LABELS,
  computeCompareScore,
  computeDataQuality,
  buildCompareSummary,
  buildTradeoffs,
  buildCategoryNextSteps,
  resolveCompareLabel
} from './compare-summary.js';

/** @type {Map<string, unknown>} */
const memoCache = new Map();

/**
 * Clear memoization cache (testing).
 */
export function clearCompareMemoCache() {
  memoCache.clear();
}

/**
 * @param {string[]} ids
 * @param {Record<string, unknown>} userIntent
 * @returns {string}
 */
export function buildCompareCacheKey(ids, userIntent) {
  const sorted = [...ids].sort().join(',');
  return `cmp:${sorted}:${JSON.stringify(userIntent ?? {})}`;
}

/**
 * @param {Array<Record<string, unknown>>} recommendations
 * @param {Record<string, unknown>} [userIntent]
 * @returns {Record<string, unknown>}
 */
export function buildCompareInput(recommendations, userIntent = {}) {
  return {
    recommendations: Array.isArray(recommendations) ? recommendations : [],
    user_intent: userIntent,
    category: String(userIntent.category ?? recommendations[0]?.category ?? 'vehicle')
  };
}

/**
 * @param {Record<string, unknown>} recommendation
 * @param {Record<string, unknown>} userIntent
 * @param {number} maxCost
 * @returns {Record<string, unknown>}
 */
function buildComparedItemContext(recommendation, userIntent, maxCost) {
  const pdInput = buildPurchaseDecisionInput(recommendation, userIntent);
  const costInput = buildOwnershipCostInput(recommendation, userIntent);

  const ownershipCost = runOwnershipCostSimulator(costInput, { skipCache: true });
  if (ownershipCost) pdInput.ownership_cost = ownershipCost;

  const purchaseDecision = runPurchaseDecisionEngine(pdInput, { skipCache: true });
  const expInput = buildExplainabilityInput(recommendation, userIntent);
  if (ownershipCost) expInput.ownership_cost = ownershipCost;
  if (purchaseDecision) expInput.purchase_decision = purchaseDecision;
  const explainability = runExplainabilityEngine(expInput, { skipCache: true });

  const signals = extractPurchaseSignals(pdInput);

  const score = computeItemCompareScore(signals, purchaseDecision, explainability, ownershipCost, maxCost);

  /** @type {string[]} */
  const strengths = [];
  /** @type {string[]} */
  const weaknesses = [];

  const positives = Array.isArray(purchaseDecision?.positiveFactors) ? purchaseDecision.positiveFactors : [];
  const risks = Array.isArray(purchaseDecision?.riskFactors) ? purchaseDecision.riskFactors : [];
  strengths.push(...positives.slice(0, 2).map(String));
  weaknesses.push(...risks.slice(0, 2).map(String));

  if (Number(signals.qualityScore) >= 70) strengths.push('Kalite skoru güçlü');
  if (Number(signals.trustScore) >= 70) strengths.push('Güven skoru yüksek');
  if (Number(signals.missingCritical?.length ?? 0) >= 2) weaknesses.push('Eksik kritik bilgi');
  if (Number(signals.riskPenalty) >= 50) weaknesses.push('Yüksek risk sinyali');

  const costSignal = ownershipCost
    ? normalizeCostSignal(
        String(ownershipCost.cost_risk_level ?? ''),
        safeNumber(ownershipCost.total_cost),
        maxCost
      )
    : safeNumber(signals.ownershipCostSignal) || 50;

  return {
    id: String(recommendation.id ?? ''),
    title: String(recommendation.title ?? '—'),
    category: String(recommendation.category ?? userIntent.category ?? 'vehicle'),
    score,
    decisionScore: safeNumber(purchaseDecision?.decisionScore),
    recommendationScore: safeNumber(signals.recommendationScore),
    decisionLabel: String(purchaseDecision?.decisionLabel ?? '—'),
    confidenceLabel: String(purchaseDecision?.confidenceLabel ?? '—'),
    riskLabel: String(purchaseDecision?.riskLabel ?? '—'),
    qualityScore: safeNumber(signals.qualityScore),
    trustScore: safeNumber(signals.trustScore),
    costSignal: safeNumber(signals.ownershipCostSignal) || costSignal,
    negotiationSignal: safeNumber(signals.negotiationSignal),
    explanationScore: safeNumber(explainability?.explanationScore),
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
    _context: { signals, purchase_decision: purchaseDecision, ownership_cost: ownershipCost, explainability }
  };
}

/**
 * @param {Array<Record<string, unknown>>} items
 * @param {string} field
 * @param {string} label
 * @returns {Record<string, unknown>}
 */
function buildFieldComparison(items, field, label) {
  const values = items.map((item) => ({
    id: item.id,
    title: item.title,
    value: safeNumber(item[field])
  }));

  const best = values.reduce((a, b) => (b.value > a.value ? b : a), values[0] ?? {});
  const worst = values.reduce((a, b) => (b.value < a.value ? b : a), values[0] ?? {});

  return {
    field,
    label,
    items: values,
    bestId: best.id ?? null,
    worstId: worst.id ?? null,
    gap: safeNumber(best.value) - safeNumber(worst.value),
    summary: values.length >= 2
      ? `${label}: en yüksek "${best.title}" (${best.value}), en düşük "${worst.title}" (${worst.value}).`
      : `${label} karşılaştırması için yeterli veri yok.`
  };
}

/**
 * @param {Array<Record<string, unknown>>} items
 * @returns {Record<string, unknown>}
 */
function buildQualityTrustComparison(items) {
  const qtItems = items.map((item) => ({
    id: item.id,
    title: item.title,
    qualityScore: item.qualityScore,
    trustScore: item.trustScore,
    combined: Math.round((safeNumber(item.qualityScore) + safeNumber(item.trustScore)) / 2)
  }));

  const best = qtItems.reduce((a, b) => (b.combined > a.combined ? b : a), qtItems[0] ?? {});

  return {
    items: qtItems,
    bestId: best.id ?? null,
    summary: qtItems.length >= 2
      ? `Kalite ve güven açısından "${best.title}" öne çıkıyor (${best.combined} puan).`
      : 'Kalite/güven karşılaştırması için yeterli veri yok.'
  };
}

/**
 * @param {Array<Record<string, unknown>>} items
 * @returns {Record<string, unknown>}
 */
function buildPurchaseDecisionComparison(items) {
  const pdItems = items.map((item) => {
    const ctx = /** @type {Record<string, unknown>} */ (item._context ?? {});
    const pd = /** @type {Record<string, unknown>} */ (ctx.purchase_decision ?? {});
    return {
      id: item.id,
      title: item.title,
      decisionScore: safeNumber(pd.decisionScore),
      decisionLabel: String(pd.decisionLabel ?? '—'),
      confidenceScore: safeNumber(pd.confidenceScore),
      primaryAction: String(pd.primaryActionLabel ?? '—')
    };
  });

  const best = pdItems.reduce((a, b) => (b.decisionScore > a.decisionScore ? b : a), pdItems[0] ?? {});

  return {
    items: pdItems,
    bestId: best.id ?? null,
    summary: pdItems.length >= 2
      ? `Satın alma kararı açısından "${best.title}" en yüksek skora sahip (${best.decisionScore} puan, ${best.decisionLabel}).`
      : 'Karar karşılaştırması için yeterli veri yok.'
  };
}

/**
 * @param {Array<Record<string, unknown>>} items
 * @returns {Record<string, unknown>}
 */
function buildExplainabilityComparison(items) {
  return buildFieldComparison(items, 'explanationScore', 'Açıklanabilirlik');
}

/**
 * @param {Array<Record<string, unknown>>} items
 * @returns {Record<string, unknown>}
 */
function buildNegotiationComparison(items) {
  return buildFieldComparison(items, 'negotiationSignal', 'Pazarlık avantajı');
}

/**
 * @param {Record<string, unknown>} input
 * @returns {Record<string, unknown>|null}
 */
function assembleCompareIntelligence(input) {
  const recommendations = /** @type {Array<Record<string, unknown>>} */ (input.recommendations ?? []);
  const userIntent = /** @type {Record<string, unknown>} */ (input.user_intent ?? {});
  const category = String(input.category ?? 'vehicle');

  if (recommendations.length < 2) {
    return null;
  }

  const validRecs = recommendations.filter((r) => r?.id);
  if (validRecs.length < 2) return null;

  const maxCost = Math.max(
    ...validRecs.map((r) => {
      const costInput = buildOwnershipCostInput(r, userIntent);
      const cost = runOwnershipCostSimulator(costInput, { skipCache: true });
      return safeNumber(cost?.total_cost);
    }),
    1
  );

  const comparedItems = validRecs.map((rec) => buildComparedItemContext(rec, userIntent, maxCost));

  const dataQuality = computeDataQuality(comparedItems);
  const ranking = buildRanking(comparedItems);
  const { winner: winnerRank, gap, compareLevel: winnerLevel } = resolveWinner(ranking, dataQuality);
  const compareLevel = winnerLevel;
  const compareLabel = resolveCompareLabel(compareLevel);

  const winnerItem = winnerRank
    ? comparedItems.find((item) => item.id === winnerRank.id) ?? null
    : null;
  const runnerUp = ranking[1] ?? null;

  const scoreComparison = buildScoreComparison(comparedItems);
  const costComparison = buildCostComparison(comparedItems);
  const qualityTrustComparison = buildQualityTrustComparison(comparedItems);
  const negotiationComparison = buildNegotiationComparison(comparedItems);
  const purchaseDecisionComparison = buildPurchaseDecisionComparison(comparedItems);
  const riskComparison = buildRiskComparison(comparedItems);
  const explainabilityComparison = buildExplainabilityComparison(comparedItems);

  const tradeoffs = buildTradeoffs(comparedItems, scoreComparison, costComparison, riskComparison);
  const summary = buildCompareSummary(comparedItems, winnerItem, compareLevel, scoreComparison);
  const nextSteps = buildCategoryNextSteps(category).slice(0, 6);

  const publicItems = comparedItems.map(({ _context, ...rest }) => rest);

  return {
    compareScore: computeCompareScore(dataQuality, comparedItems.length),
    compareLevel,
    compareLabel,
    comparedItems: publicItems,
    winner: winnerItem ? { id: winnerItem.id, title: winnerItem.title, score: winnerItem.score } : null,
    winnerReason: buildWinnerReason(winnerRank, runnerUp, gap, compareLevel),
    ranking,
    scoreComparison,
    costComparison,
    qualityTrustComparison,
    negotiationComparison,
    purchaseDecisionComparison,
    riskComparison,
    explainabilityComparison,
    tradeoffs,
    summary,
    nextSteps,
    winnerGapThreshold: WINNER_GAP_THRESHOLD
  };
}

/**
 * @param {Record<string, unknown>} input
 * @param {{ skipCache?: boolean }} [options]
 * @returns {Record<string, unknown>|null}
 */
export function runCompareEngine(input, options = {}) {
  const recommendations = /** @type {Array<Record<string, unknown>>} */ (input?.recommendations ?? []);
  const ids = recommendations.map((r) => String(r?.id ?? '')).filter(Boolean);

  if (ids.length < 2) return null;

  const cacheKey = buildCompareCacheKey(ids, input.user_intent ?? {});

  if (!options.skipCache) {
    const cached = memoCache.get(cacheKey);
    if (cached) return /** @type {Record<string, unknown>} */ (cached);
  }

  const result = assembleCompareIntelligence(input);
  if (result) {
    memoCache.set(cacheKey, result);
    if (memoCache.size > 8) {
      const oldest = memoCache.keys().next().value;
      if (oldest) memoCache.delete(oldest);
    }
  }

  return result;
}

export { COMPARE_LEVEL_LABELS, WINNER_GAP_THRESHOLD };
