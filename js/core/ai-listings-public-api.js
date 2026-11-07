/**
 * Public AI listings client — reads published listings via Supabase anon key (site_settings gated).
 * Same connection pattern as listing-analysis and live-data integrations.
 */

import { supabase } from './supabase.js';
import {
  fetchAiListingsSettings,
  getAiListingsSettingsFromBootstrap,
  isAiListingsPublicEnabledFromBootstrap
} from '../runtime/ai-listings-integrations.js';

/**
 * @param {Record<string, unknown>} [env]
 * @returns {boolean}
 */
export function isAiListingsPublicEnabled(env = {}) {
  if (isAiListingsPublicEnabledFromBootstrap()) return true;
  const raw = String(
    env.AI_LISTINGS_PUBLIC_PUBLISH_ENABLED ??
      env.aiListingsPublicPublishEnabled ??
      env.ai_listings_public_enabled ??
      ''
  )
    .trim()
    .toLowerCase();
  return raw === 'true' || raw === '1';
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function locationFromJson(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const row = /** @type {{ label?: string, city?: string }} */ (value);
    return String(row.label ?? row.city ?? '').trim();
  }
  return '';
}

/**
 * @param {Record<string, unknown>} row
 * @returns {Record<string, unknown>}
 */
export function mapPublishedListing(row) {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    description: row.description ?? '',
    location: locationFromJson(row.location),
    price: Number(row.price ?? 0),
    currency: row.currency ?? 'TRY',
    images: Array.isArray(row.images) ? row.images : [],
    attributes: row.attributes ?? {},
    status: row.status,
    source_type: row.source_type,
    source_url: row.source_url ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    latest_analysis: row.latest_analysis ?? null
  };
}

/**
 * Fetch published AI listings directly from Supabase (RLS-gated).
 * @param {{ category?: string, limit?: number, offset?: number }} [options]
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function getPublishedAiListings(options = {}) {
  const { category, limit = 24, offset = 0 } = options;

  let query = supabase
    .from('ai_listings')
    .select('*,ai_listing_analyses(ai_score,risk_score,market_score,price_score,confidence,summary,pros,cons,tags,created_at)')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) query = query.eq('category', category);

  query = query
    .order('created_at', {
      ascending: false,
      referencedTable: 'ai_listing_analyses'
    })
    .limit(1, { referencedTable: 'ai_listing_analyses' });

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((listing) => {
    const analyses = Array.isArray(listing.ai_listing_analyses)
      ? listing.ai_listing_analyses
      : [];

    return mapPublishedListing({
      ...listing,
      latest_analysis: analyses[0] ?? null
    });
  });
}

/**
 * Fetch public listings via edge route (no secret required when publish flag is on).
 * @param {Record<string, unknown>} env
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function getPublishedAiListingsViaEdge(env = {}) {
  const baseUrl = String(env.SUPABASE_URL ?? '').trim();
  const anonKey = String(env.SUPABASE_ANON_KEY ?? '').trim();
  if (!baseUrl || !anonKey) return [];

  const response = await fetch(`${baseUrl}/functions/v1/ai-listings/listings/public`, {
    method: 'GET',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`
    }
  });

  if (!response.ok) return [];
  const json = await response.json().catch(() => ({}));
  const listings = json?.data?.listings ?? json?.listings ?? [];
  return Array.isArray(listings) ? listings.map(mapPublishedListing) : [];
}

/**
 * @param {Record<string, unknown>} [env]
 * @param {{ category?: string, limit?: number }} [options]
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function loadPublicAiListings(env = {}, options = {}) {
  const bootstrappedSettings = getAiListingsSettingsFromBootstrap();
  const settings = bootstrappedSettings ?? await fetchAiListingsSettings();
  const enabled = settings.aiListingsPublicEnabled || isAiListingsPublicEnabled(env);
  if (!enabled) return [];

  try {
    // A successful empty result is authoritative; Edge is only an error fallback.
    return await getPublishedAiListings(options);
  } catch {
    // Fall back to edge public route when direct RLS read is unavailable.
    return getPublishedAiListingsViaEdge(env);
  }
}
