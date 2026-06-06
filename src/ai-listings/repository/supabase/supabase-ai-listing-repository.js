/**
 * isteBul AI Listings Engine v1 — Supabase listing repository (stub).
 *
 * INACTIVE BY DEFAULT. Not wired in DI container until integration phase.
 * TODO: Connect via Edge Function or service_role client in server context.
 */

import {
  assertSupabaseAdapterActive,
  requireSupabaseClient,
  SUPABASE_TABLES
} from './supabase-adapter-guard.js';

/** @typedef {import('../listing-repository.interface.js').ListingRepository} ListingRepository */
/** @typedef {import('../listing-repository.interface.js').ListingQuery} ListingQuery */
/** @typedef {import('../../models/listing.js').Listing} Listing */
/** @typedef {import('./supabase-adapter-guard.js').SupabaseClientLike} SupabaseClientLike */

/**
 * @typedef {Object} SupabaseAiListingRepositoryDeps
 * @property {SupabaseClientLike|null} [client]
 */

/**
 * @param {SupabaseAiListingRepositoryDeps} [deps]
 * @returns {ListingRepository}
 */
export function createSupabaseAiListingRepository(deps = {}) {
  const { client = null } = deps;

  return {
    async findById(id) {
      const sb = requireSupabaseClient(client);
      // TODO: Implement — sb.from(SUPABASE_TABLES.LISTINGS).select('*').eq('id', id).maybeSingle()
      void sb;
      void id;
      throw new Error('SupabaseAiListingRepository.findById not implemented — Sprint-3');
    },

    async findMany(query = {}) {
      const sb = requireSupabaseClient(client);
      // TODO: Implement filters for category, status, pagination
      void sb;
      void query;
      throw new Error('SupabaseAiListingRepository.findMany not implemented — Sprint-3');
    },

    async save(listing) {
      const sb = requireSupabaseClient(client);
      // TODO: Implement upsert — const row = listingToRow(listing); sb.from(SUPABASE_TABLES.LISTINGS).upsert(row).select().single()
      void sb;
      void listing;
      throw new Error('SupabaseAiListingRepository.save not implemented — Sprint-3');
    },

    async deleteById(id) {
      const sb = requireSupabaseClient(client);
      // TODO: Implement — sb.from(SUPABASE_TABLES.LISTINGS).delete().eq('id', id)
      void sb;
      void id;
      throw new Error('SupabaseAiListingRepository.deleteById not implemented — Sprint-3');
    }
  };
}

/**
 * Check whether the Supabase listing repository can be instantiated (adapter enabled).
 * @returns {boolean}
 */
export function isSupabaseAiListingRepositoryAvailable() {
  try {
    assertSupabaseAdapterActive();
    return true;
  } catch {
    return false;
  }
}

export { SUPABASE_TABLES };
