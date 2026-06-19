import { createCanonicalListing } from '../models/canonical-listing.js';

/** @type {ReadonlySet<string>} */
export const PARTNER_SOURCE_TYPES = new Set([
  'sahibinden',
  'arabam',
  'emlak',
  'partner_api'
]);

/**
 * Partner / marketplace adapter scaffold.
 * @param {Record<string, unknown>} payload
 * @param {string} [partnerId]
 * @returns {import('../models/canonical-listing.js').CanonicalListing}
 */
export function parsePartnerListing(payload, partnerId = 'partner_api') {
  const source = PARTNER_SOURCE_TYPES.has(partnerId) ? partnerId : 'partner_api';
  const external = payload.external ?? payload.raw ?? payload;

  return createCanonicalListing({
    id: payload.id ?? external.id ?? '',
    category: payload.category ?? external.category ?? 'general',
    title: payload.title ?? external.title ?? '',
    description: payload.description ?? external.description ?? '',
    price: payload.price ?? external.price ?? 0,
    currency: payload.currency ?? external.currency ?? 'TRY',
    location: payload.location ?? external.location ?? '',
    images: payload.images ?? external.images ?? [],
    attributes: payload.attributes ?? external.attributes ?? {},
    source_type: payload.source_type ?? source,
    source_url: payload.source_url ?? external.url ?? external.source_url ?? ''
  });
}
