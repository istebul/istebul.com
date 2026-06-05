import { analytics } from '../core/analytics.js';
import { withTimeout } from '../core/async-utils.js';
import { mirrorLegacySiteEvent } from '../platform/site-analytics.js';

const INTAKE_FETCH_TIMEOUT_MS = 4000;

const VERTICAL_SITE_CATEGORY = Object.freeze({
  finans: 'finansman',
  konut: 'konut',
  kasko: 'kasko'
});

const VERTICAL_INTAKE_ENDPOINT = Object.freeze({
  finans: 'vertical-intake',
  konut: 'vertical-intake',
  kasko: 'kasko-intake'
});

const VERTICAL_EVENT_NAMES = Object.freeze({
  kasko: {
    startEvent: 'kasko_analysis_started',
    stepEvent: 'kasko_step_completed',
    resultsEvent: 'kasko_results_view',
    selectEvent: 'kasko_option_selected',
    confirmEvent: 'kasko_selection_confirmed',
    leadEvent: 'kasko_lead_submit',
    wizardCompleteEvent: 'kasko_wizard_complete',
    pageViewEvent: 'kasko_page_view'
  }
});

function getEnv() {
  return {
    url: window.__env?.SUPABASE_URL || '',
    key: window.__env?.SUPABASE_ANON_KEY || ''
  };
}

export function getVerticalSessionId(vertical) {
  const key = `ib_${vertical}_session`;
  try {
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = `${vertical}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return `${vertical}_${Date.now()}`;
  }
}

async function callVerticalIntake(vertical, payload) {
  const { url, key } = getEnv();
  if (!url || !key) return { ok: false, offline: true };

  const endpoint = VERTICAL_INTAKE_ENDPOINT[vertical] || 'vertical-intake';
  const sessionId = getVerticalSessionId(vertical);
  const usesDedicatedIntake = endpoint !== 'vertical-intake';
  const body = usesDedicatedIntake
    ? {
        ...payload,
        session_id: sessionId,
        metadata: {
          ...(payload.metadata || {}),
          session_id: sessionId
        }
      }
    : {
        vertical,
        ...payload,
        metadata: {
          ...(payload.metadata || {}),
          session_id: sessionId
        }
      };

  try {
    const response = await withTimeout(
      fetch(`${url.replace(/\/$/, '')}/functions/v1/${endpoint}`, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }),
      INTAKE_FETCH_TIMEOUT_MS,
      null
    );
    if (!response) return { ok: false, offline: true, timeout: true };
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: data.error || 'request_failed' };
    return { ok: true, ...data };
  } catch {
    return { ok: false, offline: true };
  }
}

export function createVerticalTracker(vertical) {
  const custom = VERTICAL_EVENT_NAMES[vertical] || {};
  const startEvent = custom.startEvent || `${vertical}_start`;
  const stepEvent = custom.stepEvent || `${vertical}_step_completed`;
  const resultsEvent = custom.resultsEvent || `${vertical}_results_view`;
  const selectEvent = custom.selectEvent || `${vertical}_option_selected`;
  const confirmEvent = custom.confirmEvent || `${vertical}_selection_confirmed`;
  const leadEvent = custom.leadEvent || `${vertical}_lead_submit`;
  const wizardCompleteEvent = custom.wizardCompleteEvent || null;
  const pageViewEvent = custom.pageViewEvent || null;

  return {
    track(eventType, metadata = {}) {
      const siteCategory = VERTICAL_SITE_CATEGORY[vertical] || vertical;
      if (analytics.hasConsent()) {
        mirrorLegacySiteEvent(eventType, { category: siteCategory, ...metadata });
        analytics.track(
          eventType,
          { session_id: getVerticalSessionId(vertical), vertical, ...metadata },
          { category: 'decision', funnel: vertical, funnel_step: eventType }
        );
      }
      return callVerticalIntake(vertical, {
        type: 'event',
        event_type: eventType,
        metadata: { session_id: getVerticalSessionId(vertical), ...metadata }
      });
    },
    trackPageView(meta = {}) {
      if (!pageViewEvent) return Promise.resolve({ ok: false, skipped: true });
      return this.track(pageViewEvent, meta);
    },
    trackStart(meta = {}) {
      return this.track(startEvent, meta);
    },
    trackStep(stepId, stepIndex) {
      return this.track(stepEvent, { step: stepId, step_index: stepIndex });
    },
    trackResults(meta = {}) {
      return this.track(resultsEvent, meta);
    },
    trackWizardComplete(meta = {}) {
      if (!wizardCompleteEvent) return Promise.resolve({ ok: false, skipped: true });
      return this.track(wizardCompleteEvent, meta);
    },
    trackSelect(option, extra = {}) {
      return this.track(selectEvent, { option, ...extra });
    },
    trackConfirm(option) {
      return this.track(confirmEvent, { option });
    },
    saveLead(formData) {
      return callVerticalIntake(vertical, {
        type: 'lead',
        formData: {
          ...formData,
          session_id: getVerticalSessionId(vertical)
        },
        metadata: { session_id: getVerticalSessionId(vertical) }
      }).then((res) => {
        if (res.ok) this.track(leadEvent, { selected_option: formData.selected_option });
        return res;
      });
    },
    events: {
      startEvent,
      stepEvent,
      resultsEvent,
      selectEvent,
      confirmEvent,
      leadEvent,
      wizardCompleteEvent,
      pageViewEvent
    }
  };
}
