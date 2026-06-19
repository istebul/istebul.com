import { createCanonicalListing } from '../models/canonical-listing.js';

/**
 * @param {Record<string, unknown>} input
 * @returns {import('../models/canonical-listing.js').CanonicalListing}
 */
export function parseJsonListing(input) {
  let attributes = input.attributes;
  if (typeof input.attributes === 'string') {
    try {
      attributes = JSON.parse(input.attributes);
    } catch {
      attributes = {};
    }
  }

  return createCanonicalListing({
    ...input,
    attributes: attributes && typeof attributes === 'object' ? attributes : {},
    source_type: input.source_type ?? 'json'
  });
}
