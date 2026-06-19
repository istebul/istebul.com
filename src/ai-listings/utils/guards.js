/**
 * isteBul AI Listings Engine v1 — shared guards and helpers.
 */

import { SCORE_MAX, SCORE_MIN } from '../core/constants.js';

/**
 * @param {number} value
 * @param {number} [min]
 * @param {number} [max]
 * @returns {number}
 */
export function clampScore(value, min = SCORE_MIN, max = SCORE_MAX) {
  return Math.min(max, Math.max(min, Math.round(Number(value) || 0)));
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * @param {unknown} value
 * @returns {number}
 */
export function safeNumber(value) {
  const n = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
