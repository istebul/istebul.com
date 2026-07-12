/**
 * GarsonAI WhatsApp webhook duplicate event koruması.
 */

const DEDUPE_STORE_KEY = '__garsonWhatsAppDedupeStore__';
const DEFAULT_TTL_MS = 15 * 60 * 1000;

/**
 * @typedef {{ expiresAt: number }} DedupeEntry
 */

/**
 * @returns {Map<string, DedupeEntry>}
 */
function getDedupeStore() {
  const root = /** @type {Record<string, unknown>} */ (globalThis);
  if (!(root[DEDUPE_STORE_KEY] instanceof Map)) {
    root[DEDUPE_STORE_KEY] = new Map();
  }
  return /** @type {Map<string, DedupeEntry>} */ (root[DEDUPE_STORE_KEY]);
}

/**
 * @param {Map<string, DedupeEntry>} store
 * @param {number} [now]
 */
function pruneExpired(store, now = Date.now()) {
  for (const [key, entry] of store.entries()) {
    if (!entry || entry.expiresAt <= now) {
      store.delete(key);
    }
  }
}

/**
 * @param {string} eventKey
 * @param {{ ttlMs?: number, now?: number }} [options]
 * @returns {boolean}
 */
export function isDuplicateEvent(eventKey, options = {}) {
  const key = String(eventKey || '').trim();
  if (!key) return false;

  const store = getDedupeStore();
  const now = options.now ?? Date.now();
  pruneExpired(store, now);

  const existing = store.get(key);
  if (!existing) return false;
  if (existing.expiresAt <= now) {
    store.delete(key);
    return false;
  }
  return true;
}

/**
 * @param {string} eventKey
 * @param {{ ttlMs?: number, now?: number }} [options]
 * @returns {boolean}
 */
export function markEventProcessed(eventKey, options = {}) {
  const key = String(eventKey || '').trim();
  if (!key) return false;

  const store = getDedupeStore();
  const now = options.now ?? Date.now();
  const ttlMs = Math.max(1_000, options.ttlMs ?? DEFAULT_TTL_MS);

  pruneExpired(store, now);
  if (store.has(key)) {
    return false;
  }

  store.set(key, { expiresAt: now + ttlMs });
  return true;
}

/**
 * @param {string} messageId
 * @param {string} [phoneNumberId]
 * @returns {string}
 */
export function buildWebhookEventKey(messageId, phoneNumberId = '') {
  const id = String(messageId || '').trim();
  const phone = String(phoneNumberId || '').trim();
  return phone ? `${phone}:${id}` : id;
}

export function resetDuplicateEventStore() {
  const root = /** @type {Record<string, unknown>} */ (globalThis);
  root[DEDUPE_STORE_KEY] = new Map();
}
