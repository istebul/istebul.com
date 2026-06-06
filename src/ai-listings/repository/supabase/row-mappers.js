/**
 * isteBul AI Listings Engine v1 — DB row ↔ domain model mappers.
 */

import { DEFAULT_CURRENCY } from '../../core/constants.js';
import { createEmptyListing } from '../../models/listing.js';
import { createEmptyAIAnalysis } from '../../models/ai-analysis.js';

/** @typedef {import('../../models/listing.js').Listing} Listing */
/** @typedef {import('../../models/ai-analysis.js').AIAnalysis} AIAnalysis */
/** @typedef {import('../ai-analysis-repository.interface.js').AIAnalysisRecord} AIAnalysisRecord */

/**
 * @typedef {Object} AiListingRow
 * @property {string} id
 * @property {string} category
 * @property {string} title
 * @property {string|null} [description]
 * @property {object|null} [location]
 * @property {number|null} [price]
 * @property {string} [currency]
 * @property {unknown[]} [images]
 * @property {Record<string, unknown>} [attributes]
 * @property {string} [status]
 * @property {string} [source_type]
 * @property {string|null} [source_url]
 * @property {string|null} [owner_user_id]
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} AiListingAnalysisRow
 * @property {string} id
 * @property {string} listing_id
 * @property {number|null} [ai_score]
 * @property {number|null} [risk_score]
 * @property {number|null} [market_score]
 * @property {number|null} [price_score]
 * @property {number|null} [confidence]
 * @property {string|null} [summary]
 * @property {unknown[]} [pros]
 * @property {unknown[]} [cons]
 * @property {unknown[]} [tags]
 * @property {string} [analysis_version]
 * @property {string} created_at
 */

/**
 * Serialize domain location string to jsonb column.
 * @param {string} location
 * @returns {object|null}
 */
export function locationToJson(location) {
  const label = String(location ?? '').trim();
  return label ? { label } : null;
}

/**
 * Deserialize jsonb location to domain string.
 * @param {unknown} value
 * @returns {string}
 */
export function locationFromJson(value) {
  if (!value || typeof value !== 'object') return '';
  const row = /** @type {{ label?: string, raw?: string, city?: string }} */ (value);
  return String(row.label ?? row.raw ?? row.city ?? '').trim();
}

/**
 * @param {AiListingRow} row
 * @returns {Listing}
 */
export function listingFromRow(row) {
  return createEmptyListing({
    id: row.id,
    category: row.category,
    title: row.title,
    description: row.description ?? '',
    location: locationFromJson(row.location),
    price: Number(row.price ?? 0),
    currency: row.currency ?? DEFAULT_CURRENCY,
    images: Array.isArray(row.images) ? row.images.map(String) : [],
    attributes: /** @type {Listing['attributes']} */ (row.attributes ?? {}),
    created_at: row.created_at,
    updated_at: row.updated_at
  });
}

/**
 * @param {Listing} listing
 * @returns {Omit<AiListingRow, 'created_at' | 'updated_at'> & { description: string|null, location: object|null, status: string, source_type: string }}
 */
export function listingToRow(listing) {
  return {
    id: listing.id,
    category: listing.category,
    title: listing.title,
    description: listing.description || null,
    location: locationToJson(listing.location),
    price: listing.price,
    currency: listing.currency,
    images: listing.images,
    attributes: listing.attributes,
    status: 'draft',
    source_type: 'manual',
    source_url: null,
    owner_user_id: null
  };
}

/**
 * @param {AiListingAnalysisRow} row
 * @returns {AIAnalysisRecord}
 */
export function analysisRecordFromRow(row) {
  const analysis = createEmptyAIAnalysis({
    ai_score: Number(row.ai_score ?? 0),
    risk_score: Number(row.risk_score ?? 0),
    market_score: Number(row.market_score ?? 0),
    price_score: Number(row.price_score ?? 0),
    confidence: Number(row.confidence ?? 0),
    summary: row.summary ?? '',
    pros: Array.isArray(row.pros) ? row.pros.map(String) : [],
    cons: Array.isArray(row.cons) ? row.cons.map(String) : [],
    tags: Array.isArray(row.tags) ? row.tags.map(String) : []
  });

  return {
    listing_id: row.listing_id,
    analysis,
    created_at: row.created_at,
    model_version: row.analysis_version ?? 'v1'
  };
}

/**
 * @param {AIAnalysisRecord} record
 * @returns {Omit<AiListingAnalysisRow, 'id' | 'created_at'>}
 */
export function analysisRecordToRow(record) {
  const { analysis } = record;
  return {
    listing_id: record.listing_id,
    ai_score: analysis.ai_score,
    risk_score: analysis.risk_score,
    market_score: analysis.market_score,
    price_score: analysis.price_score,
    confidence: analysis.confidence,
    summary: analysis.summary,
    pros: analysis.pros,
    cons: analysis.cons,
    tags: analysis.tags,
    analysis_version: record.model_version ?? 'v1'
  };
}
