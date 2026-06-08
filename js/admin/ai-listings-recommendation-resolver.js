/**
 * Resolve listing → recommendation records for Decision Center workspace.
 * Falls back to deterministic inline scoring when explicit "Öneri üret" was not run.
 */

import { buildRepositoryRecords } from '../../supabase/functions/_shared/ai-listings/repository/repository-engine.js';
import { computeFitScore } from '../../supabase/functions/_shared/ai-listings/recommendation/fit-score-engine.js';
import { buildRecommendationExplanation } from '../../supabase/functions/_shared/ai-listings/recommendation/recommendation-explainer.js';
import { parseUserIntent, runRecommendationEngine } from '../ai-recommendation-engine/index.js';

/**
 * @param {string|number|null|undefined} listingId
 * @param {{ top?: Array<Record<string, unknown>> }|null|undefined} cachedResult
 * @returns {Record<string, unknown>|null}
 */
export function findCachedRecommendation(listingId, cachedResult) {
  const id = String(listingId ?? '');
  if (!id || !cachedResult?.top?.length) return null;
  return cachedResult.top.find((item) => String(item.id) === id) ?? null;
}

/**
 * @param {Record<string, unknown>|null|undefined} listing
 * @param {Record<string, unknown>} [profile]
 * @param {Array<Record<string, unknown>>} [allListings]
 * @returns {Record<string, unknown>|null}
 */
export function buildListingRecommendationRecord(listing, profile = {}, allListings = []) {
  const id = String(listing?.id ?? '');
  if (!id) return null;

  const resolved = parseUserIntent(profile);
  const pool = allListings.length ? allListings : [listing];
  const records = buildRepositoryRecords(pool, { includeDuplicateDetection: false });
  const record =
    records.find((item) => String(item.id) === id) ??
    deriveRepositoryRecordFromListing(listing);

  if (!record) return null;

  const fit = computeFitScore(record, listing, resolved, { price_fit: 50, market_fit: 50 });
  const explanation = buildRecommendationExplanation({ ...record, ...fit, listing });
  const analysis = /** @type {Record<string, unknown>} */ (listing.latest_analysis ?? {});

  return {
    ...record,
    listing,
    fit_score: fit.fit_score,
    score: fit.fit_score,
    breakdown: fit.breakdown,
    subscores: fit.subscores,
    recommendation_label: fit.recommendation_label,
    reasons: explanation.reasons,
    risks: explanation.risks,
    reasons_text: explanation.reasons_text,
    risks_text: explanation.risks_text,
    quality_score: record.quality_score ?? analysis.quality_score ?? null,
    risk_score: record.risk_score ?? analysis.risk_score ?? null,
    decision_score: record.decision_score ?? analysis.decision_score ?? null,
    trust_score: analysis.trust_score ?? null
  };
}

/**
 * @param {Record<string, unknown>|null|undefined} listing
 * @param {{ profile?: Record<string, unknown>, cachedResult?: { top?: Array<Record<string, unknown>> }|null, allListings?: Array<Record<string, unknown>> }} [options]
 * @returns {Record<string, unknown>|null}
 */
export function resolveRecommendationForListing(listing, options = {}) {
  if (!listing?.id) return null;

  const cached = findCachedRecommendation(listing.id, options.cachedResult);
  if (cached) return cached;

  return buildListingRecommendationRecord(
    listing,
    options.profile ?? {},
    options.allListings ?? []
  );
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @param {Record<string, unknown>} [profile]
 * @returns {ReturnType<typeof runRecommendationEngine>|null}
 */
export function ensureRecommendationCache(listings, profile = {}) {
  if (!Array.isArray(listings) || !listings.length) return null;
  return runRecommendationEngine(listings, parseUserIntent(profile));
}

/**
 * @param {Record<string, unknown>|null|undefined} listing
 * @returns {Record<string, unknown>|null}
 */
function deriveRepositoryRecordFromListing(listing) {
  const analysis = /** @type {Record<string, unknown>} */ (listing.latest_analysis ?? {});
  return {
    id: String(listing.id ?? ''),
    category: String(listing.category ?? 'general'),
    title: String(listing.title ?? ''),
    price: listing.price ?? null,
    currency: String(listing.currency ?? 'TRY'),
    quality_score: analysis.quality_score ?? null,
    risk_score: analysis.risk_score ?? null,
    decision_score: analysis.decision_score ?? null,
    status: String(listing.status ?? 'draft')
  };
}
