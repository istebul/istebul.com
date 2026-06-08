/**
 * Canonical listing fingerprint — Sprint-3 duplicate detection.
 */

import { normalizeCanonicalListing } from '../engine/canonical-engine.js';

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizeUrl(value) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/[#?].*$/, '')
    .replace(/\/+$/, '');
}

/**
 * @param {string} input
 * @returns {string}
 */
export function hashFingerprint(input) {
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {Record<string, unknown>}
 */
export function buildFingerprintParts(listing) {
  const canonical = normalizeCanonicalListing(listing);

  return {
    category: normalizeText(canonical.category),
    brand: normalizeText(canonical.brand),
    model: normalizeText(canonical.model),
    year: canonical.year ?? '',
    km: canonical.km ?? '',
    fuel: normalizeText(canonical.fuel),
    transmission: normalizeText(canonical.transmission),
    price: canonical.price ?? '',
    title: normalizeText(canonical.title),
    description: normalizeText(canonical.description),
    source_url: normalizeUrl(canonical.source_url)
  };
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {{ hash: string, parts: Record<string, unknown> }}
 */
export function buildListingFingerprint(listing) {
  const parts = buildFingerprintParts(listing);
  const serialized = Object.entries(parts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('|');

  return {
    hash: hashFingerprint(serialized),
    parts
  };
}
