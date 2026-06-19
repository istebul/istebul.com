/**
 * isteBul AI Listings Engine v1 — stub pricing data adapter (placeholder).
 */

import { DATA_SOURCE_IDS, DEFAULT_CURRENCY } from '../../core/constants.js';

/** @typedef {import('./pricing-data-adapter.interface.js').PricingDataAdapter} PricingDataAdapter */

/**
 * @returns {PricingDataAdapter}
 */
export function createStubPricingDataAdapter() {
  return {
    getSourceId() {
      return DATA_SOURCE_IDS.OPEN_DATA;
    },

    async fetchBenchmark(request) {
      // TODO: Connect open data benchmarks and partner pricing APIs
      // TODO: Bridge js/engines/cost-engine.js for category-specific estimates
      return {
        source_id: DATA_SOURCE_IDS.OPEN_DATA,
        category: request.category,
        location: request.location ?? null,
        median_price: null,
        p25_price: null,
        p75_price: null,
        currency: DEFAULT_CURRENCY,
        fetched_at: new Date().toISOString()
      };
    }
  };
}
