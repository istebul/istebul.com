/**
 * Canonical server-side AI Listings engine — Sprint-2.
 */

import { ENGINE_VERSION, safeNumber, readAttribute } from './score-utils.js';
import { runQualityEngine } from './quality-engine.js';
import { runMarketEngine } from './market-engine.js';
import { runRiskEngine } from './risk-engine.js';
import { runDecisionEngine } from './decision-engine.js';
import { runPriceIntelligence, buildPriceIntelligenceTags } from '../price/price-intelligence.js';

export const ANALYSIS_ENGINE_VERSION = ENGINE_VERSION;

/**
 * @param {unknown} value
 * @returns {string}
 */
function flattenLocation(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object' && value !== null) {
    const label = /** @type {{ label?: unknown }} */ (value).label;
    if (typeof label === 'string') return label.trim();
  }
  return String(value ?? '').trim();
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {Record<string, unknown>}
 */
export function normalizeCanonicalListing(listing) {
  const attributes =
    listing.attributes && typeof listing.attributes === 'object' && !Array.isArray(listing.attributes)
      ? /** @type {Record<string, unknown>} */ ({ ...listing.attributes })
      : {};

  const yearRaw = readAttribute(attributes, ['year', 'yil', 'model_year']);
  const kmRaw = readAttribute(attributes, ['mileage', 'km', 'kilometre']);

  return {
    id: String(listing.id ?? ''),
    category: String(listing.category ?? 'general'),
    title: String(listing.title ?? '').trim(),
    description: String(listing.description ?? '').trim(),
    price: safeNumber(listing.price),
    currency: String(listing.currency ?? 'TRY').trim() || 'TRY',
    location: flattenLocation(listing.location),
    brand: String(readAttribute(attributes, ['brand', 'marka']) ?? '').trim(),
    model: String(readAttribute(attributes, ['model']) ?? '').trim(),
    year: yearRaw !== undefined && safeNumber(yearRaw) > 0 ? safeNumber(yearRaw) : null,
    km: kmRaw !== undefined && safeNumber(kmRaw) >= 0 ? safeNumber(kmRaw) : null,
    fuel: String(readAttribute(attributes, ['fuel_type', 'yakit_turu', 'fuel']) ?? '').trim(),
    transmission: String(readAttribute(attributes, ['transmission', 'vites', 'gearbox']) ?? '').trim(),
    images: Array.isArray(listing.images) ? listing.images.map(String) : [],
    attributes,
    source_type: String(listing.source_type ?? 'manual'),
    source_url: String(listing.source_url ?? '').trim(),
    created_at: String(listing.created_at ?? ''),
    updated_at: String(listing.updated_at ?? '')
  };
}

/**
 * @param {Record<string, unknown>} listing
 * @param {{
 *   quality: ReturnType<typeof runQualityEngine>,
 *   market: ReturnType<typeof runMarketEngine>,
 *   risk: ReturnType<typeof runRiskEngine>,
 *   decision: ReturnType<typeof runDecisionEngine>,
 *   price_intelligence?: ReturnType<typeof runPriceIntelligence>
 * }} engines
 */
export function buildAnalysisRecord(listing, engines) {
  const { quality, market, risk, decision, price_intelligence } = engines;

  const tags = [
    ENGINE_VERSION,
    `quality_score:${quality.quality_score}`,
    `decision_score:${decision.decision_score}`,
    `recommendation:${decision.recommendation_label}`,
    `risk_level:${risk.risk_label}`,
    String(listing.category ?? 'general')
  ];

  const piTags = price_intelligence ? buildPriceIntelligenceTags(price_intelligence) : [];
  const hasPiDeviation = piTags.some((tag) => tag.startsWith('deviation_pct:'));

  if (!hasPiDeviation && market.deviation_pct !== undefined) {
    tags.push(`deviation_pct:${market.deviation_pct}`);
  }

  if (piTags.length) {
    tags.push(...piTags);
  }

  return {
    ai_score: decision.decision_score,
    risk_score: risk.risk_score,
    market_score: market.market_score,
    price_score: market.price_score,
    confidence: decision.confidence,
    summary: decision.decision_summary,
    pros: decision.strengths,
    cons: decision.risks,
    tags,
    quality_score: quality.quality_score,
    decision_score: decision.decision_score,
    recommendation: decision.recommendation,
    recommendation_label: decision.recommendation_label
  };
}

/**
 * @param {string[]|null|undefined} tags
 * @param {string} key
 * @returns {number|null}
 */
export function parseTagNumber(tags, key) {
  if (!Array.isArray(tags)) return null;
  const prefix = `${key}:`;
  const match = tags.find((tag) => String(tag).startsWith(prefix));
  if (!match) return null;
  const value = Number(String(match).slice(prefix.length));
  return Number.isFinite(value) ? value : null;
}

/**
 * @param {Record<string, unknown>|null|undefined} analysis
 */
export function parsePersistedAnalysisFields(analysis) {
  if (!analysis || typeof analysis !== 'object') {
    return {
      hasDbAnalysis: false,
      quality_score: null,
      decision_score: null,
      recommendation_label: null,
      isEngineV1: false
    };
  }

  const tags = Array.isArray(analysis.tags) ? analysis.tags.map(String) : [];
  const version = String(analysis.analysis_version ?? '');
  const isEngineV1 = version === ENGINE_VERSION || tags.includes(ENGINE_VERSION);

  const qualityFromTag = parseTagNumber(tags, 'quality_score');
  const decisionFromTag = parseTagNumber(tags, 'decision_score');
  const quality_score =
    analysis.quality_score !== undefined && analysis.quality_score !== null
      ? Number(analysis.quality_score)
      : qualityFromTag;
  const decision_score =
    analysis.decision_score !== undefined && analysis.decision_score !== null
      ? Number(analysis.decision_score)
      : decisionFromTag ?? (Number.isFinite(Number(analysis.ai_score)) ? Number(analysis.ai_score) : null);

  let recommendation_label = null;
  const recTag = tags.find((tag) => tag.startsWith('recommendation:'));
  if (recTag) recommendation_label = recTag.slice('recommendation:'.length);
  if (!recommendation_label && analysis.recommendation_label) {
    recommendation_label = String(analysis.recommendation_label);
  }

  return {
    hasDbAnalysis: true,
    quality_score: Number.isFinite(quality_score) ? quality_score : null,
    decision_score: Number.isFinite(decision_score) ? decision_score : null,
    recommendation_label,
    isEngineV1
  };
}

/**
 * @param {{ listing: Record<string, unknown> }} input
 */
export function runCanonicalEngine(input) {
  const { listing } = input;
  if (!listing?.id) {
    return { ok: false, errors: ['listing.id is required'] };
  }

  const canonical = normalizeCanonicalListing(listing);
  const quality = runQualityEngine(canonical);
  const market = runMarketEngine(canonical);
  const risk = runRiskEngine(canonical, quality);
  const decision = runDecisionEngine(canonical, quality, market, risk);
  const price_intelligence = runPriceIntelligence(canonical);
  const analysis = buildAnalysisRecord(canonical, { quality, market, risk, decision, price_intelligence });

  return {
    ok: true,
    analysis,
    context: {
      engine_version: ENGINE_VERSION,
      canonical,
      quality,
      market,
      risk,
      decision,
      price_intelligence,
      recommendation: {
        label: decision.recommendation_label,
        score: decision.decision_score
      }
    }
  };
}
