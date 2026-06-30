/**
 * Negotiation Intelligence v1 — deterministic orchestrator (Faz N-1).
 */

import { safeNumber } from '../engine/score-utils.js';
import { buildOfferRange } from './offer-range-engine.js';
import { assessNegotiationRisk } from './negotiation-risk-engine.js';
import { buildNegotiationChecklist } from './negotiation-checklist.js';
import { buildNegotiationSummary } from './negotiation-summary.js';

/** @type {Readonly<string[]>} */
const SUPPORTED_CATEGORIES = Object.freeze(['vehicle', 'housing', 'vacation']);

/**
 * @param {unknown} raw
 * @returns {string}
 */
function normalizeCategory(raw) {
  const cat = String(raw ?? 'vehicle').toLowerCase().trim();
  if (cat === 'arac') return 'vehicle';
  if (cat === 'konut' || cat === 'real_estate') return 'housing';
  if (cat === 'tatil' || cat === 'travel') return 'vacation';
  if (SUPPORTED_CATEGORIES.includes(cat)) return cat;
  return 'vehicle';
}

/**
 * @param {number} value
 * @returns {number}
 */
function clampConfidence(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0.5;
  return Math.round(Math.max(0, Math.min(1, n)) * 100) / 100;
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {Record<string, unknown>|null}
 */
export function buildNegotiationInput(raw = {}) {
  const price = safeNumber(raw.price ?? raw.listingPrice);
  if (price <= 0) return null;

  const ownershipSignal = /** @type {Record<string, unknown>} */ (
    raw.ownershipSignal ?? raw.sellerSignal ?? {}
  );
  const attributes = /** @type {Record<string, unknown>} */ (
    raw.attributes ?? raw.availableAttributes ?? {}
  );
  const marketReference = raw.marketReference && typeof raw.marketReference === 'object'
    ? { .../** @type {Record<string, unknown>} */ (raw.marketReference) }
    : {};

  return {
    category: normalizeCategory(raw.category),
    price,
    marketReference,
    ownershipSignal,
    qualitySignal:
      raw.qualitySignal && typeof raw.qualitySignal === 'object'
        ? { .../** @type {Record<string, unknown>} */ (raw.qualitySignal) }
        : {},
    location: String(raw.location ?? '').trim(),
    confidence: clampConfidence(raw.confidence ?? 0.5),
    attributes
  };
}

/**
 * @param {Record<string, unknown>} input
 * @param {number} riskAdjustment
 * @returns {number}
 */
function computeOutputConfidence(input, riskAdjustment) {
  const base = clampConfidence(input.confidence ?? 0.5);
  const adjusted = base + riskAdjustment;
  return clampConfidence(adjusted);
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {Record<string, unknown>|null}
 */
export function runNegotiationIntelligenceEngine(raw = {}) {
  const input = buildNegotiationInput(raw);
  if (!input) return null;

  const offerRange = buildOfferRange(input);
  const riskResult = assessNegotiationRisk(input, offerRange);
  const checklist = buildNegotiationChecklist(input, riskResult);
  const { summary, warnings } = buildNegotiationSummary(input, offerRange, riskResult, checklist);

  return {
    targetOffer: offerRange.targetOffer,
    minOffer: offerRange.minOffer,
    maxOffer: offerRange.maxOffer,
    discountPercent: offerRange.discountPercent,
    negotiationRisk: riskResult.negotiationRisk,
    confidence: computeOutputConfidence(input, riskResult.confidenceAdjustment),
    summary,
    checklist,
    warnings,
    evidenceSignals: riskResult.evidenceSignals
  };
}
