/**
 * isteBul AI Listings Engine — vehicle category scoring (deterministic).
 */

import { clampScore, safeNumber } from '../utils/guards.js';
import {
  CURRENT_YEAR,
  readAttribute,
  VEHICLE_FUEL_SCORE,
  VEHICLE_REFERENCE_PRICE
} from './scoring-rules.js';

/** @typedef {import('../models/listing.js').Listing} Listing */

/**
 * @typedef {Object} VehicleFactorScores
 * @property {number} price_score
 * @property {number} mileage_score
 * @property {number} age_score
 * @property {number} fuel_score
 * @property {number} risk_score
 */

/**
 * @param {number} year
 * @returns {number}
 */
export function computeVehicleAgeScore(year) {
  const modelYear = safeNumber(year);
  if (modelYear <= 1990) return 30;
  const ageYears = Math.max(0, CURRENT_YEAR - modelYear);
  if (ageYears <= 3) return 90;
  if (ageYears <= 7) return 75;
  if (ageYears <= 12) return 60;
  if (ageYears <= 18) return 45;
  return 30;
}

/**
 * @param {number} km
 * @returns {number}
 */
export function computeVehicleMileageScore(km) {
  const mileage = safeNumber(km);
  if (mileage < 0) return 30;
  if (mileage <= 30_000) return 90;
  if (mileage <= 80_000) return 75;
  if (mileage <= 150_000) return 60;
  if (mileage <= 250_000) return 45;
  return 30;
}

/**
 * @param {string} fuel
 * @returns {number}
 */
export function computeVehicleFuelScore(fuel) {
  const key = String(fuel ?? 'benzin')
    .trim()
    .toLocaleLowerCase('tr-TR');
  return VEHICLE_FUEL_SCORE[key] ?? 50;
}

/**
 * @param {number} price
 * @param {number} year
 * @returns {number}
 */
export function computeVehiclePriceScore(price, year) {
  const listingPrice = safeNumber(price);
  if (listingPrice <= 0) return 0;

  const modelYear = safeNumber(year);
  const ageYears = modelYear > 0 ? Math.max(0, CURRENT_YEAR - modelYear) : 8;
  const depreciation = Math.pow(0.88, ageYears);
  const expected = VEHICLE_REFERENCE_PRICE * depreciation;
  const ratio = listingPrice / expected;

  if (ratio >= 0.8 && ratio <= 1.1) return 85;
  if (ratio >= 0.65 && ratio <= 1.25) return 70;
  if (ratio >= 0.5 && ratio <= 1.4) return 55;
  return 35;
}

/**
 * @param {VehicleFactorScores} factors
 * @returns {number}
 */
export function computeVehicleRiskScore(factors) {
  const composite =
    factors.age_score * 0.25 +
    factors.mileage_score * 0.35 +
    factors.price_score * 0.25 +
    factors.fuel_score * 0.15;
  return clampScore(100 - composite);
}

/**
 * @param {Listing} listing
 * @returns {VehicleFactorScores & { market_score: number, ai_score: number, confidence: number }}
 */
export function computeVehicleScores(listing) {
  const attrs = listing.attributes ?? {};
  const year = safeNumber(readAttribute(attrs, ['year', 'yil', 'model_year']));
  const km = safeNumber(readAttribute(attrs, ['mileage', 'km', 'kilometre']));
  const fuel = String(readAttribute(attrs, ['fuel_type', 'yakit_turu', 'fuel']) ?? 'benzin');

  const age_score = computeVehicleAgeScore(year);
  const mileage_score = computeVehicleMileageScore(km);
  const fuel_score = computeVehicleFuelScore(fuel);
  const price_score = computeVehiclePriceScore(listing.price, year);
  const risk_score = computeVehicleRiskScore({ age_score, mileage_score, price_score, fuel_score });

  const market_score = clampScore((age_score + fuel_score) / 2);
  const ai_score = clampScore(
    price_score * 0.3 + mileage_score * 0.25 + age_score * 0.25 + fuel_score * 0.1 + (100 - risk_score) * 0.1
  );

  const hasCore =
    year > 0 && km >= 0 && listing.price > 0 && listing.location.trim().length > 0 && listing.title.trim().length > 0;
  const confidence = hasCore ? 0.82 : listing.price > 0 && listing.title ? 0.55 : 0.35;

  return {
    price_score,
    mileage_score,
    age_score,
    fuel_score,
    risk_score,
    market_score,
    ai_score,
    confidence
  };
}
