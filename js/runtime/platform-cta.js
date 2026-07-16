/**
 * EPIC-003 / PR-574 — Shared Platform CTA href helper.
 *
 * Cards, nav, and footer should resolve product CTAs through this module
 * (or through platform-url-map.ts for typed catalog data).
 */

import {
  buildAiLandingHashHref,
  buildPlatformProductHref,
  getPlatformProductEntryUrl,
  getPlatformSurfaceEntryUrl,
  isLegacyAiHomeHash,
  resolveLegacyAiHomeRedirect
} from './platform-url-contract.js';

/**
 * Resolve a CTA href for a known platform product id.
 * @param {string} productId
 * @param {{ hashId?: string }} [options]
 * @returns {string|null}
 */
export function resolvePlatformProductCtaHref(productId, options = {}) {
  return buildPlatformProductHref(productId, options.hashId || '');
}

/**
 * Resolve chrome / footer utility hrefs from the surface map.
 * @param {'platform-root'|'ai-landing'|'ai-funnel'|'ai-pricing'} surfaceKey
 * @returns {string|null}
 */
export function resolvePlatformSurfaceCtaHref(surfaceKey) {
  return getPlatformSurfaceEntryUrl(surfaceKey);
}

/**
 * Rewrite stale Platform-root AI hashes to AI Landing.
 * Pass-through for already-canonical `/ai/#…` or platform hashes.
 * @param {string} href
 * @returns {string}
 */
export function normalizePlatformCtaHref(href) {
  const raw = String(href || '').trim();
  if (!raw) return raw;

  if (raw.startsWith('/#')) {
    const hashId = raw.slice(2).split('?')[0];
    if (isLegacyAiHomeHash(hashId)) {
      return resolveLegacyAiHomeRedirect(hashId) || buildAiLandingHashHref(hashId);
    }
    return raw;
  }

  if (raw.startsWith('#') && isLegacyAiHomeHash(raw.slice(1))) {
    return buildAiLandingHashHref(raw.slice(1));
  }

  return raw;
}

/**
 * @param {string} productId
 * @returns {string|null}
 */
export function getPlatformCtaEntryUrl(productId) {
  return getPlatformProductEntryUrl(productId);
}

export {
  buildAiLandingHashHref,
  buildPlatformProductHref,
  getPlatformProductEntryUrl,
  getPlatformSurfaceEntryUrl
};
