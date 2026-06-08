import { createCanonicalListing } from '../models/canonical-listing.js';

/**
 * @param {Record<string, unknown>} input
 * @returns {import('../models/canonical-listing.js').CanonicalListing}
 */
export function parseManualListing(input) {
  return createCanonicalListing({ ...input, source_type: input.source_type ?? 'manual' });
}
