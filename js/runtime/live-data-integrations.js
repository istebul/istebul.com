/**
 * Merges production site_settings flags into client market-data integrations.
 */

import { normalizeMarketData } from '../data/market-data.js';

export const LIVE_DATA_PUBLIC_KEYS = ['live_providers_enabled'];

const ADMIN_ONLY_KEYS = ['live_finance_feed_url'];

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

function parseBool(value) {
  if (value === true || value === 1) return true;
  const s = String(value ?? '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'on';
}

/**
 * @returns {Promise<{ liveProvidersEnabled: boolean, liveFinanceFeedUrl: string }>}
 */
export async function fetchLiveDataSettings() {
  const { SUPABASE_URL: url, SUPABASE_ANON_KEY: key } = env();
  if (!url || !key) {
    return { liveProvidersEnabled: false, liveFinanceFeedUrl: '' };
  }

  const filter = LIVE_DATA_PUBLIC_KEYS.map((k) => `key.eq.${k}`).join(',');
  try {
    const res = await fetch(`${url}/rest/v1/site_settings?select=key,value&or=(${filter})`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });
    if (!res.ok) return { liveProvidersEnabled: false, liveFinanceFeedUrl: '' };
    const rows = await res.json();
    const map = settingsMap(rows);
    return {
      liveProvidersEnabled: parseBool(map.live_providers_enabled),
      liveFinanceFeedUrl: ''
    };
  } catch {
    return { liveProvidersEnabled: false, liveFinanceFeedUrl: '' };
  }
}

/**
 * @param {object} marketData
 * @param {{ liveProvidersEnabled?: boolean, liveFinanceFeedUrl?: string }} settings
 */
export function mergeLiveDataIntegrations(marketData, settings = {}) {
  const normalized = normalizeMarketData(marketData);
  const live = Boolean(settings.liveProvidersEnabled);
  return normalizeMarketData({
    ...normalized,
    integrations: {
      ...normalized.integrations,
      liveProvidersEnabled: live,
      providerMode: live ? 'live-pilot' : normalized.integrations.providerMode || 'manual-ready',
      note: live
        ? 'Canlı veri modu açık — admin onayı ile; feed URL edge tarafında işlenir.'
        : normalized.integrations.note
    }
  });
}

/**
 * Apply settings to window bootstrap and optional market data object.
 * @param {object} [marketData]
 * @returns {Promise<object>}
 */
export async function bootstrapLiveDataIntegrations(marketData) {
  const settings = await fetchLiveDataSettings();
  if (typeof window !== 'undefined') {
    window.__ibLiveData = {
      ...settings,
      loadedAt: new Date().toISOString()
    };
  }
  return mergeLiveDataIntegrations(marketData, settings);
}

export { ADMIN_ONLY_KEYS };
