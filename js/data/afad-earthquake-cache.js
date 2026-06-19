/**
 * AFAD deprem verisi — in-memory önbellek (feature-flag foundation).
 */

export const AFAD_EARTHQUAKE_CACHE_DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;

/** @type {Map<string, { value: unknown, expiresAt: number }>} */
const memoryStore = new Map();

function nowMs() {
  return Date.now();
}

/**
 * @param {string} namespace
 * @param {Record<string, string|number|null|undefined>} [parts]
 */
export function buildAfadEarthquakeCacheKey(namespace = 'default', parts = {}) {
  const segment = Object.entries(parts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value ?? '').trim().toLocaleLowerCase('tr-TR')}`)
    .join('|');
  return segment ? `${namespace}:${segment}` : namespace;
}

/**
 * @param {string} key
 */
export function getAfadEarthquakeCacheEntry(key) {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= nowMs()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

/**
 * @param {string} key
 * @param {unknown} value
 * @param {number} [ttlMs]
 */
export function setAfadEarthquakeCacheEntry(key, value, ttlMs = AFAD_EARTHQUAKE_CACHE_DEFAULT_TTL_MS) {
  const ttl = Number(ttlMs);
  const safeTtl = Number.isFinite(ttl) && ttl > 0 ? ttl : AFAD_EARTHQUAKE_CACHE_DEFAULT_TTL_MS;
  memoryStore.set(key, {
    value,
    expiresAt: nowMs() + safeTtl
  });
}

/**
 * @param {string} [namespacePrefix]
 */
export function clearAfadEarthquakeCache(namespacePrefix = '') {
  if (!namespacePrefix) {
    memoryStore.clear();
    return;
  }
  for (const key of memoryStore.keys()) {
    if (key.startsWith(`${namespacePrefix}:`) || key === namespacePrefix) {
      memoryStore.delete(key);
    }
  }
}

/** @internal test helper */
export function resetAfadEarthquakeCacheForTests() {
  memoryStore.clear();
}
