/**
 * AI Recommendation Engine — listing filters (client).
 */

import { normalizeText } from '../ai-listings-search/normalizer.js';

/**
 * @param {Array<Record<string, unknown>>} listings
 * @param {Record<string, unknown>} profile
 * @returns {Array<Record<string, unknown>>}
 */
export function filterListingsForRecommendation(listings, profile) {
  const category = String(profile.category ?? 'vehicle').toLowerCase();
  return listings.filter((listing) => {
    if (String(listing.status ?? '') === 'archived') return false;
    const listingCategory = String(listing.category ?? 'general').toLowerCase();
    if (category === 'all' || category === 'general') return true;
    if (category === 'housing') return listingCategory === 'housing' || listingCategory === 'real_estate';
    return listingCategory === category;
  });
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @param {string|null|undefined} city
 * @returns {Array<Record<string, unknown>>}
 */
export function filterListingsByCity(listings, city) {
  if (!city) return listings;
  const target = normalizeText(city);
  return listings.filter((listing) => {
    const location = normalizeText(listing.location ?? listing.attributes?.city ?? '');
    if (!location) return true;
    return location.includes(target) || target.includes(location);
  });
}
