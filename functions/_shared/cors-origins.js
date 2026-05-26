/** Production + Cloudflare Pages preview deployment origins (e.g. 8fe0aca7.istebul-com.pages.dev). */
export const STATIC_ALLOWED_ORIGINS = [
  'https://istebul.com',
  'https://www.istebul.com',
  'https://istebul-com.pages.dev'
];

/** Per-deployment preview URLs from `pages deploy` / branch previews. */
export const PAGES_PREVIEW_ORIGIN_RE = /^https:\/\/[a-z0-9]+\.istebul-com\.pages\.dev$/i;

export function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (STATIC_ALLOWED_ORIGINS.includes(origin)) return true;
  return PAGES_PREVIEW_ORIGIN_RE.test(origin);
}

export function resolveCorsOrigin(origin, fallback = 'https://www.istebul.com') {
  return isAllowedOrigin(origin) ? origin : fallback;
}
