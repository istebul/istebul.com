/**
 * isteBul AI Listings Engine v1 — Listing repository port.
 *
 * Future implementations:
 * - User listings (Supabase / js/features/ilan)
 * - Partner API ingestion
 * - Open data feeds
 */

/** @typedef {import('../models/listing.js').Listing} Listing */

/**
 * @typedef {Object} ListingQuery
 * @property {string} [category]
 * @property {string} [location]
 * @property {number} [limit]
 * @property {number} [offset]
 */

/**
 * @typedef {Object} ListingRepository
 * @property {(id: string) => Promise<Listing|null>} findById
 * @property {(query?: ListingQuery) => Promise<Listing[]>} findMany
 * @property {(listing: Listing) => Promise<Listing>} save
 * @property {(id: string) => Promise<boolean>} deleteById
 */

/**
 * @returns {ListingRepository}
 */
export function createUnimplementedListingRepository() {
  const notReady = () => {
    throw new Error('ListingRepository adapter not implemented — see docs/ai-listings/FUTURE_INTEGRATION_PLAN.md');
  };
  return {
    findById: async () => notReady(),
    findMany: async () => notReady(),
    save: async () => notReady(),
    deleteById: async () => notReady()
  };
}
