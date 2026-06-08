/**
 * Ownership Cost Simulator v1 — deterministic cost orchestrator (Sprint-21).
 */

import { clampScore, safeNumber } from '../engine/score-utils.js';
import { computeVehicleOwnershipCosts } from './vehicle-cost-model.js';
import { computeHousingOwnershipCosts } from './housing-cost-model.js';
import { computeTravelOwnershipCosts } from './travel-cost-model.js';
import { buildCostBreakdown } from './cost-breakdown.js';
import {
  buildCostAssumptions,
  buildCostWarnings,
  buildCostSummaryText,
  classifyCostRiskLevel
} from './cost-summary.js';

/** @type {Map<string, unknown>} */
const memoCache = new Map();

/**
 * Clear memoization cache (testing).
 */
export function clearOwnershipCostMemoCache() {
  memoCache.clear();
}

/**
 * @param {Record<string, unknown>} recommendation
 * @param {Record<string, unknown>} userIntent
 * @returns {string}
 */
export function buildOwnershipCostCacheKey(recommendation, userIntent) {
  const id = String(recommendation?.id ?? '');
  return `${id}:${JSON.stringify(userIntent ?? {})}`;
}

/**
 * @param {Record<string, unknown>} recommendation
 * @param {Record<string, unknown>} [userIntent]
 * @returns {Record<string, unknown>}
 */
export function buildOwnershipCostInput(recommendation, userIntent = {}) {
  const listing = /** @type {Record<string, unknown>} */ (recommendation?.listing ?? recommendation ?? {});
  const category = String(recommendation?.category ?? listing.category ?? userIntent.category ?? 'vehicle');

  return {
    recommendation,
    user_intent: userIntent,
    listing_price: safeNumber(recommendation?.price ?? listing.price),
    category,
    city: String(userIntent.city ?? listing.location ?? ''),
    annual_km: safeNumber(userIntent.annual_km) || 15000,
    usage_type: String(userIntent.usage_type ?? 'family'),
    ownership_period: safeNumber(userIntent.ownership_period) || (category.includes('vacation') || category === 'travel' || category === 'tatil' ? 7 : category.includes('housing') || category === 'real_estate' ? 10 : 5),
    family_size: safeNumber(userIntent.family_size) || 4,
    risk_score: safeNumber(recommendation?.risk_score ?? listing.latest_analysis?.risk_score),
    quality_score: safeNumber(recommendation?.quality_score ?? listing.latest_analysis?.quality_score),
    price_intelligence: recommendation?.price_intelligence ?? listing.price_intelligence ?? null,
    market_intelligence: recommendation?.market_intelligence ?? listing.market_intelligence ?? null
  };
}

/**
 * @param {Record<string, unknown>} input
 * @returns {number}
 */
export function computeOwnershipCostConfidence(input) {
  const quality = safeNumber(input.quality_score) || 50;
  const risk = safeNumber(input.risk_score) || 50;
  const hasPrice = safeNumber(input.listing_price) > 0;
  const hasCity = Boolean(String(input.city ?? '').trim());
  const hasIntel = Boolean(input.price_intelligence || input.market_intelligence);

  let confidence = 20;
  confidence += quality * 0.2;
  confidence += (100 - risk) * 0.15;
  if (hasPrice) confidence += 20;
  if (hasCity) confidence += 8;
  if (hasIntel) confidence += 12;

  return clampScore(Math.round(confidence));
}

/**
 * @param {'vehicle'|'housing'|'travel'|string} category
 * @param {Record<string, unknown>} input
 * @returns {{ model: Record<string, unknown>, total: number, annual: number, months: number }}
 */
function resolveCategoryModel(category, input) {
  const cat = String(category ?? 'vehicle').toLowerCase();

  if (cat === 'housing' || cat === 'real_estate' || cat === 'konut') {
    const model = computeHousingOwnershipCosts(input);
    const years = Number(model.years) || 10;
    return {
      model,
      total: model.total_ownership,
      annual: Math.round(model.total_ownership / years),
      months: years * 12
    };
  }

  if (cat === 'vacation' || cat === 'travel' || cat === 'tatil') {
    const model = computeTravelOwnershipCosts(input);
    const days = Number(model.days) || 7;
    return {
      model,
      total: model.total_trip,
      annual: model.total_trip,
      months: days
    };
  }

  const model = computeVehicleOwnershipCosts(input);
  const years = Number(model.years) || 5;
  return {
    model,
    total: model.total_ownership,
    annual: Math.round(model.total_ownership / years),
    months: years * 12
  };
}

/**
 * @param {Record<string, unknown>} input
 * @param {{ skipCache?: boolean }} [options]
 * @returns {{
 *   total_cost: number,
 *   monthly_estimate: number,
 *   annual_estimate: number,
 *   cost_breakdown: Array<{ key: string, label: string, amount: number, period: string }>,
 *   cost_risk_level: 'low'|'medium'|'high',
 *   cost_summary: string,
 *   assumptions: string[],
 *   warnings: string[],
 *   confidence: number,
 *   category: string
 * }}
 */
export function runOwnershipCostSimulator(input, options = {}) {
  const cacheKey = buildOwnershipCostCacheKey(
    /** @type {Record<string, unknown>} */ (input.recommendation ?? {}),
    input.user_intent ?? {}
  );

  if (!options.skipCache) {
    const cached = memoCache.get(cacheKey);
    if (cached) return /** @type {ReturnType<typeof runOwnershipCostSimulator>} */ (cached);
  }

  if (!input?.recommendation?.id) {
    const empty = {
      total_cost: 0,
      monthly_estimate: 0,
      annual_estimate: 0,
      cost_breakdown: [],
      cost_risk_level: /** @type {'medium'} */ ('medium'),
      cost_summary: 'Mevcut bilgiler ışığında maliyet ön değerlendirmesi üretilemedi; doğrulama önerilir.',
      assumptions: ['Seçili öneri bulunamadı.'],
      warnings: ['Öneri seçimi olmadan maliyet simülasyonu çalıştırılamaz.'],
      confidence: 0,
      category: String(input.category ?? 'vehicle')
    };
    memoCache.set(cacheKey, empty);
    return empty;
  }

  const category = String(input.category ?? 'vehicle');
  const { model, total, annual, months } = resolveCategoryModel(category, input);
  const breakdown = buildCostBreakdown(category, model);
  const confidence = computeOwnershipCostConfidence(input);
  const costRiskLevel = classifyCostRiskLevel(input.risk_score, input.quality_score, confidence);
  const assumptions = buildCostAssumptions(category, input);
  const warnings = buildCostWarnings(input, costRiskLevel);
  const costSummary = buildCostSummaryText(category, total, costRiskLevel);

  const monthlyEstimate = months > 0 ? Math.round(total / months) : 0;

  const result = {
    total_cost: Math.round(total),
    monthly_estimate: monthlyEstimate,
    annual_estimate: Math.round(annual),
    cost_breakdown: breakdown,
    cost_risk_level: costRiskLevel,
    cost_summary: costSummary,
    assumptions,
    warnings,
    confidence,
    category
  };

  memoCache.set(cacheKey, result);
  if (memoCache.size > 20) {
    const oldest = memoCache.keys().next().value;
    if (oldest) memoCache.delete(oldest);
  }

  return result;
}
