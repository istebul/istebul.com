/**
 * isteBul AI Listings Engine v1 — in-memory listing repository (dev/test only).
 */

/** @typedef {import('../../models/listing.js').Listing} Listing */
/** @typedef {import('../listing-repository.interface.js').ListingRepository} ListingRepository */
/** @typedef {import('../listing-repository.interface.js').ListingQuery} ListingQuery */

/**
 * @returns {ListingRepository}
 */
export function createInMemoryListingRepository() {
  /** @type {Map<string, Listing>} */
  const store = new Map();

  return {
    async findById(id) {
      return store.get(id) ?? null;
    },

    async findMany(query = {}) {
      let results = [...store.values()];
      if (query.category) {
        results = results.filter((item) => item.category === query.category);
      }
      if (query.location) {
        const loc = query.location.toLocaleLowerCase('tr-TR');
        results = results.filter((item) => item.location.toLocaleLowerCase('tr-TR').includes(loc));
      }
      const offset = query.offset ?? 0;
      const limit = query.limit ?? results.length;
      return results.slice(offset, offset + limit);
    },

    async save(listing) {
      store.set(listing.id, { ...listing, updated_at: new Date().toISOString() });
      return store.get(listing.id);
    },

    async deleteById(id) {
      return store.delete(id);
    }
  };
}
