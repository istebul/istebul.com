/**
 * isteBul AI Listings Engine — housing (real estate) category scoring (deterministic).
 */

import { clampScore, safeNumber } from '../utils/guards.js';
import {
  CITY_LOCATION_SCORE,
  HOUSING_SQM_BENCHMARK,
  normalizeCityKey,
  readAttribute
} from './scoring-rules.js';

/** @typedef {import('../models/listing.js').Listing} Listing */

/**
 * @typedef {Object} HousingFactorScores
 * @property {number} price_score
 * @property {number} location_score
 * @property {number} size_score
 * @property {number} building_age_score
 * @property {number} risk_score
 */

/**
 * @param {string} location
 * @returns {number}
 */
export function computeHousingLocationScore(location) {
  const cityKey = normalizeCityKey(location);
  return CITY_LOCATION_SCORE[cityKey] ?? CITY_LOCATION_SCORE.default;
}

/**
 * @param {number} sqm
 * @param {number} rooms
 * @returns {number}
 */
export function computeHousingSizeScore(sqm, rooms) {
  const area = safeNumber(sqm);
  const roomCount = Math.max(1, safeNumber(rooms));
  if (area <= 0) return 40;

  const sqmPerRoom = area / roomCount;
  if (sqmPerRoom >= 25 && sqmPerRoom <= 45) return 85;
  if (sqmPerRoom >= 18 && sqmPerRoom <= 55) return 70;
  if (sqmPerRoom >= 12 && sqmPerRoom <= 65) return 55;
  return 40;
}

/**
 * @param {number} buildingAge
 * @returns {number}
 */
export function computeHousingBuildingAgeScore(buildingAge) {
  const age = safeNumber(buildingAge);
  if (age < 0) return 40;
  if (age <= 5) return 90;
  if (age <= 15) return 75;
  if (age <= 30) return 60;
  if (age <= 50) return 45;
  return 35;
}

/**
 * @param {number} price
 * @param {number} sqm
 * @param {string} location
 * @returns {number}
 */
export function computeHousingPriceScore(price, sqm, location) {
  const listingPrice = safeNumber(price);
  const area = safeNumber(sqm);
  if (listingPrice <= 0 || area <= 0) return listingPrice > 0 ? 40 : 0;

  const cityKey = normalizeCityKey(location);
  const benchmark = HOUSING_SQM_BENCHMARK[cityKey] ?? HOUSING_SQM_BENCHMARK.default;
  const sqmPrice = listingPrice / area;
  const ratio = sqmPrice / benchmark;

  if (ratio >= 0.85 && ratio <= 1.15) return 85;
  if (ratio >= 0.7 && ratio <= 1.3) return 70;
  if (ratio >= 0.55 && ratio <= 1.45) return 55;
  return 35;
}

/**
 * @param {HousingFactorScores} factors
 * @returns {number}
 */
export function computeHousingRiskScore(factors) {
  const composite =
    factors.location_score * 0.3 +
    factors.size_score * 0.2 +
    factors.building_age_score * 0.2 +
    factors.price_score * 0.3;
  return clampScore(100 - composite);
}

/**
 * @param {Listing} listing
 * @returns {HousingFactorScores & { market_score: number, ai_score: number, confidence: number }}
 */
export function computeHousingScores(listing) {
  const attrs = listing.attributes ?? {};
  const sqm = safeNumber(readAttribute(attrs, ['sqm', 'metrekare', 'size_sqm']));
  const rooms = safeNumber(readAttribute(attrs, ['rooms', 'oda_sayisi', 'room_count']));
  const buildingAge = safeNumber(readAttribute(attrs, ['building_age', 'bina_yasi', 'age_years']));

  const location_score = computeHousingLocationScore(listing.location);
  const size_score = computeHousingSizeScore(sqm, rooms);
  const building_age_score = computeHousingBuildingAgeScore(buildingAge);
  const price_score = computeHousingPriceScore(listing.price, sqm, listing.location);
  const risk_score = computeHousingRiskScore({
    location_score,
    size_score,
    building_age_score,
    price_score
  });

  const market_score = clampScore(location_score * 0.6 + building_age_score * 0.4);
  const ai_score = clampScore(
    price_score * 0.3 +
      location_score * 0.25 +
      size_score * 0.2 +
      building_age_score * 0.15 +
      (100 - risk_score) * 0.1
  );

  const hasCore =
    sqm > 0 &&
    rooms > 0 &&
    buildingAge >= 0 &&
    listing.price > 0 &&
    listing.location.trim().length > 0 &&
    listing.title.trim().length > 0;
  const confidence = hasCore ? 0.84 : listing.price > 0 && listing.title ? 0.58 : 0.36;

  return {
    price_score,
    location_score,
    size_score,
    building_age_score,
    risk_score,
    market_score,
    ai_score,
    confidence
  };
}
