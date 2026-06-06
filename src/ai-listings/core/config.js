/**
 * isteBul AI Listings Engine v1 — runtime configuration.
 *
 * INACTIVE BY DEFAULT. This module is isolated from production routes and UI.
 * Enable only via explicit env override during integration testing.
 */

/** @type {boolean|null} */
let runtimeOverride = null;

const STORAGE_KEY = 'istebul_ai_listings_v1';
const URL_PARAM = 'ai_listings';
const ENV_KEY = 'AI_LISTINGS_ENABLED';

/**
 * Read feature flag from window.__env (Cloudflare / Netlify inject).
 * @returns {boolean|null}
 */
function readEnvFlag() {
  try {
    const env = typeof window !== 'undefined' ? window.__env : null;
    const raw = env?.[ENV_KEY];
    if (raw === 'false' || raw === '0') return false;
    if (raw === 'true' || raw === '1') return true;
  } catch {
    // ignore
  }
  return null;
}

/**
 * Read feature flag from URL query param (dev / QA only).
 * @returns {boolean|null}
 */
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

/**
 * Read feature flag from localStorage override.
 * @returns {boolean|null}
 */
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
 * AI Listings Engine is disabled unless explicitly enabled.
 * Default: false (inactive, feature-ready).
 * @returns {boolean}
 */
export function isAiListingsEnabled() {
  const env = readEnvFlag();
  if (env === true) return true;
  if (env === false) return false;

  const url = readUrlFlag();
  if (url === true) return true;
  if (url === false) return false;

  const storage = readStorageFlag();
  if (storage === true) return true;
  if (storage === false) return false;

  return false;
}

/**
 * @param {boolean} enabled
 */
export function setAiListingsLocalOverride(enabled) {
  runtimeOverride = Boolean(enabled);
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // ignore
  }
}

/** Clear in-memory override (mainly for tests). */
export function clearAiListingsLocalOverride() {
  runtimeOverride = null;
}

/** @type {boolean|null} */
let supabaseRuntimeOverride = null;

const SUPABASE_ENV_KEY = 'AI_LISTINGS_SUPABASE_ENABLED';

/**
 * Read Supabase adapter flag from window.__env.
 * @returns {boolean|null}
 */
function readSupabaseEnvFlag() {
  try {
    const env = typeof window !== 'undefined' ? window.__env : null;
    const raw = env?.[SUPABASE_ENV_KEY];
    if (raw === 'false' || raw === '0') return false;
    if (raw === 'true' || raw === '1') return true;
  } catch {
    // ignore
  }
  return null;
}

/**
 * Supabase repository adapter is disabled unless explicitly enabled.
 * Default: false (inactive, not wired in DI container).
 * @returns {boolean}
 */
export function isAiListingsSupabaseAdapterEnabled() {
  if (supabaseRuntimeOverride === true) return true;
  if (supabaseRuntimeOverride === false) return false;

  const env = readSupabaseEnvFlag();
  if (env === true) return true;
  return false;
}

/**
 * @param {boolean} enabled
 */
export function setAiListingsSupabaseLocalOverride(enabled) {
  supabaseRuntimeOverride = Boolean(enabled);
}

/** Clear Supabase adapter override (mainly for tests). */
export function clearAiListingsSupabaseLocalOverride() {
  supabaseRuntimeOverride = null;
}

export const AI_LISTINGS_MODULE_VERSION = '1.0.0-placeholder';
export const AI_LISTINGS_MODULE_ID = 'ai-listings-engine-v1';

export { STORAGE_KEY, URL_PARAM, ENV_KEY, SUPABASE_ENV_KEY };
