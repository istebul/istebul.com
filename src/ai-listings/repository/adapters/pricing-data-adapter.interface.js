/**
 * isteBul AI Listings Engine v1 — Pricing data adapter port.
 *
 * Future wiring targets:
 * - Open data benchmarks
 * - Partner pricing APIs
 * - Category-specific cost engines (js/engines/cost-engine.js)
 */

/**
 * @typedef {Object} PricingBenchmark
 * @property {string} source_id
 * @property {string} category
 * @property {string} [location]
 * @property {number|null} median_price
 * @property {number|null} p25_price
 * @property {number|null} p75_price
 * @property {string} currency
 * @property {string} fetched_at
 */

/**
 * @typedef {Object} PricingContextRequest
 * @property {string} category
 * @property {string} [location]
 * @property {Record<string, string | number | boolean | null>} [attributes]
 */

/**
 * @typedef {Object} PricingDataAdapter
 * @property {(request: PricingContextRequest) => Promise<PricingBenchmark|null>} fetchBenchmark
 * @property {() => string} getSourceId
 */

/**
 * @returns {PricingDataAdapter}
 */
export function createUnimplementedPricingDataAdapter() {
  const notReady = () => {
    throw new Error('PricingDataAdapter not implemented — wire open data / partner adapter in integration phase');
  };
  return {
    fetchBenchmark: async () => notReady(),
    getSourceId: () => 'unimplemented'
  };
}
