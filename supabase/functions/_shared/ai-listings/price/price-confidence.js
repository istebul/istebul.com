/**
 * Price confidence scoring — AI Listings Price Intelligence v1.
 */

import { safeNumber, readAttribute } from '../engine/score-utils.js';

/**
 * @param {Record<string, unknown>} listing
 * @param {number} estimatedValue
 * @returns {number} confidence 0–1
 */
export function computePriceConfidence(listing, estimatedValue) {
  if (!Number.isFinite(estimatedValue) || estimatedValue <= 0) return 0;

  let score = 0.35;
  const category = String(listing.category ?? 'general').toLowerCase();

  const price = safeNumber(listing.price);
  if (price > 0) score += 0.15;

  if (category === 'vehicle') {
    if (safeNumber(listing.year ?? readAttribute(listing.attributes, ['year', 'yil'])) > 0) score += 0.12;
    if (safeNumber(listing.km ?? readAttribute(listing.attributes, ['km', 'mileage'])) >= 0 &&
        readAttribute(listing.attributes, ['km', 'mileage']) !== undefined) score += 0.1;
    if (String(listing.brand ?? readAttribute(listing.attributes, ['brand', 'marka']) ?? '').trim()) score += 0.08;
    if (String(listing.model ?? readAttribute(listing.attributes, ['model']) ?? '').trim()) score += 0.08;
    if (String(listing.fuel ?? readAttribute(listing.attributes, ['fuel', 'fuel_type']) ?? '').trim()) score += 0.04;
    if (String(listing.transmission ?? readAttribute(listing.attributes, ['transmission', 'vites']) ?? '').trim()) {
      score += 0.04;
    }
  } else if (category === 'housing' || category === 'real_estate') {
    if (safeNumber(readAttribute(listing.attributes, ['sqm', 'metrekare'])) > 0) score += 0.2;
    if (String(listing.location ?? '').trim()) score += 0.15;
  } else {
    if (String(listing.title ?? '').trim()) score += 0.1;
    if (String(listing.description ?? '').trim().length >= 40) score += 0.1;
  }

  return Math.round(Math.min(1, Math.max(0, score)) * 100) / 100;
}

/**
 * @param {number} confidence
 * @returns {boolean}
 */
export function hasSufficientPriceData(confidence) {
  return confidence >= 0.45;
}
