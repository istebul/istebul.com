/** Production + Cloudflare Pages preview deployment origins. */
export const STATIC_ALLOWED_ORIGINS = [
  'https://istebul.com',
  'https://www.istebul.com',
  'https://istebul-com.pages.dev'
];

/** Per-deployment / branch preview URLs (e.g. 8fe0aca7.istebul-com.pages.dev, feature-x.istebul-com.pages.dev). */
export const PAGES_PREVIEW_ORIGIN_RE =
  /^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.istebul-com\.pages\.dev$/i;

export const LOCAL_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

/**
 * @param {string | null | undefined} origin
 * @param {{ allowLocalDev?: boolean }} [options]
 */
export function isAllowedOrigin(origin, options = {}) {
  if (!origin) return false;
  if (STATIC_ALLOWED_ORIGINS.includes(origin)) return true;
  if (PAGES_PREVIEW_ORIGIN_RE.test(origin)) return true;
  if (options.allowLocalDev && LOCAL_DEV_ORIGINS.includes(origin)) return true;
  return false;
}

/**
 * @param {string | null | undefined} origin
 * @param {string} [fallback]
 * @param {{ allowLocalDev?: boolean }} [options]
 */
export function resolveCorsOrigin(origin, fallback = 'https://www.istebul.com', options = {}) {
  return isAllowedOrigin(origin, options) ? origin : fallback;
}
