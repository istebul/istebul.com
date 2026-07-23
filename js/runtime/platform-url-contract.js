/**
 * EPIC-003 / PR-574 — Runtime Platform URL contract (active cutover phase).
 *
 * Mirrors `src/platform/constants/platform-url-map.ts` TARGET/active values for
 * SPA-safe JS consumers. Do not invent parallel product entry URLs elsewhere.
 */

/** Active-phase product entry paths (trailing slash). */
export const PLATFORM_PRODUCT_ENTRY_URLS = Object.freeze({
  'istebul-ai': '/ai/',
  garsonai: '/garson/',
  business: '/business/'
});

/** Active-phase platform / AI surface paths. */
export const PLATFORM_SURFACE_ENTRY_URLS = Object.freeze({
  'platform-root': '/',
  'ai-landing': '/ai/',
  'ai-funnel': '/karar-asistani/',
  'ai-pricing': '/planlar'
});

/**
 * Legacy AI long-scroll hashes that must not live on Platform `/`.
 * Deep links redirect to `/ai/#…`.
 */
export const LEGACY_AI_HOME_HASH_IDS = Object.freeze([
  'home',
  'home-economic-indicators',
  'how-it-works',
  'home-vertical-focus',
  'home-features-strip',
  'pricing',
  'partner-enterprise',
  'landing-faq',
  'home-guides-strip',
  'home-final-cta',
  'home-auto-bridge',
  'methodology-teaser',
  'sample-preview',
  'trust'
]);

/**
 * @param {string} productId
 * @returns {string|null}
 */
export function getPlatformProductEntryUrl(productId) {
  return PLATFORM_PRODUCT_ENTRY_URLS[productId] || null;
}

/**
 * @param {string} surfaceKey
 * @returns {string|null}
 */
export function getPlatformSurfaceEntryUrl(surfaceKey) {
  return PLATFORM_SURFACE_ENTRY_URLS[surfaceKey] || null;
}

/**
 * Build a canonical product-entry href (path + optional hash).
 * @param {string} productId
 * @param {string} [hashId]
 * @returns {string|null}
 */
export function buildPlatformProductHref(productId, hashId = '') {
  const base = getPlatformProductEntryUrl(productId);
  if (!base) return null;
  const id = String(hashId || '').replace(/^#/, '');
  return id ? `${base}#${id}` : base;
}

/**
 * @param {string} pathname
 * @returns {string} stripped path without trailing slash (except root → `/`)
 */
export function stripPlatformPathname(pathname = '/') {
  const raw = pathname === '/index.html' ? '/' : String(pathname || '/');
  return raw.replace(/\/$/, '') || '/';
}

/**
 * Product-entry documents that must leave the SPA shell.
 * @param {string} pathname
 * @returns {boolean}
 */
export function isPlatformProductEntryPath(pathname = '/') {
  const stripped = stripPlatformPathname(pathname);
  return (
    stripped === '/ai' ||
    stripped.startsWith('/ai/') ||
    stripped === '/garson' ||
    stripped.startsWith('/garson/') ||
    stripped === '/business' ||
    stripped.startsWith('/business/')
  );
}

/**
 * Normalize a product-entry pathname to trailing-slash form.
 * @param {string} pathname
 * @returns {string|null}
 */
export function normalizePlatformProductEntryPath(pathname = '/') {
  if (!isPlatformProductEntryPath(pathname)) return null;
  const stripped = stripPlatformPathname(pathname);
  if (stripped === '/ai' || stripped.startsWith('/ai/')) {
    return stripped === '/ai' ? '/ai/' : `${stripped}/`.replace(/\/\/$/, '/');
  }
  if (stripped === '/garson' || stripped.startsWith('/garson/')) {
    return stripped === '/garson' ? '/garson/' : `${stripped}/`.replace(/\/\/$/, '/');
  }
  if (stripped === '/business' || stripped.startsWith('/business/')) {
    return stripped === '/business' ? '/business/' : `${stripped}/`.replace(/\/\/$/, '/');
  }
  return null;
}

/**
 * @param {string} hashId
 * @returns {boolean}
 */
export function isLegacyAiHomeHash(hashId = '') {
  const id = String(hashId || '').replace(/^#/, '');
  return LEGACY_AI_HOME_HASH_IDS.includes(id);
}

/**
 * Map a stale Platform-root AI hash to the AI Landing document URL.
 * @param {string} hashId
 * @returns {string|null}
 */
export function resolveLegacyAiHomeRedirect(hashId = '') {
  const id = String(hashId || '').replace(/^#/, '');
  if (!isLegacyAiHomeHash(id)) return null;
  return `/ai/#${id}`;
}

/**
 * Canonical AI Landing hash URL (`/ai/#section`).
 * @param {string} hashId
 * @returns {string}
 */
export function buildAiLandingHashHref(hashId = '') {
  const id = String(hashId || '').replace(/^#/, '');
  return id ? `/ai/#${id}` : '/ai/';
}
