/**
 * isteBul AI Listings — user listings adapter (legacy `listings` table bridge).
 */

import { createEmptyListing } from '../../models/listing.js';

/** @typedef {import('../listing-repository.interface.js').Listing} Listing */
/** @typedef {import('../listing-repository.interface.js').ListingQuery} ListingQuery */

/**
 * @param {unknown} value
 * @returns {string}
 */
function locationFromLegacy(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const row = /** @type {{ label?: string, city?: string, raw?: string }} */ (value);
    return String(row.label ?? row.city ?? row.raw ?? '').trim();
  }
  return '';
}

/**
 * Map legacy Supabase listing row to AI Listing model.
 * @param {Record<string, unknown>} row
 * @returns {Listing}
 */
export function mapUserListingRowToListing(row) {
  const images = Array.isArray(row.images) ? row.images.map(String) : [];
  const metadata =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? /** @type {Record<string, unknown>} */ (row.metadata)
      : {};

  return createEmptyListing({
    id: String(row.id ?? ''),
    category: String(row.category ?? 'general'),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    location: locationFromLegacy(row.location),
    price: Number(row.price ?? 0),
    currency: String(row.currency ?? 'TRY'),
    images,
    attributes: {
      ...metadata,
      tags: Array.isArray(row.tags) ? row.tags : [],
      external_url: row.external_url ?? null,
      legacy_status: row.status ?? null,
      user_id: row.user_id ?? null
    },
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString())
  });
}

/**
 * @param {{ from?: (table: string) => { select: (cols: string) => unknown } }} supabaseClient
 * @returns {import('../listing-repository.interface.js').ListingRepository}
 */
export function createUserListingsRepository(supabaseClient) {
  return {
    async findById(id) {
      const query = /** @type {{ eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: Record<string, unknown>|null, error: unknown }> } }} */ (
        supabaseClient.from('listings').select('*').eq('id', String(id))
      );
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data ? mapUserListingRowToListing(data) : null;
    },

    async findMany(query = {}) {
      let builder = /** @type {{ eq: Function, order: Function, range: Function }} */ (
        supabaseClient.from('listings').select('*')
      );

      if (query.category) builder = builder.eq('category', query.category);
      if (query.location) builder = builder.eq('location', query.location);

      builder = builder.order('created_at', { ascending: false });

      const limit = query.limit ?? 50;
      const offset = query.offset ?? 0;
      builder = builder.range(offset, offset + limit - 1);

      const { data, error } = await builder;
      if (error) throw error;
      return (data ?? []).map((row) => mapUserListingRowToListing(/** @type {Record<string, unknown>} */ (row)));
    },

    async save(listing) {
      throw new Error('User listings adapter is read-only — use AI listings edge API for writes');
    },

    async deleteById(_id) {
      throw new Error('User listings adapter is read-only — use legacy listings API for deletes');
    }
  };
}
