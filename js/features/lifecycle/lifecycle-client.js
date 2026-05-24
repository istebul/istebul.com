/**
 * Lifecycle CRM client — enroll contacts in automated revenue flows.
 */
import { readStorageRaw, STORAGE_KEYS } from '../../core/storage-keys.js';
import { analytics } from '../../core/analytics.js';

const ENROLLED_KEY = 'istebul_lifecycle_enrolled';

function getSupabaseConfig() {
  const url = window.__env?.SUPABASE_URL;
  const key = window.__env?.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function sessionEnrollKey(flowId) {
  return `${ENROLLED_KEY}:${flowId}`;
}

function wasEnrolledThisSession(flowId) {
  try {
    return sessionStorage.getItem(sessionEnrollKey(flowId)) === '1';
  } catch {
    return false;
  }
}

function markEnrolledSession(flowId) {
  try {
    sessionStorage.setItem(sessionEnrollKey(flowId), '1');
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} flowId
 * @param {Record<string, unknown>} [payload]
 */
export async function enrollLifecycle(flowId, payload = {}) {
  const config = getSupabaseConfig();
  if (!config) return { ok: false, error: 'no_supabase' };

  const email =
    payload.email ||
    readStorageRaw(STORAGE_KEYS.AUTO_LEAD_EMAIL) ||
    null;

  if (!email && !payload.user_id) {
    return { ok: false, error: 'no_contact' };
  }

  if (wasEnrolledThisSession(flowId) && !payload.restart) {
    return { ok: true, duplicate: true };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    analytics.track(
      'lifecycle_enroll_requested',
      { flow_id: flowId, has_email: Boolean(email) },
      { category: 'lifecycle', funnel: 'lifecycle', funnel_step: flowId }
    );

    const response = await fetch(`${config.url}/functions/v1/lifecycle-enroll`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        flow_id: flowId,
        email,
        phone: payload.phone || null,
        user_id: payload.user_id || null,
        lead_id: payload.lead_id || null,
        display_name: payload.display_name || null,
        context: payload.context || {},
        trigger_source: payload.trigger_source || 'web',
        restart: Boolean(payload.restart)
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: data.error || response.status };
    }

    markEnrolledSession(flowId);
    if (flowId === 'upsell_campaigns') {
      analytics.track('lifecycle_enrolled', { flow_id: flowId }, {
        category: 'lifecycle',
        funnel: 'upsell',
        funnel_step: 'upsell_campaigns'
      });
    }
    return { ok: true, ...data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'enroll_failed' };
  } finally {
    clearTimeout(timeout);
  }
}

export function enrollSignupNurture(user) {
  if (!user?.email) return Promise.resolve({ ok: false });
  return enrollLifecycle('signup_nurture', {
    email: user.email,
    user_id: user.id,
    display_name: user.user_metadata?.full_name || user.email?.split('@')[0],
    trigger_source: 'auth_signed_in'
  });
}

export function enrollAbandonedOnboarding(meta = {}) {
  return enrollLifecycle('abandoned_onboarding', {
    email: readStorageRaw(STORAGE_KEYS.AUTO_LEAD_EMAIL),
    context: meta,
    trigger_source: 'auto_onboarding_drop'
  });
}

export function enrollAbandonedLead(meta = {}) {
  return enrollLifecycle('abandoned_lead', {
    email: readStorageRaw(STORAGE_KEYS.AUTO_LEAD_EMAIL),
    context: {
      vehicle: meta.vehicle,
      interest_type: meta.interest_type,
      campaign: 'client_abandon'
    },
    trigger_source: 'auto_lead_abandon'
  });
}

export function enrollFinanceFollowUp(meta = {}) {
  return enrollLifecycle('finance_follow_up', {
    email: readStorageRaw(STORAGE_KEYS.AUTO_LEAD_EMAIL),
    context: meta,
    trigger_source: 'auto_finance'
  });
}

export function enrollUpsellCampaign(meta = {}) {
  return enrollLifecycle('upsell_campaigns', {
    email: readStorageRaw(STORAGE_KEYS.AUTO_LEAD_EMAIL),
    user_id: meta.user_id,
    context: meta,
    trigger_source: 'auto_upsell'
  });
}

/**
 * Best-effort enroll during page unload (keepalive).
 * @param {string} flowId
 * @param {Record<string, unknown>} payload
 */
export function enrollLifecycleKeepalive(flowId, payload = {}) {
  const config = getSupabaseConfig();
  if (!config) return;

  const email =
    payload.email ||
    readStorageRaw(STORAGE_KEYS.AUTO_LEAD_EMAIL) ||
    null;
  if (!email) return;

  const body = JSON.stringify({
    flow_id: flowId,
    email,
    phone: payload.phone || null,
    context: payload.context || {},
    trigger_source: payload.trigger_source || 'web_keepalive'
  });

  try {
    fetch(`${config.url}/functions/v1/lifecycle-enroll`, {
      method: 'POST',
      keepalive: true,
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json'
      },
      body
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}
