/**
 * isteBul AI Listings Engine v1 — in-memory AI analysis repository (dev/test only).
 */

/** @typedef {import('../ai-analysis-repository.interface.js').AIAnalysisRepository} AIAnalysisRepository */
/** @typedef {import('../ai-analysis-repository.interface.js').AIAnalysisRecord} AIAnalysisRecord */

/**
 * @returns {AIAnalysisRepository}
 */
export function createInMemoryAIAnalysisRepository() {
  /** @type {Map<string, AIAnalysisRecord>} */
  const store = new Map();

  return {
    async findByListingId(listingId) {
      return store.get(listingId) ?? null;
    },

    async save(record) {
      store.set(record.listing_id, { ...record });
      return store.get(record.listing_id);
    },

    async deleteByListingId(listingId) {
      return store.delete(listingId);
    }
  };
}
