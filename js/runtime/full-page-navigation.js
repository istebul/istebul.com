/**
 * Paths that must bypass the SPA router (standalone HTML, Auto app, legal, partner).
 */
import { getExternalRedirect, stripPathname } from './route-surface.js';

const AUTO_PATH_PREFIX = '/auto';

/** Paths without .html that should still leave the SPA shell. */
const STATIC_ALIASES = Object.freeze({
  '/partner-olun': '/partner-olun.html',
  '/partner-docs': '/partner-docs.html',
  '/partner-basvuru': '/partner-basvuru.html',
  '/partner-planlar': '/partner-planlar.html',
  '/partner-guven': '/partner-guven.html',
  '/hakkimizda': '/hakkimizda.html',
  '/iletisim': '/iletisim.html'
});

/**
 * @param {string} href
 * @returns {string|null} Resolved absolute path to navigate to, or null for SPA
 */
export function resolveFullPageNavigation(href) {
  if (!href || typeof href !== 'string') return null;

  let url;
  try {
    url = new URL(href, typeof window !== 'undefined' ? window.location.origin : 'https://www.istebul.com');
  } catch {
    return null;
  }

  const pathname = url.pathname || '/';
  const stripped = stripPathname(pathname);

  if (stripped === AUTO_PATH_PREFIX || stripped.startsWith(`${AUTO_PATH_PREFIX}/`)) {
    return pathname.endsWith('/') ? pathname : `${pathname.replace(/\/$/, '')}/`;
  }

  if (/\.html$/i.test(pathname)) {
    return pathname;
  }

  const alias = STATIC_ALIASES[stripped];
  if (alias) {
    return alias;
  }

  const external = getExternalRedirect(stripped);
  if (external) {
    return external;
  }

  return null;
}

/**
 * @param {string} href
 * @returns {boolean}
 */
export function isFullPageNavigation(href) {
  return Boolean(resolveFullPageNavigation(href));
}
