/**
 * isteBul AI Listings Edge API — path router.
 */

/** @type {ReadonlySet<string>} */
const KNOWN_RESOURCES = new Set(['listings', 'learning', 'data-pool', 'personalization']);

/**
 * @typedef {Object} ParsedRoute
 * @property {string} resource
 * @property {string|null} id
 * @property {string|null} action
 */

/**
 * @param {string} pathname
 * @returns {ParsedRoute}
 */
export function parseAiListingsRoute(pathname) {
  const normalized = pathname
    .replace(/^\/functions\/v1\/ai-listings/, '')
    .replace(/^\/ai-listings/, '')
    .replace(/\/$/, '') || '/';

  const segments = normalized.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { resource: 'unknown', id: null, action: null };
  }

  const resource = segments[0] ?? 'unknown';
  if (!KNOWN_RESOURCES.has(resource)) {
    return { resource: 'unknown', id: null, action: null };
  }

  if (segments.length === 1) {
    return { resource, id: null, action: null };
  }

  const id = segments[1] ?? null;
  const action = segments[2] ?? null;
  return { resource, id, action };
}
