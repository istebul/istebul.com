/**
 * isteBul AI Listings Engine v1 — Supabase AI analysis repository.
 *
 * INACTIVE BY DEFAULT. Requires AI_LISTINGS_SUPABASE_ENABLED=true and a client.
 */

import {
  analysisCreateInputToRow,
  analysisRecordFromRow
} from './row-mappers.js';
import { assertSupabaseAdapterActive, requireSupabaseClient, SUPABASE_TABLES } from './supabase-adapter-guard.js';
import { runSupabaseMaybeQuery, runSupabaseQuery } from './supabase-query.js';

/** @typedef {import('./row-mappers.js').AiAnalysisCreateInput} AiAnalysisCreateInput */
/** @typedef {import('../ai-analysis-repository.interface.js').AIAnalysisRecord} AIAnalysisRecord */
/** @typedef {import('./supabase-adapter-guard.js').SupabaseClientLike} SupabaseClientLike */

/**
 * @typedef {Object} SupabaseAiAnalysisRepository
 * @property {(input: AiAnalysisCreateInput) => Promise<AIAnalysisRecord>} create
 * @property {(listingId: string) => Promise<AIAnalysisRecord|null>} getLatestByListingId
 * @property {(listingId: string) => Promise<AIAnalysisRecord[]>} listByListingId
 * @property {(listingId: string) => Promise<boolean>} deleteByListingId
 */

/**
 * @typedef {Object} SupabaseAiAnalysisRepositoryDeps
 * @property {SupabaseClientLike|null} [client]
 */

/**
 * @param {SupabaseAiAnalysisRepositoryDeps} [deps]
 * @returns {SupabaseAiAnalysisRepository}
 */
export function createSupabaseAiAnalysisRepository(deps = {}) {
  const getClient = () => requireSupabaseClient(deps);

  return {
    async create(input) {
      const sb = getClient();
      const row = analysisCreateInputToRow(input);
      const data = await runSupabaseQuery(
        sb.from(SUPABASE_TABLES.ANALYSES).insert(row).select('*').single(),
        { notFoundLabel: 'Analysis' }
      );
      return analysisRecordFromRow(/** @type {import('./row-mappers.js').AiListingAnalysisRow} */ (data));
    },

    async getLatestByListingId(listingId) {
      const sb = getClient();
      const data = await runSupabaseMaybeQuery(
        sb
          .from(SUPABASE_TABLES.ANALYSES)
          .select('*')
          .eq('listing_id', listingId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        'Analysis'
      );
      return data
        ? analysisRecordFromRow(/** @type {import('./row-mappers.js').AiListingAnalysisRow} */ (data))
        : null;
    },

    async listByListingId(listingId) {
      const sb = getClient();
      const data = await runSupabaseQuery(
        sb
          .from(SUPABASE_TABLES.ANALYSES)
          .select('*')
          .eq('listing_id', listingId)
          .order('created_at', { ascending: false }),
        { allowEmpty: true, notFoundLabel: 'Analysis' }
      );
      const rows = Array.isArray(data) ? data : [];
      return rows.map((row) =>
        analysisRecordFromRow(/** @type {import('./row-mappers.js').AiListingAnalysisRow} */ (row))
      );
    },

    async deleteByListingId(listingId) {
      const sb = getClient();
      await runSupabaseQuery(
        sb.from(SUPABASE_TABLES.ANALYSES).delete().eq('listing_id', listingId),
        { allowEmpty: true, notFoundLabel: 'Analysis' }
      );
      return true;
    }
  };
}

/**
 * @returns {boolean}
 */
export function isSupabaseAiAnalysisRepositoryAvailable() {
  try {
    assertSupabaseAdapterActive();
    return true;
  } catch {
    return false;
  }
}
