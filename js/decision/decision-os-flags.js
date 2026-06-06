/**
 * Decision OS v1 — feature flag helpers (progressive enhancement).
 */

const STORAGE_KEY = 'istebul_decision_os_v1';
const URL_PARAM = 'decision_os';

/** @type {boolean|null} */
let runtimeOverride = null;

function readEnvFlag() {
  try {
    const env = typeof window !== 'undefined' ? window.__env : null;
    const raw = env?.DECISION_OS_ENABLED;
    if (raw === 'false' || raw === '0') return false;
    if (raw === 'true' || raw === '1') return true;
  } catch {
    // ignore
  }
  return null;
}

function readUrlFlag() {
  try {
    if (typeof window === 'undefined' || !window.location?.search) return null;
    const params = new URLSearchParams(window.location.search);
    const value = params.get(URL_PARAM);
    if (value === '0' || value === 'false') return false;
    if (value === '1' || value === 'true') return true;
  } catch {
    // ignore
  }
  return null;
}

function readStorageFlag() {
  if (runtimeOverride === false) return false;
  if (runtimeOverride === true) return true;

  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'off') return false;
    if (raw === 'on') return true;
  } catch {
    // ignore
  }
  return null;
}

/**
 * Decision OS is enabled unless explicitly disabled via env, URL, or storage.
 * @returns {boolean}
 */
export function isDecisionOsEnabled() {
  const env = readEnvFlag();
  if (env === false) return false;

  const url = readUrlFlag();
  if (url === false) return false;
  if (url === true) return true;

  const storage = readStorageFlag();
  if (storage === false) return false;
  if (storage === true) return true;

  return env !== false;
}

/**
 * @param {boolean} enabled
 */
export function setDecisionOsLocalOverride(enabled) {
  runtimeOverride = Boolean(enabled);
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // ignore
  }
}

/**
 * Clear in-memory override (mainly for tests).
 */
export function clearDecisionOsLocalOverride() {
  runtimeOverride = null;
}

export { STORAGE_KEY, URL_PARAM };
