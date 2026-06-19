/**
 * isteBul AI Listings Engine v1 — top-level listing engine facade.
 *
 * Entry point for future production integration. Inactive by default.
 */

import { isAiListingsEnabled } from '../core/config.js';
import { createAiListingsContainer } from '../core/di-container.js';

/** @typedef {import('../models/listing.js').Listing} Listing */
/** @typedef {import('../models/ai-analysis.js').AIAnalysis} AIAnalysis */

/**
 * @typedef {Object} ListingEngineResult
 * @property {boolean} enabled
 * @property {Listing|null} listing
 * @property {AIAnalysis|null} analysis
 * @property {string[]} [errors]
 */

/**
 * Process a listing through all services when the engine is enabled.
 * @param {Listing} listing
 * @returns {Promise<ListingEngineResult>}
 */
export async function processListing(listing) {
  if (!isAiListingsEnabled()) {
    return {
      enabled: false,
      listing: null,
      analysis: null,
      errors: ['AI Listings Engine is inactive (feature flag off)']
    };
  }

  const container = createAiListingsContainer();
  const { listingService, aiAnalysisService } = container.services;

  const upsert = await listingService.upsert(listing);
  if (!upsert.ok) {
    return { enabled: true, listing: null, analysis: null, errors: upsert.errors };
  }

  const analyzed = await aiAnalysisService.analyze(upsert.listing);
  if (!analyzed.ok) {
    return { enabled: true, listing: upsert.listing, analysis: null, errors: analyzed.errors };
  }

  return {
    enabled: true,
    listing: upsert.listing,
    analysis: analyzed.analysis ?? null
  };
}
