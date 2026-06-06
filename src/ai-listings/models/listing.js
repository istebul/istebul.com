/**
 * isteBul AI Listings Engine v1 — Listing domain model.
 */

import { DEFAULT_CURRENCY, LISTING_CATEGORIES } from '../core/constants.js';

/**
 * @typedef {Record<string, string | number | boolean | null>} ListingAttributes
 */

/**
 * Canonical listing interface for AI analysis pipelines.
 * @typedef {Object} Listing
 * @property {string} id
 * @property {string} category
 * @property {string} title
 * @property {string} description
 * @property {string} location
 * @property {number} price
 * @property {string} currency
 * @property {string[]} images
 * @property {ListingAttributes} attributes
 * @property {string} created_at ISO-8601 timestamp
 * @property {string} updated_at ISO-8601 timestamp
 */

/**
 * @typedef {Partial<Listing>} ListingInput
 */

/**
 * Create an empty listing scaffold for tests and future ingestion.
 * @param {ListingInput} [overrides]
 * @returns {Listing}
 */
export function createEmptyListing(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? '',
    category: overrides.category ?? 'general',
    title: overrides.title ?? '',
    description: overrides.description ?? '',
    location: overrides.location ?? '',
    price: overrides.price ?? 0,
    currency: overrides.currency ?? DEFAULT_CURRENCY,
    images: overrides.images ?? [],
    attributes: overrides.attributes ?? {},
    created_at: overrides.created_at ?? now,
    updated_at: overrides.updated_at ?? now
  };
}

/**
 * Validate listing shape (lightweight; no business rules yet).
 * @param {unknown} value
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateListing(value) {
  const errors = [];
  if (!value || typeof value !== 'object') {
    return { valid: false, errors: ['Listing must be an object'] };
  }

  const listing = /** @type {Listing} */ (value);

  if (!listing.id || typeof listing.id !== 'string') errors.push('id is required');
  if (!listing.category || typeof listing.category !== 'string') errors.push('category is required');
  else if (!LISTING_CATEGORIES.includes(listing.category)) {
    errors.push(`category must be one of: ${LISTING_CATEGORIES.join(', ')}`);
  }
  if (typeof listing.title !== 'string') errors.push('title must be a string');
  if (typeof listing.description !== 'string') errors.push('description must be a string');
  if (typeof listing.location !== 'string') errors.push('location must be a string');
  if (!Number.isFinite(listing.price) || listing.price < 0) errors.push('price must be a non-negative number');
  if (typeof listing.currency !== 'string' || !listing.currency) errors.push('currency is required');
  if (!Array.isArray(listing.images)) errors.push('images must be an array');
  if (!listing.attributes || typeof listing.attributes !== 'object') errors.push('attributes must be an object');
  if (!listing.created_at) errors.push('created_at is required');
  if (!listing.updated_at) errors.push('updated_at is required');

  return { valid: errors.length === 0, errors };
}
