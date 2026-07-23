/**
 * Sigorta vertical intake — events, leads, analytics.
 */
import { analytics } from '../core/analytics.js';
import { withTimeout } from '../core/async-utils.js';
import { mirrorLegacySiteEvent } from '../platform/site-analytics.js';
import { getVerticalSessionId } from '../vertical/vertical-intake.js';

const VERTICAL = 'sigorta';
const INTAKE_FETCH_TIMEOUT_MS = 4000;

function getEnv() {
  return {
    url: window.__env?.SUPABASE_URL || '',
    key: window.__env?.SUPABASE_ANON_KEY || ''
  };
}

async function callSigortaIntake(payload) {
  const { url, key } = getEnv();
  if (!url || !key) return { ok: false, offline: true };

  try {
    const response = await withTimeout(
      fetch(`${url.replace(/\/$/, '')}/functions/v1/sigorta-intake`, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...payload,
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

function trackAnalytics(eventName, metadata = {}) {
  if (!analytics.hasConsent()) return;
  mirrorLegacySiteEvent(eventName, { category: 'sigorta', ...metadata });
  analytics.track(
    eventName,
    {
      session_id: getVerticalSessionId(VERTICAL),
      vertical: VERTICAL,
      ...metadata
    },
    { category: 'decision', funnel: 'sigorta', funnel_step: eventName }
  );
}

export function trackSigortaPageView() {
  trackAnalytics('insurance_page_view', { path: window.location.pathname });
  return callSigortaIntake({ type: 'event', event_type: 'insurance_page_view' });
}

export function trackSigortaAnalysisStarted(meta = {}) {
  trackAnalytics('insurance_analysis_started', meta);
  return callSigortaIntake({ type: 'event', event_type: 'insurance_analysis_started', metadata: meta });
}

export function trackSigortaResultsView(meta = {}) {
  trackAnalytics('insurance_results_view', meta);
  return callSigortaIntake({ type: 'event', event_type: 'insurance_results_view', metadata: meta });
}

export function trackSigortaInterest(interestType, meta = {}) {
  trackAnalytics('insurance_interest', { interest_type: interestType, ...meta });
  return callSigortaIntake({
    type: 'event',
    event_type: 'insurance_interest',
    metadata: { interest_type: interestType, ...meta }
  });
}

export function trackSigortaPdfDownload(meta = {}) {
  trackAnalytics('insurance_pdf_download', meta);
  return callSigortaIntake({ type: 'event', event_type: 'insurance_pdf_download', metadata: meta });
}

export function saveSigortaLead(formData) {
  return callSigortaIntake({
    type: 'lead',
    formData: {
      ...formData,
      session_id: getVerticalSessionId(VERTICAL)
    }
  }).then((res) => {
    if (res.ok) {
      trackAnalytics('insurance_lead_submit', {
        selected_option: formData.selected_option,
        interest_type: formData.interest_type
      });
    }
    return res;
  });
}

export async function trackSigortaStep(stepId, stepIndex) {
  return callSigortaIntake({
    type: 'event',
    event_type: 'insurance_step_completed',
    metadata: { step: stepId, step_index: stepIndex }
  });
}
