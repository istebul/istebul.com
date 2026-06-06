/**
 * isteBul AI Listings Engine v1 — shared constants.
 */

/** Supported listing categories (extensible). */
export const LISTING_CATEGORIES = Object.freeze([
  'vehicle',
  'housing',
  'vacation',
  'general'
]);

/** Default currency for Turkish marketplace context. */
export const DEFAULT_CURRENCY = 'TRY';

/** Score bounds for all engine outputs. */
export const SCORE_MIN = 0;
export const SCORE_MAX = 100;

/** Confidence bounds. */
export const CONFIDENCE_MIN = 0;
export const CONFIDENCE_MAX = 1;

/** External data source identifiers for adapter wiring. */
export const DATA_SOURCE_IDS = Object.freeze({
  USER_LISTINGS: 'user_listings',
  PARTNER_API: 'partner_api',
  OPEN_DATA: 'open_data',
  EVDS: 'evds',
  TUIK: 'tuik',
  AI_MODEL: 'ai_model'
});
