/**
 * isteBul AI Listings Engine v1 — Supabase listing repository.
 *
 * INACTIVE BY DEFAULT. Requires AI_LISTINGS_SUPABASE_ENABLED=true and a client.
 */

import {
  listingCreateInputToRow,
  listingFromRow,
  listingPatchToRow
} from './row-mappers.js';
import { assertSupabaseAdapterActive, requireSupabaseClient, SUPABASE_TABLES } from './supabase-adapter-guard.js';
import { applyEqFilters, runSupabaseMaybeQuery, runSupabaseQuery } from './supabase-query.js';
import { recordNotFoundError } from '../repository-errors.js';

/** @typedef {import('./row-mappers.js').AiListingCreateInput} AiListingCreateInput */
/** @typedef {import('./row-mappers.js').AiListingUpdatePatch} AiListingUpdatePatch */
/** @typedef {import('../../models/listing.js').Listing} Listing */
/** @typedef {import('./supabase-adapter-guard.js').SupabaseClientLike} SupabaseClientLike */

/**
 * @typedef {Object} AiListingListFilters
 * @property {string} [category]
 * @property {string} [status]
 * @property {string} [source_type]
 * @property {string} [owner_user_id]
 * @property {number} [limit]
 * @property {number} [offset]
 */

/**
 * @typedef {Object} SupabaseAiListingRepository
 * @property {(input: AiListingCreateInput) => Promise<Listing>} create
 * @property {(id: string) => Promise<Listing|null>} getById
 * @property {(id: string, patch: AiListingUpdatePatch) => Promise<Listing>} update
 * @property {(filters?: AiListingListFilters) => Promise<Listing[]>} list
 * @property {(id: string) => Promise<Listing>} archive
 */

/**
 * @typedef {Object} SupabaseAiListingRepositoryDeps
 * @property {SupabaseClientLike|null} [client]
 */

/**
 * @param {SupabaseAiListingRepositoryDeps} [deps]
 * @returns {SupabaseAiListingRepository}
 */
export function createSupabaseAiListingRepository(deps = {}) {
  const getClient = () => requireSupabaseClient(deps);

  return {
    async create(input) {
      const sb = getClient();
      const row = listingCreateInputToRow(input);
      const data = await runSupabaseQuery(
        sb.from(SUPABASE_TABLES.LISTINGS).insert(row).select('*').single(),
        { notFoundLabel: 'Listing' }
      );
      return listingFromRow(/** @type {import('./row-mappers.js').AiListingRow} */ (data));
    },

    async getById(id) {
      const sb = getClient();
      const data = await runSupabaseMaybeQuery(
        sb.from(SUPABASE_TABLES.LISTINGS).select('*').eq('id', id).maybeSingle(),
        'Listing'
      );
      return data ? listingFromRow(/** @type {import('./row-mappers.js').AiListingRow} */ (data)) : null;
    },

    async update(id, patch) {
      const sb = getClient();
      const rowPatch = listingPatchToRow(patch);
      if (Object.keys(rowPatch).length === 0) {
        const existing = await this.getById(id);
        if (!existing) throw recordNotFoundError('Listing');
        return existing;
      }

      const data = await runSupabaseQuery(
        sb.from(SUPABASE_TABLES.LISTINGS).update(rowPatch).eq('id', id).select('*').single(),
        { notFoundLabel: 'Listing' }
      );
      return listingFromRow(/** @type {import('./row-mappers.js').AiListingRow} */ (data));
    },

    async list(filters = {}) {
      const sb = getClient();
      let query = sb.from(SUPABASE_TABLES.LISTINGS).select('*');
      query = applyEqFilters(query, [
        { column: 'category', value: filters.category },
        { column: 'status', value: filters.status },
        { column: 'source_type', value: filters.source_type },
        { column: 'owner_user_id', value: filters.owner_user_id }
      ]);
      query = query.order('created_at', { ascending: false });

      const limit = filters.limit;
      const offset = filters.offset ?? 0;
      if (limit !== undefined) {
        query = query.range(offset, offset + limit - 1);
      }

      const data = await runSupabaseQuery(
        /** @type {Promise<{ data: unknown, error: { code?: string, message?: string }|null }>} */ (query),
        { allowEmpty: true, notFoundLabel: 'Listing' }
      );

      const rows = Array.isArray(data) ? data : [];
      return rows.map((row) => listingFromRow(/** @type {import('./row-mappers.js').AiListingRow} */ (row)));
    },

    async archive(id) {
      const sb = getClient();
      const data = await runSupabaseQuery(
        sb
          .from(SUPABASE_TABLES.LISTINGS)
          .update({ status: 'archived', updated_at: new Date().toISOString() })
          .eq('id', id)
          .select('*')
          .single(),
        { notFoundLabel: 'Listing' }
      );
      return listingFromRow(/** @type {import('./row-mappers.js').AiListingRow} */ (data));
    }
  };
}

/**
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
