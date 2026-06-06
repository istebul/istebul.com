/**
 * isteBul AI Listings Engine v1 — market context builder.
 */

/** @typedef {import('../models/listing.js').Listing} Listing */
/** @typedef {import('../repository/adapters/market-data-adapter.interface.js').MarketSnapshot} MarketSnapshot */

/**
 * @typedef {Object} MarketContext
 * @property {string} category
 * @property {string} location
 * @property {boolean} has_live_data
 * @property {string} source_id
 * @property {Record<string, number|null>} indicators
 * @property {string} [note]
 */

/**
 * @param {{ listing: Listing, snapshot: MarketSnapshot }} input
 * @returns {MarketContext}
 */
export function buildMarketContext(input) {
  const { listing, snapshot } = input;

  return {
    category: listing.category,
    location: listing.location,
    has_live_data: snapshot.has_data,
    source_id: snapshot.source_id,
    indicators: { ...snapshot.indicators },
    note: snapshot.has_data
      ? undefined
      : 'TODO: Connect EVDS and TÜİK adapters for live macro indicators'
  };
}
