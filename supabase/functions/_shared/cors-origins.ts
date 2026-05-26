/** Production + Cloudflare Pages preview deployment origins (e.g. 8fe0aca7.istebul-com.pages.dev). */
export const STATIC_ALLOWED_ORIGINS = [
  "https://istebul.com",
  "https://www.istebul.com",
  "https://istebul-com.pages.dev",
];

export const LOCAL_DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
];

export const PAGES_PREVIEW_ORIGIN_RE = /^https:\/\/[a-z0-9]+\.istebul-com\.pages\.dev$/i;

export type CorsOriginOptions = {
  allowLocalDev?: boolean;
};

export function isAllowedOrigin(
  origin: string | null | undefined,
  options: CorsOriginOptions = {}
): boolean {
  if (!origin) return false;
  if (STATIC_ALLOWED_ORIGINS.includes(origin)) return true;
  if (PAGES_PREVIEW_ORIGIN_RE.test(origin)) return true;
  if (options.allowLocalDev && LOCAL_DEV_ORIGINS.includes(origin)) return true;
  return false;
}

export function resolveCorsOrigin(
  origin: string | null | undefined,
  fallback = "https://www.istebul.com",
  options: CorsOriginOptions = {}
): string {
  return isAllowedOrigin(origin, options) ? (origin as string) : fallback;
}
