/**
 * isteBul AI Listings Engine v1 — stub market data adapter (placeholder).
 */

import { DATA_SOURCE_IDS } from '../../core/constants.js';

/** @typedef {import('./market-data-adapter.interface.js').MarketDataAdapter} MarketDataAdapter */

/**
 * @returns {MarketDataAdapter}
 */
export function createStubMarketDataAdapter() {
  return {
    getSourceId() {
      return DATA_SOURCE_IDS.OPEN_DATA;
    },

    async fetchSnapshot() {
      // TODO: Wire EVDS adapter — import from js/services/evds-service.js (server) or evds-market-engine.js (client)
      // TODO: Wire TÜİK adapter — implement tuik-market-data-adapter.js
      return {
        source_id: DATA_SOURCE_IDS.OPEN_DATA,
        fetched_at: new Date().toISOString(),
        has_data: false,
        indicators: {
          policy_rate: null,
          cpi_annual: null,
          usd_try: null,
          housing_loan_rate: null
        },
        disclaimer: 'Stub adapter — no live market data connected'
      };
    }
  };
}
