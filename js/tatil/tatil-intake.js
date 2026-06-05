import { analytics } from '../core/analytics.js';
import { mirrorLegacySiteEvent } from '../platform/site-analytics.js';

function getEnv() {
  const url = window.__env?.SUPABASE_URL || '';
  const key = window.__env?.SUPABASE_ANON_KEY || '';
  return { url, key };
}

export function getVacationSessionId() {
  const key = 'ib_vacation_session';
  try {
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = `vac_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return `vac_${Date.now()}`;
  }
}

export async function callVacationIntake(payload) {
  const { url, key } = getEnv();
  if (!url || !key) {
    return { ok: false, offline: true };
  }

  try {
    const response = await fetch(`${url}/functions/v1/vacation-intake`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...payload,
        metadata: {
          ...(payload.metadata || {}),
          session_id: getVacationSessionId()
        }
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: data.error || 'request_failed' };
    }
    return { ok: true, ...data };
  } catch {
    return { ok: false, offline: true };
  }
}

export function trackVacationEvent(eventType, metadata = {}) {
  if (analytics.hasConsent()) {
    mirrorLegacySiteEvent(eventType, { category: 'tatil', ...metadata });
  }
  return callVacationIntake({
    type: 'event',
    event_type: eventType,
    metadata: {
      session_id: getVacationSessionId(),
      ...metadata
    }
  });
}

export function saveVacationLead(formData) {
  return callVacationIntake({
    type: 'lead',
    formData: {
      ...formData,
      session_id: getVacationSessionId()
    },
    metadata: { session_id: getVacationSessionId() }
  });
}

export function trackVacationStart(meta = {}) {
  return trackVacationEvent('vacation_start', meta);
}

export function trackVacationLeadOpen(meta = {}) {
  return trackVacationEvent('vacation_lead_open', meta);
}

export function trackVacationLeadSubmit(meta = {}) {
  return trackVacationEvent('vacation_lead_submit', meta);
}

export async function loadVacationSettings() {
  const { url, key } = getEnv();
  if (!url || !key) return null;

  const keys = [
    'vacation_enabled',
    'vacation_ai_enabled',
    'vacation_partner_cta_enabled',
    'vacation_default_budget_note',
    'vacation_disclaimer_text'
  ];

  try {
    const filter = keys.map((k) => `key.eq.${k}`).join(',');
    const res = await fetch(
      `${url}/rest/v1/site_settings?select=key,value&or=(${filter})`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const rows = await res.json();
    if (!Array.isArray(rows)) return null;
    const map = {};
    rows.forEach((r) => {
      map[r.key] = r.value;
    });
    return map;
  } catch {
    return null;
  }
}

export async function loadActiveScenarios() {
  const { url, key } = getEnv();
  if (!url || !key) return [];

  try {
    const res = await fetch(
      `${url}/rest/v1/vacation_scenarios?select=*&is_active=eq.true&order=sort_order.asc`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
