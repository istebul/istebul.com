/**
 * Lifecycle CRM client — enroll contacts in automated revenue flows.
 */
import { readStorageRaw, writeStorageRaw, STORAGE_KEYS } from '../../core/storage-keys.js';
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
 * @returns {boolean}
 */
export function hasStoredMarketingConsent(email = '') {
  try {
    const raw = readStorageRaw(STORAGE_KEYS.NEWSLETTER);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return false;
    const normalized = String(email || '').trim().toLowerCase();
    return list.some((item) => {
      if (typeof item === 'string') return item === 'accepted';
      if (item?.marketing_consent !== 'accepted') return false;
      if (!normalized) return true;
      return item.email === normalized || item.email_domain === normalized.split('@')[1];
    });
  } catch {
    return false;
  }
}

function resolveLifecycleEmail(payload = {}) {
  return (
    payload.email ||
    readStorageRaw(STORAGE_KEYS.AUTO_LEAD_EMAIL) ||
    null
  );
}

function buildEnrollBody(flowId, payload = {}) {
  const email = resolveLifecycleEmail(payload);
  const marketing =
    payload.marketing_consent === true || hasStoredMarketingConsent(email || '');
  const service =
    payload.service_opt_in === true ||
    Boolean(payload.user_id) ||
    flowId === 'auto_results_ready' ||
    flowId === 'checkout_abandon_recovery' ||
    flowId === 'abandoned_onboarding' ||
    flowId === 'abandoned_lead' ||
    flowId === 'reactivation_ltv' ||
    flowId === 'habit_loop_reminder' ||
    flowId === 'saved_decision_revisit' ||
    flowId === 'partner_sales_cadence' ||
    flowId === 'upgrade_prompt';

  return {
    flow_id: flowId,
    email,
    phone: payload.phone || null,
    user_id: payload.user_id || null,
    lead_id: payload.lead_id || null,
    display_name: payload.display_name || null,
    context: {
      ...(payload.context || {}),
      ...(marketing ? { marketing_consent: true } : {}),
      ...(service ? { service_opt_in: true } : {})
    },
    marketing_consent: marketing,
    service_opt_in: service,
    trigger_source: payload.trigger_source || 'web',
    restart: Boolean(payload.restart)
  };
}

/**
 * @param {string} flowId
 * @param {Record<string, unknown>} [payload]
 */
export async function enrollLifecycle(flowId, payload = {}) {
  const config = getSupabaseConfig();
  if (!config) return { ok: false, error: 'no_supabase' };

  const email = resolveLifecycleEmail(payload);
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
      body: JSON.stringify(buildEnrollBody(flowId, payload))
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: data.error || response.status };
    }

    markEnrolledSession(flowId);
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
    service_opt_in: true,
    marketing_consent: hasStoredMarketingConsent(user.email),
    trigger_source: 'auth_signed_in'
  });
}

export function enrollAutoResultsReady(meta = {}) {
  const email = resolveLifecycleEmail(meta);
  if (!email) return Promise.resolve({ ok: false, error: 'no_email' });
  return enrollLifecycle('auto_results_ready', {
    email,
    user_id: meta.user_id,
    service_opt_in: true,
    context: {
      results_count: meta.results_count,
      top_vehicle: meta.top_vehicle
    },
    trigger_source: 'auto_results_rendered'
  });
}

export function enrollCheckoutAbandonRecovery(meta = {}) {
  return enrollLifecycle('checkout_abandon_recovery', {
    email: meta.email,
    user_id: meta.user_id,
    service_opt_in: true,
    context: {
      billing_interval: meta.billing_interval,
      reason: meta.reason
    },
    trigger_source: 'checkout_abandoned',
    restart: true
  });
}

export function enrollAbandonedOnboarding(meta = {}) {
  return enrollLifecycle('abandoned_onboarding', {
    email: resolveLifecycleEmail(meta),
    service_opt_in: true,
    context: meta,
    trigger_source: 'auto_onboarding_drop'
  });
}

export function enrollAbandonedLead(meta = {}) {
  return enrollLifecycle('abandoned_lead', {
    email: resolveLifecycleEmail(meta),
    service_opt_in: true,
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
    email: resolveLifecycleEmail(meta),
    service_opt_in: true,
    context: meta,
    trigger_source: 'auto_finance'
  });
}

export function enrollUpsellCampaign(meta = {}) {
  const email = resolveLifecycleEmail(meta);
  if (!hasStoredMarketingConsent(email || '')) {
    return Promise.resolve({ ok: false, error: 'marketing_consent_required' });
  }
  return enrollLifecycle('upsell_campaigns', {
    email,
    user_id: meta.user_id,
    context: meta,
    marketing_consent: true,
    trigger_source: 'auto_upsell'
  });
}

/**
 * Newsletter / explicit marketing opt-in.
 * @param {string} email
 */
export function enrollNewsletterWelcome(email) {
  return enrollLifecycle('signup_nurture', {
    email,
    marketing_consent: true,
    trigger_source: 'newsletter',
    restart: true
  });
}

export function enrollReactivationLtv(meta = {}) {
  return enrollLifecycle('reactivation_ltv', {
    email: resolveLifecycleEmail(meta),
    user_id: meta.user_id,
    service_opt_in: true,
    marketing_consent: meta.marketing_consent,
    context: {
      days_inactive: meta.days_inactive,
      engagement_score: meta.engagement_score,
      saved_decisions: meta.saved_decisions_count
    },
    trigger_source: meta.trigger_source || 'retention_reactivation',
    restart: true
  });
}

export function enrollHabitLoopReminder(meta = {}) {
  return enrollLifecycle('habit_loop_reminder', {
    email: resolveLifecycleEmail(meta),
    service_opt_in: true,
    context: {
      streak_weeks: meta.streak_weeks,
      engagement_score: meta.engagement_score
    },
    trigger_source: 'retention_habit',
    restart: Boolean(meta.restart)
  });
}

export function enrollPartnerSalesCadence(meta = {}) {
  return enrollLifecycle('partner_sales_cadence', {
    email: resolveLifecycleEmail(meta),
    marketing_consent: meta.marketing_consent ?? hasStoredMarketingConsent(resolveLifecycleEmail(meta) || ''),
    context: {
      application_id: meta.application_id,
      company_name: meta.company_name,
      billing_plan: meta.billing_plan,
      status: meta.status
    },
    trigger_source: 'partner_ae_pipeline',
    restart: true
  });
}

export function enrollSavedDecisionRevisit(meta = {}) {
  return enrollLifecycle('saved_decision_revisit', {
    email: resolveLifecycleEmail(meta),
    user_id: meta.user_id,
    service_opt_in: true,
    context: {
      decision_id: meta.decision_id,
      saved_count: meta.saved_count
    },
    trigger_source: 'retention_saved_decision',
    restart: true
  });
}

/**
 * Best-effort enroll during page unload (keepalive).
 * @param {string} flowId
 * @param {Record<string, unknown>} [payload]
 */
export function enrollLifecycleKeepalive(flowId, payload = {}) {
  const config = getSupabaseConfig();
  if (!config) return;

  const email = resolveLifecycleEmail(payload);
  if (!email) return;

  try {
    fetch(`${config.url}/functions/v1/lifecycle-enroll`, {
      method: 'POST',
      keepalive: true,
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(buildEnrollBody(flowId, payload))
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}
