/**
 * isteBul AI Listings Engine v1 — PricingService (placeholder).
 */

import { isAiListingsEnabled } from '../core/config.js';
import { buildPricingContext } from '../pricing/pricing-context.js';
import { computePriceScore } from '../pricing/pricing-engine.js';

/** @typedef {import('../models/listing.js').Listing} Listing */
/** @typedef {import('../repository/adapters/pricing-data-adapter.interface.js').PricingDataAdapter} PricingDataAdapter */
/** @typedef {import('../repository/adapters/market-data-adapter.interface.js').MarketDataAdapter} MarketDataAdapter */

/**
 * @typedef {Object} PricingServiceDeps
 * @property {PricingDataAdapter} pricingDataAdapter
 * @property {MarketDataAdapter} marketDataAdapter
 */

/**
 * @param {PricingServiceDeps} deps
 */
export function createPricingService(deps) {
  const { pricingDataAdapter, marketDataAdapter } = deps;

  return {
    /**
     * @param {Listing} listing
     * @returns {Promise<{ price_score: number, benchmark: import('../repository/adapters/pricing-data-adapter.interface.js').PricingBenchmark|null, context: ReturnType<typeof buildPricingContext> }|null>}
     */
    async analyzeListing(listing) {
      if (!isAiListingsEnabled()) return null;

      const benchmark = await pricingDataAdapter.fetchBenchmark({
        category: listing.category,
        location: listing.location,
        attributes: listing.attributes
      });

      const marketSnapshot = await marketDataAdapter.fetchSnapshot({
        category: listing.category,
        location: listing.location,
        currency: listing.currency
      });

      const context = buildPricingContext({ listing, benchmark, marketSnapshot });
      const price_score = computePriceScore({ listing, benchmark });

      // TODO: Integrate js/engines/cost-engine.js for total-cost-of-ownership estimates
      return { price_score, benchmark, context };
    },

    /**
     * @returns {string}
     */
    getDataSourceId() {
      return pricingDataAdapter.getSourceId();
    }
  };
}
