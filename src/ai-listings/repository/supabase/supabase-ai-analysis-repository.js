/**
 * isteBul AI Listings Engine v1 — Supabase AI analysis repository (stub).
 *
 * INACTIVE BY DEFAULT. Not wired in DI container until integration phase.
 */

import {
  assertSupabaseAdapterActive,
  requireSupabaseClient,
  SUPABASE_TABLES
} from './supabase-adapter-guard.js';

/** @typedef {import('../ai-analysis-repository.interface.js').AIAnalysisRepository} AIAnalysisRepository */
/** @typedef {import('../ai-analysis-repository.interface.js').AIAnalysisRecord} AIAnalysisRecord */
/** @typedef {import('./supabase-adapter-guard.js').SupabaseClientLike} SupabaseClientLike */

/**
 * @typedef {Object} SupabaseAiAnalysisRepositoryDeps
 * @property {SupabaseClientLike|null} [client]
 */

/**
 * @param {SupabaseAiAnalysisRepositoryDeps} [deps]
 * @returns {AIAnalysisRepository}
 */
export function createSupabaseAiAnalysisRepository(deps = {}) {
  const { client = null } = deps;

  return {
    async findByListingId(listingId) {
      const sb = requireSupabaseClient(client);
      // TODO: Implement — sb.from(SUPABASE_TABLES.ANALYSES).select('*').eq('listing_id', listingId).order('created_at', { ascending: false }).limit(1).maybeSingle()
      void sb;
      void listingId;
      throw new Error('SupabaseAiAnalysisRepository.findByListingId not implemented — Sprint-3');
    },

    async save(record) {
      const sb = requireSupabaseClient(client);
      // TODO: Implement insert — const row = analysisRecordToRow(record); sb.from(SUPABASE_TABLES.ANALYSES).insert(row).select().single()
      void sb;
      void record;
      throw new Error('SupabaseAiAnalysisRepository.save not implemented — Sprint-3');
    },

    async deleteByListingId(listingId) {
      const sb = requireSupabaseClient(client);
      // TODO: Implement — sb.from(SUPABASE_TABLES.ANALYSES).delete().eq('listing_id', listingId)
      void sb;
      void listingId;
      throw new Error('SupabaseAiAnalysisRepository.deleteByListingId not implemented — Sprint-3');
    }
  };
}

/**
 * Check whether the Supabase analysis repository can be instantiated (adapter enabled).
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
