/**
 * AI Recommendation Engine v1 — deterministic profile-based recommendations.
 * Client-side derive from repository records; no endpoint or schema change.
 */

import { buildRepositoryRecords } from '../repository/repository-engine.js';
import { normalizeText } from '../search/normalizer.js';
import {
  computeFitScore,
  applyProfileFallbacks,
  computePriceFit,
  computeMarketFit
} from './fit-score-engine.js';
import {
  rankTopRecommendations,
  assignAlternativeTags,
  resolveItemAlternativeTags,
  ALTERNATIVE_TAG_LABELS_TR
} from './alternative-ranker.js';
import { buildRecommendationExplanation } from './recommendation-explainer.js';
import { buildRecommendationSummary } from './recommendation-summary.js';

/** @type {Map<string, unknown>} */
const memoCache = new Map();

/** @type {Map<string, { price_fit: number, market_fit: number }>} */
const intelligenceCache = new Map();

const LARGE_DATASET_THRESHOLD = 500;
const BUDGET_PREFILTER_RATIO = 1.6;

/**
 * @param {Array<Record<string, unknown>>} listings
 * @param {Record<string, unknown>} profile
 * @returns {string}
 */
export function buildRecommendationCacheKey(listings, profile) {
  const resolved = applyProfileFallbacks(profile);
  const first = String(listings[0]?.id ?? '');
  const last = String(listings[listings.length - 1]?.id ?? '');
  return `${listings.length}:${first}:${last}:${JSON.stringify(resolved)}`;
}

/**
 * Clear memoization cache (testing).
 */
export function clearRecommendationMemoCache() {
  memoCache.clear();
  intelligenceCache.clear();
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {{ price_fit: number, market_fit: number }}
 */
function getListingIntelligenceFits(listing) {
  const id = String(listing.id ?? '');
  if (!id) {
    return { price_fit: computePriceFit(listing), market_fit: computeMarketFit(listing) };
  }

  const cached = intelligenceCache.get(id);
  if (cached) return cached;

  const result = {
    price_fit: computePriceFit(listing),
    market_fit: computeMarketFit(listing)
  };
  intelligenceCache.set(id, result);

  if (intelligenceCache.size > 2000) {
    const oldest = intelligenceCache.keys().next().value;
    if (oldest) intelligenceCache.delete(oldest);
  }

  return result;
}

/**
 * @param {Record<string, unknown>} record
 * @param {Record<string, unknown>} profile
 * @returns {boolean}
 */
function passesBudgetPrefilter(record, profile) {
  const budget = Number(profile.budget);
  const price = Number(record.price);
  if (!Number.isFinite(budget) || budget <= 0 || !Number.isFinite(price) || price <= 0) return true;
  return price <= budget * BUDGET_PREFILTER_RATIO;
}

/**
 * @param {Record<string, unknown>} listing
 * @param {string|null} city
 * @returns {boolean}
 */
function matchesCity(listing, city) {
  if (!city) return true;
  const location = normalizeText(listing.location ?? listing.attributes?.city ?? '');
  const target = normalizeText(city);
  if (!location || !target) return true;
  return location.includes(target) || target.includes(location);
}

/**
 * @param {Record<string, unknown>} record
 * @param {Record<string, unknown>} profile
 * @returns {boolean}
 */
function matchesCategory(record, profile) {
  const category = String(profile.category ?? 'vehicle').toLowerCase();
  const recordCategory = String(record.category ?? 'general').toLowerCase();
  if (category === 'all' || category === 'general') return true;
  if (category === 'housing') return recordCategory === 'housing' || recordCategory === 'real_estate';
  return recordCategory === category;
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @param {Record<string, unknown>} [profile]
 * @param {{ limit?: number }} [options]
 * @returns {{
 *   profile: Record<string, unknown>,
 *   recommendations: Array<Record<string, unknown>>,
 *   top: Array<Record<string, unknown>>,
 *   summary: string,
 *   alternative_tags: Record<string, string|null>,
 *   total_evaluated: number
 * }}
 */
export function runRecommendationEngine(listings, profile = {}, options = {}) {
  const resolved = applyProfileFallbacks(profile);
  const limit = options.limit ?? 5;
  const cacheKey = buildRecommendationCacheKey(listings, resolved);
  const cached = memoCache.get(cacheKey);
  if (cached) return /** @type {ReturnType<typeof runRecommendationEngine>} */ (cached);

  if (!Array.isArray(listings) || !listings.length) {
    const empty = {
      profile: resolved,
      recommendations: [],
      top: [],
      summary: 'Mevcut bilgiler ışığında öneri üretmek için yeterli kayıt bulunmuyor.',
      alternative_tags: assignAlternativeTags([]),
      total_evaluated: 0
    };
    memoCache.set(cacheKey, empty);
    return empty;
  }

  const useFastPath = listings.length >= LARGE_DATASET_THRESHOLD;
  const records = buildRepositoryRecords(listings, { includeDuplicateDetection: !useFastPath });
  const listingById = new Map(listings.map((listing) => [String(listing.id ?? ''), listing]));

  /** @type {Array<Record<string, unknown>>} */
  const candidates = [];

  for (const record of records) {
    if (String(record.status ?? '') === 'archived') continue;
    if (!matchesCategory(record, resolved)) continue;
    if (useFastPath && !passesBudgetPrefilter(record, resolved)) continue;

    const listing = listingById.get(String(record.id ?? '')) ?? {};
    if (!matchesCity(listing, resolved.city)) continue;

    candidates.push({ record, listing });
  }

  const scoringPool = useFastPath
    ? candidates
        .map(({ record, listing }) => {
          const quick = computeFitScore(record, listing, resolved, { price_fit: 50, market_fit: 50 });
          return { record, listing, quick_score: quick.fit_score };
        })
        .sort((a, b) => b.quick_score - a.quick_score)
        .slice(0, 250)
    : candidates.map(({ record, listing }) => ({ record, listing, quick_score: 0 }));

  /** @type {Array<Record<string, unknown>>} */
  const recommendations = [];

  for (const { record, listing } of scoringPool) {
    const intel = getListingIntelligenceFits(listing);
    const fit = computeFitScore(record, listing, resolved, intel);
    const explanation = buildRecommendationExplanation({ ...record, ...fit, listing });

    recommendations.push({
      ...record,
      listing,
      fit_score: fit.fit_score,
      breakdown: fit.breakdown,
      subscores: fit.subscores,
      recommendation_label: fit.recommendation_label,
      reasons: explanation.reasons,
      risks: explanation.risks,
      reasons_text: explanation.reasons_text,
      risks_text: explanation.risks_text
    });
  }

  const alternative_tags = assignAlternativeTags(recommendations);
  const top = rankTopRecommendations(recommendations, limit).map((item) => ({
    ...item,
    alternative_tags: resolveItemAlternativeTags(item, alternative_tags),
    alternative_labels: resolveItemAlternativeTags(item, alternative_tags).map(
      (tag) => ALTERNATIVE_TAG_LABELS_TR[tag] ?? tag
    )
  }));

  const result = {
    profile: resolved,
    recommendations,
    top,
    summary: buildRecommendationSummary(top[0] ?? null, resolved),
    alternative_tags,
    total_evaluated: recommendations.length
  };

  memoCache.set(cacheKey, result);
  if (memoCache.size > 5) {
    const oldest = memoCache.keys().next().value;
    if (oldest) memoCache.delete(oldest);
  }

  return result;
}
