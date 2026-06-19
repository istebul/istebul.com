/**
 * isteBul AI Listings Edge API — CORS for internal admin panel origins only.
 */

import { isAllowedOrigin } from '../cors-origins.js';

export const AI_LISTINGS_CORS_ALLOW_HEADERS =
  'authorization, apikey, x-client-info, content-type, x-ai-listings-secret';

export const AI_LISTINGS_CORS_ALLOW_METHODS = 'GET, POST, PATCH, OPTIONS';

/**
 * @param {string | null | undefined} origin
 * @returns {Record<string, string>}
 */
export function aiListingsCorsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Headers': AI_LISTINGS_CORS_ALLOW_HEADERS,
    'Access-Control-Allow-Methods': AI_LISTINGS_CORS_ALLOW_METHODS,
    Vary: 'Origin'
  };

  if (isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

/**
 * @param {string | null | undefined} origin
 */
export function preflightResponse(origin) {
  return new Response(null, { status: 204, headers: aiListingsCorsHeaders(origin) });
}
