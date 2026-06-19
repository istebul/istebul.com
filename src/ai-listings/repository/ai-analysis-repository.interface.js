/**
 * isteBul AI Listings Engine v1 — AIAnalysis repository port.
 */

/** @typedef {import('../models/ai-analysis.js').AIAnalysis} AIAnalysis */

/**
 * @typedef {Object} AIAnalysisRecord
 * @property {string} listing_id
 * @property {AIAnalysis} analysis
 * @property {string} created_at
 * @property {string} [model_version]
 */

/**
 * @typedef {Object} AIAnalysisRepository
 * @property {(listingId: string) => Promise<AIAnalysisRecord|null>} findByListingId
 * @property {(record: AIAnalysisRecord) => Promise<AIAnalysisRecord>} save
 * @property {(listingId: string) => Promise<boolean>} deleteByListingId
 */

/**
 * @returns {AIAnalysisRepository}
 */
export function createUnimplementedAIAnalysisRepository() {
  const notReady = () => {
    throw new Error('AIAnalysisRepository adapter not implemented — see docs/ai-listings/FUTURE_INTEGRATION_PLAN.md');
  };
  return {
    findByListingId: async () => notReady(),
    save: async () => notReady(),
    deleteByListingId: async () => notReady()
  };
}
