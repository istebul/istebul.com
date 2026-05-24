/**
 * Canonical browser storage keys for isteBul.
 * Legacy `istebu_*` keys are read once and migrated to `istebul_*`.
 */

export const STORAGE_KEYS = Object.freeze({
  COOKIE_CONSENT: 'istebul_cookie_consent',
  THEME: 'istebul_theme',
  FAVORITES: 'istebul_favorites',
  COMPARISON_ITEMS: 'istebul_comparison_items',
  DECISION_HISTORY: 'istebul_decision_history',
  SEARCH_HISTORY: 'istebul_search_history',
  NEWSLETTER: 'istebul_newsletter',
  MARKET_DATA: 'istebul_market_data',
  LOCAL_LISTINGS_PREFIX: 'istebul_local_listings:',
  LAST_BUILD_ID: 'istebul_last_build_id',
  CHECKOUT_INTENT: 'istebul_checkout_intent',
  PRO_ACTIVE: 'istebul_pro_active',
  AUTO_SESSION: 'istebul_auto_session',
  AUTO_LEAD_EMAIL: 'istebul_auto_lead_email',
  AUTO_LEAD_PAYLOAD: 'istebul_auto_lead_payload',
  AUTO_FINANCE_LEAD_CONTEXT: 'istebul_last_finance_lead_context',
  ANALYTICS_SESSION: 'istebul_analytics_session',
  ANALYTICS_ANON: 'istebul_analytics_anon',
  ATTRIBUTION: 'istebul_attribution',
  LAST_FUNNEL_STEP: 'istebul_last_funnel_step',
  ACCOUNT_ONBOARDING_DONE: 'istebul_account_onboarding_done'
});

/** @type {Record<string, string[]>} */
const LEGACY_ALIASES = {
  [STORAGE_KEYS.COOKIE_CONSENT]: ['istebu_cookie_consent'],
  [STORAGE_KEYS.THEME]: ['istebu_theme'],
  [STORAGE_KEYS.FAVORITES]: ['istebu_favorites'],
  [STORAGE_KEYS.COMPARISON_ITEMS]: ['istebu_comparison_items'],
  [STORAGE_KEYS.DECISION_HISTORY]: ['istebu_decision_history'],
  [STORAGE_KEYS.SEARCH_HISTORY]: ['istebu_search_history'],
  [STORAGE_KEYS.NEWSLETTER]: ['istebu_newsletter'],
  [STORAGE_KEYS.MARKET_DATA]: ['istebu_market_data']
};

/**
 * @param {string} key
 * @param {Storage} storage
 * @param {{ migrate?: boolean }} [options]
 */
export function readStorageRaw(key, storage = localStorage, options = {}) {
  const { migrate = true } = options;
  const value = storage.getItem(key);
  if (value !== null) return value;

  for (const legacyKey of LEGACY_ALIASES[key] || []) {
    const legacyValue = storage.getItem(legacyKey);
    if (legacyValue !== null) {
      if (migrate) {
        storage.setItem(key, legacyValue);
        storage.removeItem(legacyKey);
      }
      return legacyValue;
    }
  }

  return null;
}

export function writeStorageRaw(key, value, storage = localStorage) {
  storage.setItem(key, value);
}

export function removeStorageRaw(key, storage = localStorage) {
  storage.removeItem(key);
  for (const legacyKey of LEGACY_ALIASES[key] || []) {
    storage.removeItem(legacyKey);
  }
}

export function readStoredJson(key, fallback, storage = localStorage) {
  const raw = readStorageRaw(key, storage);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeStoredJson(key, value, storage = localStorage) {
  writeStorageRaw(key, JSON.stringify(value), storage);
}

export function userScopedKey(baseKey, userId) {
  return userId ? `${baseKey}:${userId}` : baseKey;
}
