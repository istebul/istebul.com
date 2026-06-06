/**
 * isteBul AI Listings Engine v1 — pricing score engine.
 */

import { clampScore } from '../utils/guards.js';

/** @typedef {import('../models/listing.js').Listing} Listing */
/** @typedef {import('../repository/adapters/pricing-data-adapter.interface.js').PricingBenchmark} PricingBenchmark */

/**
 * @param {{ listing: Listing, benchmark: PricingBenchmark|null }} input
 * @returns {number}
 */
export function computePriceScore(input) {
  const { listing, benchmark } = input;

  if (!benchmark?.median_price || listing.price <= 0) {
    // TODO: Use category heuristics when benchmark unavailable
    return listing.price > 0 ? 40 : 0;
  }

  const ratio = listing.price / benchmark.median_price;
  if (ratio >= 0.85 && ratio <= 1.15) return clampScore(85);
  if (ratio >= 0.7 && ratio <= 1.3) return clampScore(65);
  if (ratio >= 0.5 && ratio <= 1.5) return clampScore(45);
  return clampScore(25);
}
