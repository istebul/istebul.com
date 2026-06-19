/**
 * isteBul AI Listings Engine v1 — Supabase listing event repository.
 *
 * INACTIVE BY DEFAULT. Requires AI_LISTINGS_SUPABASE_ENABLED=true and a client.
 */

import { eventCreateInputToRow, eventFromRow } from './row-mappers.js';
import { assertSupabaseAdapterActive, requireSupabaseClient, SUPABASE_TABLES } from './supabase-adapter-guard.js';
import { runSupabaseQuery } from './supabase-query.js';

/** @typedef {import('../listing-event-repository.interface.js').AiListingEvent} AiListingEvent */
/** @typedef {import('../listing-event-repository.interface.js').AiListingEventCreateInput} AiListingEventCreateInput */
/** @typedef {import('../listing-event-repository.interface.js').AiListingEventRepository} AiListingEventRepository */
/** @typedef {import('./supabase-adapter-guard.js').SupabaseClientLike} SupabaseClientLike */

/**
 * @typedef {Object} SupabaseAiListingEventRepositoryDeps
 * @property {SupabaseClientLike|null} [client]
 */

/**
 * @param {SupabaseAiListingEventRepositoryDeps} [deps]
 * @returns {AiListingEventRepository}
 */
export function createSupabaseAiListingEventRepository(deps = {}) {
  const getClient = () => requireSupabaseClient(deps);

  return {
    async create(input) {
      const sb = getClient();
      const row = eventCreateInputToRow(input);
      const data = await runSupabaseQuery(
        sb.from(SUPABASE_TABLES.EVENTS).insert(row).select('*').single(),
        { notFoundLabel: 'Event' }
      );
      return eventFromRow(/** @type {import('./row-mappers.js').AiListingEventRow} */ (data));
    },

    async listByListingId(listingId) {
      const sb = getClient();
      const data = await runSupabaseQuery(
        sb
          .from(SUPABASE_TABLES.EVENTS)
          .select('*')
          .eq('listing_id', listingId)
          .order('created_at', { ascending: false }),
        { allowEmpty: true, notFoundLabel: 'Event' }
      );
      const rows = Array.isArray(data) ? data : [];
      return rows.map((row) => eventFromRow(/** @type {import('./row-mappers.js').AiListingEventRow} */ (row)));
    },

    async listByType(eventType) {
      const sb = getClient();
      const data = await runSupabaseQuery(
        sb
          .from(SUPABASE_TABLES.EVENTS)
          .select('*')
          .eq('event_type', eventType)
          .order('created_at', { ascending: false }),
        { allowEmpty: true, notFoundLabel: 'Event' }
      );
      const rows = Array.isArray(data) ? data : [];
      return rows.map((row) => eventFromRow(/** @type {import('./row-mappers.js').AiListingEventRow} */ (row)));
    }
  };
}

/**
 * @returns {boolean}
 */
export function isSupabaseAiListingEventRepositoryAvailable() {
  try {
    assertSupabaseAdapterActive();
    return true;
  } catch {
    return false;
  }
}
