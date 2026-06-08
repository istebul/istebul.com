/**
 * isteBul AI Listings Engine v1 — Market data adapter port.
 *
 * Future wiring targets:
 * - EVDS (js/services/evds-service.js, js/features/evds/evds-market-engine.js)
 * - TÜİK open data
 * - Partner market feeds
 */

/**
 * @typedef {Object} MarketSnapshot
 * @property {string} source_id
 * @property {string} fetched_at ISO-8601
 * @property {boolean} has_data
 * @property {Record<string, number|null>} indicators
 * @property {string} [disclaimer]
 */

/**
 * @typedef {Object} MarketContextRequest
 * @property {string} category
 * @property {string} [location]
 * @property {string} [currency]
 */

/**
 * @typedef {Object} MarketDataAdapter
 * @property {(request: MarketContextRequest) => Promise<MarketSnapshot>} fetchSnapshot
 * @property {() => string} getSourceId
 */

/**
 * @returns {MarketDataAdapter}
 */
export function createUnimplementedMarketDataAdapter() {
  const notReady = () => {
    throw new Error('MarketDataAdapter not implemented — wire EVDS/TÜİK adapter in integration phase');
  };
  return {
    fetchSnapshot: async () => notReady(),
    getSourceId: () => 'unimplemented'
  };
}
