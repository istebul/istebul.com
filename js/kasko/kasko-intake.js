import { analytics } from '../core/analytics.js';
import { withTimeout } from '../core/async-utils.js';
import { mirrorLegacySiteEvent } from '../platform/site-analytics.js';
import { getVerticalSessionId } from '../vertical/vertical-intake.js';

const VERTICAL = 'kasko';
const INTAKE_FETCH_TIMEOUT_MS = 4000;

function getEnv() {
  return {
    url: window.__env?.SUPABASE_URL || '',
    key: window.__env?.SUPABASE_ANON_KEY || ''
  };
}

async function callIntake(payload) {
  const { url, key } = getEnv();
  if (!url || !key) return { ok: false, offline: true };
  try {
    const response = await withTimeout(
      fetch(`${url.replace(/\/$/, '')}/functions/v1/auto-intake`, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...payload,
          category: 'kasko',
          session_id: getVerticalSessionId(VERTICAL)
        })
      }),
      INTAKE_FETCH_TIMEOUT_MS,
      null
    );
    if (!response) return { ok: false, timeout: true };
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: data.error || 'request_failed' };
    return { ok: true, ...data };
  } catch {
    return { ok: false, offline: true };
  }
}

function track(eventName, metadata = {}) {
  if (!analytics.hasConsent()) return;
  mirrorLegacySiteEvent(eventName, { category: 'kasko', ...metadata });
  analytics.track(eventName, { vertical: VERTICAL, ...metadata }, { category: 'decision', funnel: 'kasko' });
}

export function trackKaskoPageView() {
  track('kasko_page_view');
  return callIntake({ type: 'event', event_type: 'kasko_page_view' });
}

export function trackKaskoAnalysisStarted(meta = {}) {
  track('kasko_analysis_started', meta);
  return callIntake({ type: 'event', event_type: 'kasko_analysis_started', ...meta });
}

export function trackKaskoStep(stepId, stepIndex = 0) {
  track('kasko_step', { step_id: stepId, step_index: stepIndex });
}

export function saveKaskoLead(payload = {}) {
  track('kasko_lead_submit', { decision_score: payload.decision_score });
  return callIntake({ type: 'lead', ...payload, privacy_consent: payload.privacy_consent || 'accepted' });
}

export function trackKaskoResultsView(meta = {}) {
  track('kasko_results_view', meta);
  return callIntake({ type: 'event', event_type: 'kasko_results_view', ...meta });
}
