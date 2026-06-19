import { createCanonicalListing } from '../models/canonical-listing.js';

/**
 * CSV row adapter — future bulk import hook.
 * @param {Record<string, unknown>} row
 * @returns {import('../models/canonical-listing.js').CanonicalListing}
 */
export function parseCsvListing(row) {
  return createCanonicalListing({
    ...row,
    source_type: row.source_type ?? 'csv'
  });
}
