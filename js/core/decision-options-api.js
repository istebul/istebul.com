/**
 * Decision options API — ai_listings as the sole public catalog source (not legacy `listings`).
 * Karar platformu mantığı: yalnızca QA'dan geçmiş / kullanıcı intake kayıtları.
 */

import { supabase } from './supabase.js';
import {
  loadPublicAiListings,
  mapPublishedListing
} from './ai-listings-public-api.js';

/** @typedef {Record<string, unknown>} DecisionOption */

/** UI (legacy SPA) → AI Listings Engine category ids */
export const UI_TO_AI_CATEGORY = Object.freeze({
  arac: 'vehicle',
  ev: 'housing',
  konut: 'housing',
  tatil: 'vacation',
  vehicle: 'vehicle',
  housing: 'housing',
  vacation: 'vacation'
});

/** AI Listings Engine → UI category ids for filters and labels */
export const AI_TO_UI_CATEGORY = Object.freeze({
  vehicle: 'arac',
  housing: 'ev',
  vacation: 'tatil',
  general: 'general'
});

/**
 * @param {unknown} category
 * @returns {string|undefined}
 */
export function toAiCategory(category) {
  if (!category) return undefined;
  const key = String(category).trim();
  return UI_TO_AI_CATEGORY[key] ?? key;
}

/**
 * @param {unknown} category
 * @returns {string}
 */
export function toUiCategory(category) {
  const key = String(category ?? 'general').trim();
  return AI_TO_UI_CATEGORY[key] ?? key;
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {DecisionOption}
 */
export function normalizeAiListingToOption(listing) {
  const uiCategory = toUiCategory(listing.category);
  const attributes =
    listing.attributes && typeof listing.attributes === 'object' && !Array.isArray(listing.attributes)
      ? /** @type {Record<string, unknown>} */ (listing.attributes)
      : {};

  const latestAnalysis =
    listing.latest_analysis && typeof listing.latest_analysis === 'object'
      ? listing.latest_analysis
      : null;

  const resolvedScore =
    latestAnalysis?.ai_score ??
    attributes.ai_score ??
    listing.score ??
    listing.decisionScore ??
    listing.matchScore;

  const numericScore = Number.isFinite(Number(resolvedScore))
    ? Math.max(0, Math.min(100, Number(resolvedScore)))
    : null;

  return {
    ...listing,
    category: uiCategory,
    ai_category: listing.category,
    external_url: listing.source_url ?? listing.external_url ?? null,
    province: attributes.province ?? listing.province ?? '',
    district: attributes.district ?? listing.district ?? '',
    vehicleBrand: attributes.vehicleBrand ?? attributes.vehicle_brand ?? listing.vehicleBrand ?? '',
    propertyType: attributes.propertyType ?? attributes.property_type ?? listing.propertyType ?? '',
    vacationType: attributes.vacationType ?? attributes.vacation_type ?? listing.vacationType ?? '',
    ...(numericScore !== null ? { score: numericScore, decisionScore: numericScore } : {}),
    metadata: {
      ...attributes,
      ai_score: latestAnalysis?.ai_score ?? attributes.ai_score ?? null,
      risk_score: latestAnalysis?.risk_score ?? attributes.risk_score ?? null,
      source: 'ai_listings'
    },
    source: 'ai_listings',
    decisionHighlights: Array.isArray(latestAnalysis?.pros)
      ? latestAnalysis.pros.slice(0, 3).map(String)
      : listing.decisionHighlights ?? []
  };
}

/**
 * @param {Record<string, unknown>} row
 * @returns {Promise<DecisionOption>}
 */
async function enrichListingWithAnalysis(row) {
  const { data: analysisRows } = await supabase
    .from('ai_listing_analyses')
    .select('ai_score,risk_score,market_score,price_score,confidence,summary,pros,cons,tags,created_at')
    .eq('listing_id', row.id)
    .order('created_at', { ascending: false })
    .limit(1);

  return normalizeAiListingToOption(
    mapPublishedListing({
      ...row,
      latest_analysis: analysisRows?.[0] ?? null
    })
  );
}

/**
 * Client-side filters (search, price, location) on normalized decision options.
 * @param {DecisionOption[]} listings
 * @param {Record<string, unknown>} [options]
 */
export function filterDecisionOptions(listings = [], options = {}) {
  const search = options.search?.toString().trim().toLocaleLowerCase('tr-TR');
  const location = options.location?.toString().trim().toLocaleLowerCase('tr-TR');
  const province = options.province?.toString().trim().toLocaleLowerCase('tr-TR');
  const district = options.district?.toString().trim().toLocaleLowerCase('tr-TR');
  const vehicleBrand = options.vehicleBrand?.toString().trim().toLocaleLowerCase('tr-TR');
  const propertyType = options.propertyType?.toString().trim().toLocaleLowerCase('tr-TR');
  const vacationType = options.vacationType?.toString().trim().toLocaleLowerCase('tr-TR');
  const minPrice = Number(options.minPrice || options.min_price);
  const maxPrice = Number(options.maxPrice || options.max_price);
  const uiCategory = options.category ? toUiCategory(toAiCategory(options.category)) : '';

  return listings
    .filter((listing) => !uiCategory || listing.category === uiCategory || listing.ai_category === toAiCategory(uiCategory))
    .filter((listing) => !Number.isFinite(minPrice) || minPrice <= 0 || Number(listing.price) >= minPrice)
    .filter((listing) => !Number.isFinite(maxPrice) || maxPrice <= 0 || Number(listing.price) <= maxPrice)
    .filter((listing) => !province || listing.province?.toLocaleLowerCase('tr-TR') === province)
    .filter((listing) => !district || listing.district?.toLocaleLowerCase('tr-TR') === district)
    .filter((listing) => {
      if (!location) return true;
      const haystack = [listing.location, listing.province, listing.district]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR');
      return haystack.includes(location.replace('/', ' '));
    })
    .filter((listing) => !vehicleBrand || listing.vehicleBrand?.toLocaleLowerCase('tr-TR') === vehicleBrand)
    .filter((listing) => !propertyType || listing.propertyType?.toLocaleLowerCase('tr-TR') === propertyType)
    .filter((listing) => !vacationType || listing.vacationType?.toLocaleLowerCase('tr-TR') === vacationType)
    .filter((listing) => {
      if (!search) return true;
      return [
        listing.title,
        listing.description,
        listing.location,
        listing.category,
        listing.vehicleBrand,
        listing.propertyType,
        listing.vacationType,
        ...(listing.decisionHighlights || [])
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR')
        .includes(search);
    })
    .slice(options.offset || 0, (options.offset || 0) + (options.limit || 24));
}

/**
 * Load published decision options from ai_listings (primary catalog source).
 * @param {Record<string, unknown>} [env]
 * @param {Record<string, unknown>} [options]
 * @returns {Promise<DecisionOption[]>}
 */
export async function loadDecisionOptions(env = {}, options = {}) {
  const aiCategory = toAiCategory(options.category);
  const fetchLimit = Math.max(Number(options.limit) || 24, 48);

  const raw = await loadPublicAiListings(env, {
    category: aiCategory,
    limit: fetchLimit,
    offset: options.offset ?? 0
  });

  const normalized = raw.map((row) => normalizeAiListingToOption(mapPublishedListing(row)));
  return filterDecisionOptions(normalized, options);
}

/**
 * Load authenticated user's intake records from ai_listings (draft / pending / published).
 * @param {string} userId
 * @param {Record<string, unknown>} [options]
 * @returns {Promise<DecisionOption[]>}
 */
export async function loadUserDecisionOptions(userId, options = {}) {
  if (!userId) return [];

  let query = supabase
    .from('ai_listings')
    .select('*')
    .eq('owner_user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(options.limit ?? 50);

  const aiCategory = toAiCategory(options.category);
  if (aiCategory) query = query.eq('category', aiCategory);

  const { data, error } = await query;
  if (error) throw error;

  const enriched = await Promise.all((data ?? []).map((row) => enrichListingWithAnalysis(row)));
  return filterDecisionOptions(enriched, options);
}

/**
 * Fetch a single decision option by id from ai_listings.
 * @param {string} listingId
 * @returns {Promise<DecisionOption|null>}
 */
export async function getDecisionOptionById(listingId) {
  if (!listingId) return null;

  const { data, error } = await supabase
    .from('ai_listings')
    .select('*')
    .eq('id', listingId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return enrichListingWithAnalysis(data);
}
