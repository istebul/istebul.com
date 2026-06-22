/**
 * Karar Nabzı — local tracked decision store (pure, injectable storage).
 */

export const KARAR_NABZI_STORAGE_KEY = 'istebul_karar_nabzi_v1';
export const MAX_TRACKED_DECISIONS = 24;

/**
 * @param {Storage|{ getItem?: Function, setItem?: Function }|null|undefined} preferred
 * @returns {Storage|null}
 */
function resolveStorage(preferred) {
  if (preferred && typeof preferred.getItem === 'function' && typeof preferred.setItem === 'function') {
    return /** @type {Storage} */ (preferred);
  }
  if (typeof localStorage !== 'undefined') return localStorage;
  return null;
}

/**
 * @param {Storage|null|undefined} storage
 * @returns {object[]}
 */
function readList(storage) {
  const store = resolveStorage(storage);
  if (!store) return [];

  try {
    const raw = store.getItem(KARAR_NABZI_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * @param {object[]} list
 * @param {Storage|null|undefined} storage
 */
function writeList(list, storage) {
  const store = resolveStorage(storage);
  if (!store) return false;

  try {
    store.setItem(KARAR_NABZI_STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {object} snapshot
 * @param {Storage|null|undefined} [storage]
 * @returns {object|null}
 */
export function saveTrackedDecision(snapshot = {}, storage) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  if (!snapshot.id || snapshot.tracked !== true) return null;

  const entry = { ...snapshot };
  const list = [
    entry,
    ...readList(storage).filter((item) => item.id !== entry.id)
  ].slice(0, MAX_TRACKED_DECISIONS);

  if (!writeList(list, storage)) return null;
  return entry;
}

/**
 * @param {Storage|null|undefined} [storage]
 * @returns {object[]}
 */
export function listTrackedDecisions(storage) {
  return readList(storage);
}

/**
 * @param {string} id
 * @param {Storage|null|undefined} [storage]
 * @returns {boolean}
 */
export function isTrackedDecision(id, storage) {
  if (!id) return false;
  return readList(storage).some((item) => item.id === id);
}

/**
 * @param {string} id
 * @param {Storage|null|undefined} [storage]
 * @returns {boolean}
 */
export function removeTrackedDecision(id, storage) {
  if (!id) return false;
  const list = readList(storage).filter((item) => item.id !== id);
  if (list.length === readList(storage).length) return false;
  return writeList(list, storage);
}

/** @deprecated Use removeTrackedDecision */
export const untrackDecision = removeTrackedDecision;
