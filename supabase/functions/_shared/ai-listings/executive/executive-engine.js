/**
 * Executive Decision Engine v2 — combines existing engine outputs (Sprint-8).
 */

import { clampScore } from '../engine/score-utils.js';
import { computeExecutiveConfidence } from './decision-confidence.js';
import { buildExecutiveSummary } from './executive-summary.js';
import {
  getExecutiveLabel,
  buildExecutiveStrengths,
  buildExecutiveRisks,
  buildExecutiveRecommendations
} from './executive-recommendation.js';

/**
 * @param {number} qualityScore
 * @param {number} priceScore
 * @param {number} marketContextScore
 * @param {number} riskScore
 * @param {number} decisionScore
 * @param {{ status?: string|null }} duplicate
 * @returns {number}
 */
export function computeExecutiveScore(
  qualityScore,
  priceScore,
  marketContextScore,
  riskScore,
  decisionScore,
  duplicate = {}
) {
  const quality = Number(qualityScore) || 0;
  const price = Number(priceScore) || 0;
  const marketContext = Number(marketContextScore) || 0;
  const risk = Number(riskScore) || 0;
  const decision = Number(decisionScore) || 0;

  const hasPrice = price > 0;
  const qualityWeight = 0.2;
  const priceWeight = hasPrice ? 0.12 : 0;
  const marketWeight = 0.13;
  const riskWeight = 0.2;
  const decisionWeight = 0.25;
  const redistribution = hasPrice ? 0 : 0.12;

  let score =
    quality * qualityWeight +
    price * priceWeight +
    marketContext * marketWeight +
    (100 - risk) * riskWeight +
    decision * (decisionWeight + redistribution);

  const duplicateStatus = String(duplicate.status ?? '');
  if (duplicateStatus === 'exact') score -= 18;
  else if (duplicateStatus === 'similar') score -= 10;

  return clampScore(score);
}

/**
 * @param {{
 *   quality?: { quality_score?: number, missing_fields?: string[] },
 *   price_intelligence?: { price_score?: number, deviation_pct?: number },
 *   market_intelligence?: { market_context_score?: number, segment_label?: string },
 *   risk?: { risk_score?: number, risk_label?: string, risk_factors?: string[] },
 *   duplicate?: { status?: string|null, similarity?: number|null },
 *   decision?: { decision_score?: number, strengths?: string[], risks?: string[] }
 * }} engines
 * @param {Record<string, unknown>} listing
 * @returns {Array<{ id: string, impact: number }>}
 */
export function buildExplainability(engines, listing) {
  /** @type {Array<{ id: string, impact: number }>} */
  const items = [];

  const qualityScore = Number(engines.quality?.quality_score) || 0;
  items.push({ id: 'quality', impact: Math.round(qualityScore * 0.2 - 10) });

  const priceScore = Number(engines.price_intelligence?.price_score) || 0;
  if (priceScore > 0) {
    items.push({ id: 'price_score', impact: Math.round(priceScore * 0.12 - 6) });
  }

  const marketContext = Number(engines.market_intelligence?.market_context_score) || 0;
  items.push({ id: 'market_context', impact: Math.round(marketContext * 0.13 - 6) });

  const riskScore = Number(engines.risk?.risk_score) || 0;
  items.push({ id: 'risk', impact: Math.round((100 - riskScore) * 0.2 - 10) });

  const decisionScore = Number(engines.decision?.decision_score) || 0;
  items.push({ id: 'decision', impact: Math.round(decisionScore * 0.25 - 12) });

  const missing = engines.quality?.missing_fields ?? [];
  if (missing.includes('Fotoğraf')) items.push({ id: 'missing_photos', impact: -8 });
  if (missing.includes('Konum')) items.push({ id: 'missing_location', impact: -5 });
  if (missing.includes('Kaynak URL')) items.push({ id: 'missing_source_url', impact: -4 });
  if (missing.includes('Açıklama')) items.push({ id: 'missing_description', impact: -4 });

  const duplicateStatus = String(engines.duplicate?.status ?? '');
  if (duplicateStatus === 'exact') items.push({ id: 'duplicate_exact', impact: -18 });
  else if (duplicateStatus === 'similar') items.push({ id: 'duplicate_similar', impact: -10 });

  const images = Array.isArray(listing.images) ? listing.images : [];
  if (images.length === 0 && !missing.includes('Fotoğraf')) {
    items.push({ id: 'missing_photos', impact: -8 });
  }

  return items.slice(0, 10);
}

/**
 * @param {Record<string, unknown>} listing
 * @param {{
 *   quality: Record<string, unknown>,
 *   price_intelligence: Record<string, unknown>,
 *   market_intelligence: Record<string, unknown>,
 *   risk: Record<string, unknown>,
 *   duplicate?: Record<string, unknown>|null,
 *   decision: Record<string, unknown>
 * }} engines
 */
export function runExecutiveEngine(listing, engines) {
  const duplicate = engines.duplicate ?? null;
  const engineContext = {
    quality: engines.quality,
    price_intelligence: engines.price_intelligence,
    market_intelligence: engines.market_intelligence,
    risk: engines.risk,
    duplicate,
    decision: engines.decision
  };

  const executive_score = computeExecutiveScore(
    Number(engines.quality?.quality_score),
    Number(engines.price_intelligence?.price_score),
    Number(engines.market_intelligence?.market_context_score),
    Number(engines.risk?.risk_score),
    Number(engines.decision?.decision_score),
    duplicate ?? {}
  );

  const executive_confidence = computeExecutiveConfidence(engineContext, listing);
  const executive_label = getExecutiveLabel(executive_score);
  const strengths = buildExecutiveStrengths(listing, engineContext);
  const risks = buildExecutiveRisks(listing, engineContext);
  const recommendations = buildExecutiveRecommendations(listing, engineContext);
  const explainability = buildExplainability(engineContext, listing);
  const executive_summary = buildExecutiveSummary({
    executive_label,
    executive_confidence,
    quality: engines.quality,
    price_intelligence: engines.price_intelligence,
    risk: engines.risk
  });

  return {
    executive_score,
    executive_confidence,
    executive_label,
    executive_summary,
    strengths,
    risks,
    recommendations,
    explainability
  };
}

/**
 * @param {ReturnType<typeof runExecutiveEngine>} executive
 * @returns {string[]}
 */
export function buildExecutiveTags(executive) {
  return [
    `executive_score:${executive.executive_score}`,
    `executive_confidence:${executive.executive_confidence}`,
    `executive_label:${executive.executive_label}`
  ];
}

/**
 * @param {string[]|null|undefined} tags
 * @param {string} key
 * @returns {string|null}
 */
export function parseExecutiveTagString(tags, key) {
  if (!Array.isArray(tags)) return null;
  const prefix = `${key}:`;
  const match = tags.find((tag) => String(tag).startsWith(prefix));
  if (!match) return null;
  return String(match).slice(prefix.length);
}

/**
 * @param {string[]|null|undefined} tags
 * @returns {Partial<ReturnType<typeof runExecutiveEngine>>}
 */
export function parseExecutiveFromTags(tags) {
  if (!Array.isArray(tags)) return {};

  const scoreRaw = parseExecutiveTagString(tags, 'executive_score');
  const confidenceRaw = parseExecutiveTagString(tags, 'executive_confidence');
  const label = parseExecutiveTagString(tags, 'executive_label');

  /** @type {Partial<ReturnType<typeof runExecutiveEngine>>} */
  const parsed = {};

  if (scoreRaw !== null && Number.isFinite(Number(scoreRaw))) {
    parsed.executive_score = Number(scoreRaw);
  }
  if (confidenceRaw !== null && Number.isFinite(Number(confidenceRaw))) {
    parsed.executive_confidence = Number(confidenceRaw);
  }
  if (label) {
    parsed.executive_label = label;
  }

  return parsed;
}
