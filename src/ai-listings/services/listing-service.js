/**
 * isteBul AI Listings Engine v1 — ListingService (placeholder).
 */

import { isAiListingsEnabled } from '../core/config.js';
import { validateListing } from '../models/listing.js';

/** @typedef {import('../models/listing.js').Listing} Listing */
/** @typedef {import('../repository/listing-repository.interface.js').ListingRepository} ListingRepository */
/** @typedef {import('../repository/listing-repository.interface.js').ListingQuery} ListingQuery */

/**
 * @typedef {Object} ListingServiceDeps
 * @property {ListingRepository} listingRepository
 */

/**
 * @param {ListingServiceDeps} deps
 */
export function createListingService(deps) {
  const { listingRepository } = deps;

  return {
    /**
     * @param {string} id
     * @returns {Promise<Listing|null>}
     */
    async getById(id) {
      if (!isAiListingsEnabled()) return null;
      // TODO: Add auth / ownership checks when wired to user listings
      return listingRepository.findById(id);
    },

    /**
     * @param {ListingQuery} [query]
     * @returns {Promise<Listing[]>}
     */
    async list(query) {
      if (!isAiListingsEnabled()) return [];
      // TODO: Apply partner API filters and pagination
      return listingRepository.findMany(query);
    },

    /**
     * @param {Listing} listing
     * @returns {Promise<{ ok: boolean, listing?: Listing, errors?: string[] }>}
     */
    async upsert(listing) {
      if (!isAiListingsEnabled()) {
        return { ok: false, errors: ['AI Listings Engine is inactive'] };
      }

      const validation = validateListing(listing);
      if (!validation.valid) return { ok: false, errors: validation.errors };

      const saved = await listingRepository.save(listing);
      return { ok: true, listing: saved };
    },

    /**
     * @param {string} id
     * @returns {Promise<boolean>}
     */
    async remove(id) {
      if (!isAiListingsEnabled()) return false;
      return listingRepository.deleteById(id);
    }
  };
}
