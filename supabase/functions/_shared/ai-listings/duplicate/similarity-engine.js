/**
 * Weighted listing similarity — Sprint-3 duplicate detection.
 */

import { clampScore, safeNumber } from '../engine/score-utils.js';
import { buildFingerprintParts } from './fingerprint-engine.js';

/** @type {Readonly<Record<string, number>>} */
export const SIMILARITY_WEIGHTS = Object.freeze({
  title: 20,
  brand: 15,
  model: 15,
  year: 10,
  km: 10,
  price: 10,
  fuel: 5,
  transmission: 5,
  description: 10
});

/**
 * @param {unknown} left
 * @param {unknown} right
 * @returns {number}
 */
function compareExact(left, right) {
  const leftValue = String(left ?? '').trim();
  const rightValue = String(right ?? '').trim();
  if (!leftValue && !rightValue) return 1;
  if (!leftValue || !rightValue) return 0;
  return leftValue === rightValue ? 1 : 0;
}

/**
 * @param {string} left
 * @param {string} right
 * @returns {number}
 */
function compareTokenOverlap(left, right) {
  const leftTokens = new Set(left.split(/\s+/).filter(Boolean));
  const rightTokens = new Set(right.split(/\s+/).filter(Boolean));
  if (leftTokens.size === 0 && rightTokens.size === 0) return 1;
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1;
  }

  return overlap / Math.max(leftTokens.size, rightTokens.size);
}

/**
 * @param {unknown} left
 * @param {unknown} right
 * @returns {number}
 */
function compareNumeric(left, right) {
  const leftValue = safeNumber(left);
  const rightValue = safeNumber(right);
  if (leftValue <= 0 && rightValue <= 0) return 1;
  if (leftValue <= 0 || rightValue <= 0) return 0;

  const delta = Math.abs(leftValue - rightValue);
  const maxValue = Math.max(leftValue, rightValue);
  const ratio = 1 - delta / maxValue;
  if (ratio >= 0.95) return 1;
  if (ratio >= 0.85) return 0.8;
  if (ratio >= 0.7) return 0.5;
  return 0;
}

/**
 * @param {Record<string, unknown>} leftParts
 * @param {Record<string, unknown>} rightParts
 * @returns {number}
 */
export function computeSimilarityScore(leftParts, rightParts) {
  if (compareExact(leftParts.category, rightParts.category) === 0) {
    return 0;
  }

  if (
    leftParts.source_url &&
    rightParts.source_url &&
    leftParts.source_url === rightParts.source_url
  ) {
    return 100;
  }

  let score = 0;
  score += SIMILARITY_WEIGHTS.title * compareTokenOverlap(String(leftParts.title), String(rightParts.title));
  score += SIMILARITY_WEIGHTS.brand * compareExact(leftParts.brand, rightParts.brand);
  score += SIMILARITY_WEIGHTS.model * compareExact(leftParts.model, rightParts.model);
  score += SIMILARITY_WEIGHTS.year * compareNumeric(leftParts.year, rightParts.year);
  score += SIMILARITY_WEIGHTS.km * compareNumeric(leftParts.km, rightParts.km);
  score += SIMILARITY_WEIGHTS.price * compareNumeric(leftParts.price, rightParts.price);
  score += SIMILARITY_WEIGHTS.fuel * compareExact(leftParts.fuel, rightParts.fuel);
  score += SIMILARITY_WEIGHTS.transmission * compareExact(leftParts.transmission, rightParts.transmission);
  score +=
    SIMILARITY_WEIGHTS.description *
    compareTokenOverlap(String(leftParts.description), String(rightParts.description));

  return clampScore(score);
}

/**
 * @param {Record<string, unknown>} leftListing
 * @param {Record<string, unknown>} rightListing
 * @returns {number}
 */
export function computeListingSimilarity(leftListing, rightListing) {
  const leftParts = buildFingerprintParts(leftListing);
  const rightParts = buildFingerprintParts(rightListing);
  return computeSimilarityScore(leftParts, rightParts);
}
