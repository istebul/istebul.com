/**
 * Site-style AI listings bootstrap — reads public flag from site_settings (anon key).
 * Same pattern as live-data-integrations.js and listing-analysis-intake.
 */

export const AI_LISTINGS_PUBLIC_SETTING_KEY = 'ai_listings_public_enabled';

function env() {
  return typeof window !== 'undefined' ? window.__env || {} : {};
}

function settingsMap(rows = []) {
  const map = {};
  rows.forEach((row) => {
    if (row?.key) map[row.key] = row.value;
  });
  return map;
}

export function parseBool(value) {
  if (value === true || value === 1) return true;
  const s = String(value ?? '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'on';
}

/**
 * @returns {Promise<{ aiListingsPublicEnabled: boolean, loaded: boolean }>}
 */
export async function fetchAiListingsSettings() {
  const { SUPABASE_URL: url, SUPABASE_ANON_KEY: key } = env();
  if (!url || !key || String(key).includes('placeholder')) {
    return { aiListingsPublicEnabled: false, loaded: false };
  }

  try {
    const res = await fetch(
      `${url.replace(/\/$/, '')}/rest/v1/site_settings?select=key,value&key=eq.${AI_LISTINGS_PUBLIC_SETTING_KEY}`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` }
      }
    );
    if (!res.ok) return { aiListingsPublicEnabled: false, loaded: false };
    const rows = await res.json();
    const map = settingsMap(rows);
    return {
      aiListingsPublicEnabled: parseBool(map[AI_LISTINGS_PUBLIC_SETTING_KEY]),
      loaded: true
    };
  } catch {
    return { aiListingsPublicEnabled: false, loaded: false };
  }
}

/**
 * Bootstrap AI listings site integration into window.__ibAiListings.
 * @returns {Promise<{ aiListingsPublicEnabled: boolean }>}
 */
export async function bootstrapAiListingsIntegrations() {
  const settings = await fetchAiListingsSettings();
  if (typeof window !== 'undefined') {
    window.__ibAiListings = {
      ...settings,
      loadedAt: new Date().toISOString()
    };
  }
  return settings;
}

/**
 * Returns a successfully loaded bootstrap setting.
 * A loaded false value is distinct from a missing or failed bootstrap.
 * @returns {{ aiListingsPublicEnabled: boolean } | null}
 */
export function getAiListingsSettingsFromBootstrap() {
  if (typeof window === 'undefined') return null;

  const settings = window.__ibAiListings;
  if (typeof settings?.aiListingsPublicEnabled !== 'boolean') return null;
  if (settings.loaded === false) return null;

  return { aiListingsPublicEnabled: settings.aiListingsPublicEnabled };
}

/**
 * @returns {boolean}
 */
export function isAiListingsPublicEnabledFromBootstrap() {
  return Boolean(getAiListingsSettingsFromBootstrap()?.aiListingsPublicEnabled);
}
