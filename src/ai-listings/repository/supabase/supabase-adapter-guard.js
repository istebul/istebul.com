/**
 * isteBul AI Listings Engine v1 — Supabase adapter activation guard.
 */

import { isAiListingsSupabaseAdapterEnabled } from '../../core/config.js';

export const SUPABASE_TABLES = Object.freeze({
  LISTINGS: 'ai_listings',
  ANALYSES: 'ai_listing_analyses',
  EVENTS: 'ai_listing_events'
});

export const SUPABASE_ADAPTER_INACTIVE_ERROR =
  'Supabase AI Listings adapter is inactive — set AI_LISTINGS_SUPABASE_ENABLED=true to activate';

/**
 * Assert Supabase adapter is enabled before any DB operation.
 * @returns {void}
 */
export function assertSupabaseAdapterActive() {
  if (!isAiListingsSupabaseAdapterEnabled()) {
    throw new Error(SUPABASE_ADAPTER_INACTIVE_ERROR);
  }
}

/**
 * @typedef {Object} SupabaseClientLike
 * @property {(table: string) => { select: Function, insert: Function, update: Function, delete: Function, upsert: Function }} from
 */

/**
 * Validate a Supabase client is provided when adapter is active.
 * @param {SupabaseClientLike|null|undefined} client
 * @returns {SupabaseClientLike}
 */
export function requireSupabaseClient(client) {
  assertSupabaseAdapterActive();
  if (!client || typeof client.from !== 'function') {
    throw new Error('Supabase client required — inject via createSupabaseAiListingRepository({ client })');
  }
  return client;
}
