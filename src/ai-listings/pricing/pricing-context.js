/**
 * isteBul AI Listings Engine v1 — pricing context builder.
 */

/** @typedef {import('../models/listing.js').Listing} Listing */
/** @typedef {import('../repository/adapters/pricing-data-adapter.interface.js').PricingBenchmark} PricingBenchmark */
/** @typedef {import('../repository/adapters/market-data-adapter.interface.js').MarketSnapshot} MarketSnapshot */

/**
 * @typedef {Object} PricingContext
 * @property {number} listing_price
 * @property {string} currency
 * @property {number|null} median_price
 * @property {number|null} delta_from_median_pct
 * @property {boolean} has_benchmark
 * @property {string} [note]
 */

/**
 * @param {{ listing: Listing, benchmark: PricingBenchmark|null, marketSnapshot?: MarketSnapshot }} input
 * @returns {PricingContext}
 */
export function buildPricingContext(input) {
  const { listing, benchmark } = input;
  const median = benchmark?.median_price ?? null;
  const delta =
    median && listing.price > 0 ? Math.round(((listing.price - median) / median) * 100) : null;

  return {
    listing_price: listing.price,
    currency: listing.currency,
    median_price: median,
    delta_from_median_pct: delta,
    has_benchmark: median !== null,
    note: median === null ? 'TODO: Connect open data / partner pricing benchmarks' : undefined
  };
}
