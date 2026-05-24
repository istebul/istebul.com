/**
 * Referral hub client — server-validated codes, clicks, signup attribution.
 */
import { supabase } from '../../core/supabase.js';
import { analytics } from '../../core/analytics.js';
import { readStorageRaw, writeStorageRaw, STORAGE_KEYS } from '../../core/storage-keys.js';
import { getStoredReferralCode, trackGrowth } from './growth-engine.js';

function getConfig() {
  const url = window.__env?.SUPABASE_URL;
  const key = window.__env?.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

async function hubRequest(body, { auth = false } = {}) {
  const config = getConfig();
  if (!config) return { ok: false, error: 'no_config' };

  const headers = {
    apikey: config.key,
    'Content-Type': 'application/json'
  };

  if (auth) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return { ok: false, error: 'auth_required' };
    headers.Authorization = `Bearer ${session.access_token}`;
  } else {
    headers.Authorization = `Bearer ${config.key}`;
  }

  const response = await fetch(`${config.url}/functions/v1/referral-hub`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, error: data.error || response.status, ...data };
  }
  return { ok: true, ...data };
}

/**
 * @param {string} code
 */
export async function trackReferralLinkClick(code) {
  const normalized = String(code || getStoredReferralCode() || '').trim().toLowerCase();
  if (!normalized) return { ok: false };

  trackGrowth('referral_link_clicked', { code: normalized }, {
    funnel: 'referral',
    funnel_step: 'click'
  });

  return hubRequest({
    action: 'track_click',
    code: normalized,
    session_id: analytics.getSessionId(),
    email: readStorageRaw(STORAGE_KEYS.AUTO_LEAD_EMAIL) || null
  });
}

/**
 * Register or fetch canonical referral code for logged-in user.
 */
export async function ensureServerReferralCode() {
  const result = await hubRequest({ action: 'ensure_code' }, { auth: true });
  if (result.ok && result.code) {
    writeStorageRaw(STORAGE_KEYS.MY_REFERRAL_CODE, result.code);
    if (result.created) {
      trackGrowth('referral_link_created', { code: result.code }, {
        funnel: 'referral',
        funnel_step: 'link_created'
      });
    }
  }
  return result;
}

/**
 * Attribute signup to stored referral code (once per session).
 */
export async function attributeReferralSignupFromStorage() {
  const code = getStoredReferralCode();
  if (!code) return { ok: false, error: 'no_ref' };

  const lockKey = 'istebul_referral_signup_attributed';
  try {
    if (sessionStorage.getItem(lockKey) === '1') {
      return { ok: true, duplicate: true };
    }
  } catch {
    /* ignore */
  }

  const result = await hubRequest({
    action: 'attribute_signup',
    code,
    session_id: analytics.getSessionId()
  }, { auth: true });

  if (result.ok) {
    try {
      sessionStorage.setItem(lockKey, '1');
    } catch {
      /* ignore */
    }
    trackGrowth('referral_signup', { referral_code: code }, {
      funnel: 'referral',
      funnel_step: 'signup'
    });
  }

  return result;
}

export async function fetchReferralEntitlements() {
  return hubRequest({ action: 'get_entitlements' }, { auth: true });
}
