/**
 * isteBul AI Listings Engine v1 — MarketAnalysisService (placeholder).
 */

import { isAiListingsEnabled } from '../core/config.js';
import { buildMarketContext } from '../market/market-context.js';

/** @typedef {import('../models/listing.js').Listing} Listing */
/** @typedef {import('../repository/adapters/market-data-adapter.interface.js').MarketDataAdapter} MarketDataAdapter */
/** @typedef {import('../repository/adapters/market-data-adapter.interface.js').MarketSnapshot} MarketSnapshot */

/**
 * @typedef {Object} MarketAnalysisServiceDeps
 * @property {MarketDataAdapter} marketDataAdapter
 */

/**
 * @param {MarketAnalysisServiceDeps} deps
 */
export function createMarketAnalysisService(deps) {
  const { marketDataAdapter } = deps;

  return {
    /**
     * @param {Listing} listing
     * @returns {Promise<{ snapshot: MarketSnapshot, market_score: number, context: ReturnType<typeof buildMarketContext> }|null>}
     */
    async analyzeListing(listing) {
      if (!isAiListingsEnabled()) return null;

      const snapshot = await marketDataAdapter.fetchSnapshot({
        category: listing.category,
        location: listing.location,
        currency: listing.currency
      });

      const context = buildMarketContext({ listing, snapshot });

      // TODO: Replace placeholder score with EVDS/TÜİK-informed scoring
      const market_score = snapshot.has_data ? 50 : 0;

      return { snapshot, market_score, context };
    },

    /**
     * @returns {string}
     */
    getDataSourceId() {
      return marketDataAdapter.getSourceId();
    }
  };
}
