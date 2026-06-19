/**
 * isteBul AI Listings Edge API — Supabase repository layer (service_role).
 */

import { EDGE_ERROR_CODES } from './errors.js';
import { parsePersistedAnalysisFields } from './engine/canonical-engine.js';

const TABLES = Object.freeze({
  LISTINGS: 'ai_listings',
  ANALYSES: 'ai_listing_analyses',
  EVENTS: 'ai_listing_events',
  LEARNING_EVENTS: 'ai_learning_events'
});

function locationToJson(location) {
  const label = String(location ?? '').trim();
  return label ? { label } : null;
}

function locationFromJson(value) {
  if (!value || typeof value !== 'object') return '';
  return String(value.label ?? value.raw ?? value.city ?? '').trim();
}

function listingFromRow(row) {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    description: row.description ?? '',
    location: locationFromJson(row.location),
    price: Number(row.price ?? 0),
    currency: row.currency ?? 'TRY',
    images: Array.isArray(row.images) ? row.images.map(String) : [],
    attributes: row.attributes ?? {},
    status: row.status ?? 'draft',
    source_type: row.source_type ?? 'manual',
    source_url: row.source_url ?? null,
    owner_user_id: row.owner_user_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function analysisFromRow(row) {
  const base = {
    id: row.id,
    listing_id: row.listing_id,
    ai_score: Number(row.ai_score ?? 0),
    risk_score: Number(row.risk_score ?? 0),
    market_score: Number(row.market_score ?? 0),
    price_score: Number(row.price_score ?? 0),
    confidence: Number(row.confidence ?? 0),
    summary: row.summary ?? '',
    pros: Array.isArray(row.pros) ? row.pros.map(String) : [],
    cons: Array.isArray(row.cons) ? row.cons.map(String) : [],
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    analysis_version: row.analysis_version ?? 'v1',
    created_at: row.created_at
  };
  const parsed = parsePersistedAnalysisFields(base);
  return {
    ...base,
    quality_score: parsed.quality_score,
    decision_score: parsed.decision_score,
    recommendation_label: parsed.recommendation_label,
    is_engine_v1: parsed.isEngineV1
  };
}

function eventFromRow(row) {
  return {
    id: row.id,
    listing_id: row.listing_id,
    event_type: row.event_type,
    payload: row.payload ?? {},
    created_at: row.created_at
  };
}

function learningEventFromRow(row) {
  return {
    id: row.id,
    event_type: row.event_type,
    module: row.module ?? null,
    listing_id: row.listing_id ?? null,
    session_id: row.session_id ?? null,
    user_id: row.user_id ?? null,
    payload: row.payload ?? {},
    created_at: row.created_at,
    timestamp: row.created_at
  };
}

function mapDbError(error) {
  if (error?.code === 'PGRST116') {
    return { code: EDGE_ERROR_CODES.NOT_FOUND, message: 'Record not found' };
  }
  return { code: EDGE_ERROR_CODES.DB_ERROR, message: 'Database operation failed', cause: error };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 */
export function createEdgeRepositories(client) {
  return {
    async createListing(input) {
      const row = {
        category: input.category,
        title: input.title,
        description: input.description ?? null,
        location: locationToJson(input.location ?? ''),
        price: input.price ?? null,
        currency: input.currency ?? 'TRY',
        images: input.images ?? [],
        attributes: input.attributes ?? {},
        status: input.status ?? 'draft',
        source_type: input.source_type ?? 'manual',
        source_url: input.source_url ?? null,
        owner_user_id: input.owner_user_id ?? null
      };

      const { data, error } = await client.from(TABLES.LISTINGS).insert(row).select('*').single();
      if (error) throw mapDbError(error);
      return listingFromRow(data);
    },

    async getListingById(id) {
      const { data, error } = await client.from(TABLES.LISTINGS).select('*').eq('id', id).maybeSingle();
      if (error) throw mapDbError(error);
      return data ? listingFromRow(data) : null;
    },

    async updateListing(id, patch) {
      const rowPatch = { ...patch };
      if (rowPatch.location !== undefined) {
        rowPatch.location = locationToJson(String(rowPatch.location ?? ''));
      }

      const { data, error } = await client
        .from(TABLES.LISTINGS)
        .update(rowPatch)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw mapDbError(error);
      return listingFromRow(data);
    },

    async listListings(filters = {}) {
      let query = client.from(TABLES.LISTINGS).select('*');
      if (filters.category) query = query.eq('category', filters.category);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.source_type) query = query.eq('source_type', filters.source_type);
      if (filters.owner_user_id) query = query.eq('owner_user_id', filters.owner_user_id);
      query = query.order('created_at', { ascending: false });

      const limit = filters.limit;
      const offset = filters.offset ?? 0;
      if (limit !== undefined) query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;
      if (error) throw mapDbError(error);
      return (data ?? []).map(listingFromRow);
    },

    async archiveListing(id) {
      const { data, error } = await client
        .from(TABLES.LISTINGS)
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw mapDbError(error);
      return listingFromRow(data);
    },

    async createAnalysis(listingId, analysis, modelVersion = 'v1') {
      const row = {
        listing_id: listingId,
        ai_score: analysis.ai_score,
        risk_score: analysis.risk_score,
        market_score: analysis.market_score,
        price_score: analysis.price_score,
        confidence: analysis.confidence,
        summary: analysis.summary,
        pros: analysis.pros,
        cons: analysis.cons,
        tags: analysis.tags,
        analysis_version: modelVersion
      };

      const { data, error } = await client.from(TABLES.ANALYSES).insert(row).select('*').single();
      if (error) throw mapDbError(error);
      return analysisFromRow(data);
    },

    async getLatestAnalysis(listingId) {
      const { data, error } = await client
        .from(TABLES.ANALYSES)
        .select('*')
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw mapDbError(error);
      return data ? analysisFromRow(data) : null;
    },

    async createEvent(input) {
      const row = {
        listing_id: input.listing_id,
        event_type: input.event_type,
        payload: input.payload ?? {}
      };

      const { data, error } = await client.from(TABLES.EVENTS).insert(row).select('*').single();
      if (error) throw mapDbError(error);
      return eventFromRow(data);
    },

    async listEventsByListingId(listingId) {
      const { data, error } = await client
        .from(TABLES.EVENTS)
        .select('*')
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false });

      if (error) throw mapDbError(error);
      return (data ?? []).map(eventFromRow);
    },

    async createLearningEvent(input) {
      const row = {
        event_type: input.event_type,
        module: input.module ?? null,
        listing_id: input.listing_id ?? null,
        session_id: input.session_id ?? null,
        user_id: input.user_id ?? null,
        payload: input.payload ?? {}
      };

      const { data, error } = await client.from(TABLES.LEARNING_EVENTS).insert(row).select('*').single();
      if (error) throw mapDbError(error);
      return learningEventFromRow(data);
    },

    async listLearningEvents(filters = {}) {
      let query = client.from(TABLES.LEARNING_EVENTS).select('*').order('created_at', { ascending: false });

      if (filters.session_id) query = query.eq('session_id', filters.session_id);
      if (filters.user_id) query = query.eq('user_id', filters.user_id);
      if (filters.event_type) query = query.eq('event_type', filters.event_type);

      const limit = filters.limit ?? 100;
      query = query.limit(Math.min(Math.max(Number(limit) || 100, 1), 500));

      const { data, error } = await query;
      if (error) throw mapDbError(error);
      return (data ?? []).map(learningEventFromRow);
    }
  };
}
