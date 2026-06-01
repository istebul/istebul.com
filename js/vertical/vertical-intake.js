import { analytics } from '../core/analytics.js';
import { mirrorLegacySiteEvent } from '../platform/site-analytics.js';

const VERTICAL_SITE_CATEGORY = Object.freeze({
  finans: 'finansman',
  konut: 'konut'
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

  try {
    const response = await fetch(`${url}/functions/v1/vertical-intake`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        vertical,
        ...payload,
        metadata: {
          ...(payload.metadata || {}),
          session_id: getVerticalSessionId(vertical)
        }
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: data.error || 'request_failed' };
    return { ok: true, ...data };
  } catch {
    return { ok: false, offline: true };
  }
}

export function createVerticalTracker(vertical) {
  const startEvent = `${vertical}_start`;
  const stepEvent = `${vertical}_step_completed`;
  const resultsEvent = `${vertical}_results_view`;
  const selectEvent = `${vertical}_option_selected`;
  const confirmEvent = `${vertical}_selection_confirmed`;
  const leadEvent = `${vertical}_lead_submit`;

  return {
    track(eventType, metadata = {}) {
      const siteCategory = VERTICAL_SITE_CATEGORY[vertical] || vertical;
      if (analytics.hasConsent()) {
        mirrorLegacySiteEvent(eventType, { category: siteCategory, ...metadata });
      }
      return callVerticalIntake(vertical, {
        type: 'event',
        event_type: eventType,
        metadata: { session_id: getVerticalSessionId(vertical), ...metadata }
      });
    },
    trackStart() {
      return this.track(startEvent);
    },
    trackStep(stepId, stepIndex) {
      return this.track(stepEvent, { step: stepId, step_index: stepIndex });
    },
    trackResults(meta = {}) {
      return this.track(resultsEvent, meta);
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
    events: { startEvent, stepEvent, resultsEvent, selectEvent, confirmEvent, leadEvent }
  };
}
