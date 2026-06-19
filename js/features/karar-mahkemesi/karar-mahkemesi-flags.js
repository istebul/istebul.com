/**
 * Karar Mahkemesi Beta — feature flag (opt-in, default off).
 */

export const KARAR_MAHKEMESI_URL_PARAM = 'karar_mahkemesi';
export const KARAR_MAHKEMESI_STORAGE_KEY = 'kararMahkemesiBeta';

/**
 * @param {string|null|undefined} raw
 * @returns {boolean|null}
 */
function parseTruthyFlag(raw) {
  if (raw == null || raw === '') return null;
  const value = String(raw).trim().toLowerCase();
  if (value === '1' || value === 'true' || value === 'on') return true;
  if (value === '0' || value === 'false' || value === 'off') return false;
  return null;
}

/**
 * @param {URLSearchParams|{ get?: (key: string) => string|null }|null|undefined} searchParamsLike
 * @returns {boolean|null}
 */
function readUrlFlag(searchParamsLike) {
  try {
    let params = searchParamsLike;
    if (!params) {
      if (typeof window === 'undefined' || !window.location?.search) return null;
      params = new URLSearchParams(window.location.search);
    }
    if (typeof params.get !== 'function') return null;
    return parseTruthyFlag(params.get(KARAR_MAHKEMESI_URL_PARAM));
  } catch {
    return null;
  }
}

/**
 * @param {{ getItem?: (key: string) => string|null }|null|undefined} storageLike
 * @returns {boolean|null}
 */
function readStorageFlag(storageLike) {
  try {
    let storage = storageLike;
    if (!storage) {
      if (typeof localStorage === 'undefined') return null;
      storage = localStorage;
    }
    if (typeof storage.getItem !== 'function') return null;
    return parseTruthyFlag(storage.getItem(KARAR_MAHKEMESI_STORAGE_KEY));
  } catch {
    return null;
  }
}

/**
 * @param {URLSearchParams|{ get?: (key: string) => string|null }|null} [searchParamsLike]
 * @param {{ getItem?: (key: string) => string|null }|null} [storageLike]
 * @returns {boolean}
 */
export function isKararMahkemesiEnabled(searchParamsLike, storageLike) {
  const urlFlag = readUrlFlag(searchParamsLike);
  if (urlFlag === true) return true;
  if (urlFlag === false) return false;

  const storageFlag = readStorageFlag(storageLike);
  if (storageFlag === true) return true;
  if (storageFlag === false) return false;

  return false;
}
