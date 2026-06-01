/**
 * Sigorta vertical intake — events, leads, analytics.
 */
import { analytics } from '../core/analytics.js';
import { getVerticalSessionId } from '../vertical/vertical-intake.js';

const VERTICAL = 'sigorta';

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
    const response = await fetch(`${url.replace(/\/$/, '')}/functions/v1/sigorta-intake`, {
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
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: data.error || 'request_failed' };
    return { ok: true, ...data };
  } catch {
    return { ok: false, offline: true };
  }
}

function trackAnalytics(eventName, metadata = {}) {
  if (!analytics.hasConsent()) return;
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
  });
}

export async function trackSigortaStep(stepId, stepIndex) {
  return callSigortaIntake({
    type: 'event',
    event_type: 'insurance_step_completed',
    metadata: { step: stepId, step_index: stepIndex }
  });
}
