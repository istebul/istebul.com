/**
 * Market Intelligence — deterministic market context (Sprint-7).
 */

import { clampScore } from '../engine/score-utils.js';
import { getMarketTrend, getSegmentLabel } from './market-model.js';
import { detectVehicleSegment } from './segment-model.js';
import { computeDemandScore } from './demand-model.js';
import { computeLiquidityScore } from './liquidity-model.js';
import { buildMarketSummary, buildMarketReasons } from './market-summary.js';

/**
 * @param {number} demandScore
 * @param {number} liquidityScore
 * @param {number|null|undefined} priceScore
 */
export function computeMarketContextScore(demandScore, liquidityScore, priceScore) {
  const demand = Number(demandScore) || 0;
  const liquidity = Number(liquidityScore) || 0;
  const price = Number(priceScore);

  if (Number.isFinite(price) && price > 0) {
    return clampScore(demand * 0.45 + liquidity * 0.45 + price * 0.1);
  }

  return clampScore(demand * 0.5 + liquidity * 0.5);
}

/**
 * @param {Record<string, unknown>} listing
 * @param {{
 *   quality?: { quality_score?: number },
 *   risk?: { risk_score?: number, risk_label?: string },
 *   market?: { price_score?: number|null }
 * }} [engines]
 */
export function runMarketIntelligence(listing, engines = {}) {
  const segment = detectVehicleSegment(listing);
  const demand = computeDemandScore(listing, {
    segment,
    quality: engines.quality,
    risk: engines.risk
  });
  const liquidity = computeLiquidityScore(listing);
  const priceScore = engines.market?.price_score;
  const market_context_score = computeMarketContextScore(
    demand.demand_score,
    liquidity.liquidity_score,
    priceScore
  );
  const market_trend = getMarketTrend(market_context_score);

  const summaryInput = {
    segment,
    demand_label: demand.demand_label,
    liquidity_label: liquidity.liquidity_label
  };

  const market_summary = buildMarketSummary(summaryInput);
  const market_reasons = buildMarketReasons({
    segment,
    demand_score: demand.demand_score,
    liquidity_score: liquidity.liquidity_score,
    market_context_score,
    market_trend
  });

  return {
    segment,
    segment_label: getSegmentLabel(segment),
    demand_score: demand.demand_score,
    demand_label: demand.demand_label,
    liquidity_score: liquidity.liquidity_score,
    liquidity_label: liquidity.liquidity_label,
    market_context_score,
    market_trend,
    market_summary,
    market_reasons
  };
}

/**
 * @param {ReturnType<typeof runMarketIntelligence>} marketIntelligence
 * @returns {string[]}
 */
export function buildMarketIntelligenceTags(marketIntelligence) {
  return [
    `market_segment:${marketIntelligence.segment}`,
    `demand_score:${marketIntelligence.demand_score}`,
    `liquidity_score:${marketIntelligence.liquidity_score}`,
    `market_context_score:${marketIntelligence.market_context_score}`,
    `market_trend:${marketIntelligence.market_trend}`
  ];
}

/**
 * @param {string[]|null|undefined} tags
 * @param {string} key
 * @returns {string|null}
 */
export function parseMarketTagString(tags, key) {
  if (!Array.isArray(tags)) return null;
  const prefix = `${key}:`;
  const match = tags.find((tag) => String(tag).startsWith(prefix));
  if (!match) return null;
  return String(match).slice(prefix.length);
}

/**
 * @param {string[]|null|undefined} tags
 * @returns {Partial<ReturnType<typeof runMarketIntelligence>>}
 */
export function parseMarketIntelligenceFromTags(tags) {
  if (!Array.isArray(tags)) return {};

  const segment = parseMarketTagString(tags, 'market_segment');
  const demandScore = parseMarketTagString(tags, 'demand_score');
  const liquidityScore = parseMarketTagString(tags, 'liquidity_score');
  const contextScore = parseMarketTagString(tags, 'market_context_score');
  const trend = parseMarketTagString(tags, 'market_trend');

  /** @type {Partial<ReturnType<typeof runMarketIntelligence>>} */
  const parsed = {};

  if (segment) {
    parsed.segment = segment;
    parsed.segment_label = getSegmentLabel(segment);
  }
  if (demandScore !== null && Number.isFinite(Number(demandScore))) {
    parsed.demand_score = Number(demandScore);
  }
  if (liquidityScore !== null && Number.isFinite(Number(liquidityScore))) {
    parsed.liquidity_score = Number(liquidityScore);
  }
  if (contextScore !== null && Number.isFinite(Number(contextScore))) {
    parsed.market_context_score = Number(contextScore);
  }
  if (trend) {
    parsed.market_trend = trend;
  }

  return parsed;
}
