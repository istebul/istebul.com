import { parseManualListing } from './manual-parser.js';
import { parseJsonListing } from './json-parser.js';
import { parseCsvListing } from './csv-parser.js';
import { parsePartnerListing, PARTNER_SOURCE_TYPES } from './partner-parser.js';

/** @typedef {'manual'|'json'|'csv'|'sahibinden'|'arabam'|'emlak'|'partner_api'|'admin_import'} ListingSourceType */

/**
 * @param {unknown} input
 * @param {ListingSourceType|string} [sourceType]
 * @returns {import('../models/canonical-listing.js').CanonicalListing}
 */
export function parseListingInput(input, sourceType = 'manual') {
  const raw = input && typeof input === 'object' ? /** @type {Record<string, unknown>} */ (input) : {};
  const resolvedSource = String(sourceType || raw.source_type || 'manual').trim().toLowerCase();

  if (resolvedSource === 'json' || resolvedSource === 'admin_import') {
    return parseJsonListing({ ...raw, source_type: resolvedSource });
  }
  if (resolvedSource === 'csv') {
    return parseCsvListing(raw);
  }
  if (PARTNER_SOURCE_TYPES.has(resolvedSource)) {
    return parsePartnerListing(raw, resolvedSource);
  }
  return parseManualListing({ ...raw, source_type: resolvedSource });
}

export { parseManualListing, parseJsonListing, parseCsvListing, parsePartnerListing, PARTNER_SOURCE_TYPES };
