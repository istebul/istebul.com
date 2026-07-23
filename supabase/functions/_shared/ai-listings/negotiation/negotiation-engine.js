/**
 * Negotiation Intelligence v1 — deterministic orchestrator (Sprint-22).
 */

import { clampScore, safeNumber } from '../engine/score-utils.js';
import { runQualityEngine } from '../engine/quality-engine.js';
import { runPriceIntelligence } from '../price/price-intelligence.js';
import { runMarketIntelligence } from '../market-intelligence/market-intelligence.js';
import {
  buildOwnershipCostInput,
  runOwnershipCostSimulator
} from '../ownership-cost/ownership-cost-engine.js';
import { computeOfferRange } from './offer-range-engine.js';
import {
  classifyNegotiationRiskLevel,
  buildNegotiationRiskLabel
} from './negotiation-risk-engine.js';
import {
  buildNegotiationSummaryText,
  buildNegotiationReasons,
  sanitizeNegotiationSummary
} from './negotiation-summary.js';
import { buildNegotiationChecklist, resolveNegotiationCategoryKey } from './negotiation-checklist.js';

/** @type {Map<string, unknown>} */
const memoCache = new Map();

/**
 * Clear memoization cache (testing).
 */
export function clearNegotiationMemoCache() {
  memoCache.clear();
}

/**
 * @param {Record<string, unknown>} recommendation
 * @param {Record<string, unknown>} userIntent
 * @returns {string}
 */
export function buildNegotiationCacheKey(recommendation, userIntent) {
  const id = String(recommendation?.id ?? '');
  return `${id}:${JSON.stringify(userIntent ?? {})}`;
}

/**
 * @param {Record<string, unknown>} input
 * @returns {number}
 */
export function computeNegotiationConfidence(input) {
  const quality = safeNumber(input.quality_score) || 50;
  const risk = safeNumber(input.risk_score) || 50;
  const hasPrice = safeNumber(input.listing_price) > 0;
  const priceIntel = /** @type {Record<string, unknown>} */ (input.price_intelligence ?? {});
  const priceConfidence = safeNumber(priceIntel.price_confidence);
  const hasMarket = Boolean(input.market_intelligence);
  const hasOwnership = Boolean(input.ownership_cost);

  let confidence = 18;
  confidence += quality * 0.18;
  confidence += (100 - risk) * 0.12;
  if (hasPrice) confidence += 18;
  if (priceConfidence > 0) confidence += priceConfidence * 0.25;
  if (hasMarket) confidence += 10;
  if (hasOwnership) confidence += 8;

  return clampScore(Math.round(confidence));
}

/**
 * @param {Record<string, unknown>} recommendation
 * @param {Record<string, unknown>} [userIntent]
 * @returns {Record<string, unknown>}
 */
export function buildNegotiationInput(recommendation, userIntent = {}) {
  const listing = /** @type {Record<string, unknown>} */ (recommendation?.listing ?? recommendation ?? {});
  const category = String(recommendation?.category ?? listing.category ?? userIntent.category ?? 'vehicle');

  let priceIntelligence = recommendation?.price_intelligence ?? listing.price_intelligence ?? null;
  if (!priceIntelligence) {
    priceIntelligence = runPriceIntelligence(listing);
  }

  const quality = runQualityEngine(listing);
  let marketIntelligence = recommendation?.market_intelligence ?? listing.market_intelligence ?? null;
  if (!marketIntelligence) {
    marketIntelligence = runMarketIntelligence(listing, {
      quality: { quality_score: quality.quality_score },
      risk: { risk_score: recommendation?.risk_score ?? listing.latest_analysis?.risk_score }
    });
  }

  const costInput = buildOwnershipCostInput(recommendation, userIntent);
  const ownershipCost = runOwnershipCostSimulator(costInput);

  return {
    recommendation,
    user_intent: userIntent,
    listing_price: safeNumber(recommendation?.price ?? listing.price),
    category,
    category_key: resolveNegotiationCategoryKey(category),
    price_intelligence: priceIntelligence,
    market_intelligence: marketIntelligence,
    ownership_cost: ownershipCost,
    quality_score: safeNumber(recommendation?.quality_score ?? listing.latest_analysis?.quality_score ?? quality.quality_score),
    risk_score: safeNumber(recommendation?.risk_score ?? listing.latest_analysis?.risk_score),
    duplicate_status: String(recommendation?.duplicate_status ?? listing.duplicate_status ?? 'new'),
    executive_label: String(recommendation?.executive_label ?? listing.executive_label ?? ''),
    user_intent_label: String(userIntent.priority ?? userIntent.usage_type ?? '')
  };
}

/**
 * @param {Record<string, unknown>} input
 * @param {{ skipCache?: boolean }} [options]
 * @returns {{
 *   listing_price: number,
 *   suggested_offer_low: number,
 *   suggested_offer_high: number,
 *   target_offer: number,
 *   negotiation_room_pct: number,
 *   negotiation_risk_level: 'Düşük'|'Orta'|'Yüksek',
 *   negotiation_risk_label: string,
 *   negotiation_summary: string,
 *   reasons: string[],
 *   verification_before_offer: string[],
 *   confidence: number,
 *   category: string
 * }}
 */
export function runNegotiationIntelligence(input, options = {}) {
  const cacheKey = buildNegotiationCacheKey(
    /** @type {Record<string, unknown>} */ (input.recommendation ?? {}),
    input.user_intent ?? {}
  );

  if (!options.skipCache) {
    const cached = memoCache.get(cacheKey);
    if (cached) return /** @type {ReturnType<typeof runNegotiationIntelligence>} */ (cached);
  }

  if (!input?.recommendation?.id) {
    const empty = {
      listing_price: 0,
      suggested_offer_low: 0,
      suggested_offer_high: 0,
      target_offer: 0,
      negotiation_room_pct: 0,
      negotiation_risk_level: /** @type {'Orta'} */ ('Orta'),
      negotiation_risk_label: buildNegotiationRiskLabel('Orta'),
      negotiation_summary: sanitizeNegotiationSummary(
        'Mevcut bilgiler ışığında pazarlık ön değerlendirmesi üretilemedi; doğrulama önerilir.'
      ),
      reasons: ['Seçili öneri bulunamadı.'],
      verification_before_offer: [],
      confidence: 0,
      category: String(input.category ?? 'vehicle')
    };
    memoCache.set(cacheKey, empty);
    return empty;
  }

  const confidence = computeNegotiationConfidence(input);
  const enrichedInput = { ...input, confidence };
  const offerRange = computeOfferRange(enrichedInput);
  const negotiationRiskLevel = classifyNegotiationRiskLevel(enrichedInput, offerRange);
  const reasons = buildNegotiationReasons(enrichedInput, offerRange, negotiationRiskLevel);
  const verificationBeforeOffer = buildNegotiationChecklist(
    input.category_key ?? resolveNegotiationCategoryKey(String(input.category ?? 'vehicle')),
    enrichedInput
  );
  const negotiationSummary = buildNegotiationSummaryText(offerRange, negotiationRiskLevel, enrichedInput);

  const result = {
    listing_price: offerRange.listing_price,
    suggested_offer_low: offerRange.suggested_offer_low,
    suggested_offer_high: offerRange.suggested_offer_high,
    target_offer: offerRange.target_offer,
    negotiation_room_pct: offerRange.negotiation_room_pct,
    negotiation_risk_level: negotiationRiskLevel,
    negotiation_risk_label: buildNegotiationRiskLabel(negotiationRiskLevel),
    negotiation_summary: negotiationSummary,
    reasons,
    verification_before_offer: verificationBeforeOffer,
    confidence,
    category: String(input.category_key ?? resolveNegotiationCategoryKey(String(input.category ?? 'vehicle')))
  };

  memoCache.set(cacheKey, result);
  if (memoCache.size > 25) {
    const oldest = memoCache.keys().next().value;
    if (oldest) memoCache.delete(oldest);
  }

  return result;
}

export {
  buildNegotiationRiskLabel,
  classifyNegotiationRiskLevel,
  mapNegotiationRiskClass,
  NEGOTIATION_RISK_LEVELS
} from './negotiation-risk-engine.js';
export { computeOfferRange, roundOfferAmount, POSITION_DISCOUNT_PROFILES } from './offer-range-engine.js';
export {
  buildNegotiationChecklist,
  resolveNegotiationCategoryKey,
  NEGOTIATION_CHECKLIST_BY_CATEGORY
} from './negotiation-checklist.js';
export {
  buildNegotiationSummaryText,
  buildNegotiationReasons,
  sanitizeNegotiationSummary,
  NEGOTIATION_FORBIDDEN_PHRASES
} from './negotiation-summary.js';
