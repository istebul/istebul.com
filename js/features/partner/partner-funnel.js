/**
 * P2.1 — Six-step self-serve partner acquisition funnel.
 */
import { capturePartnerAttribution, trackPartnerFunnel, PARTNER_FUNNEL_EVENTS } from './partner-platform.js';

export const FUNNEL_STEPS = Object.freeze([
  { id: 1, key: 'application', title: 'Başvuru', short: 'Başvuru' },
  { id: 2, key: 'qualification', title: 'Uygunluk', short: 'Uygunluk' },
  { id: 3, key: 'lead_needs', title: 'Lead ihtiyaçları', short: 'İhtiyaç' },
  { id: 4, key: 'webhook', title: 'Webhook', short: 'Webhook' },
  { id: 5, key: 'test_payload', title: 'Test doğrulama', short: 'Test' },
  { id: 6, key: 'complete', title: 'Tamamlandı', short: 'Bitti' }
]);

export const SAMPLE_WEBHOOK_PAYLOAD = Object.freeze({
  email: 'ornek@firma.com',
  phone: '905551112233',
  budget: 1750000,
  usage: 'family',
  body: 'suv',
  fuel: 'hybrid',
  interest_type: 'vehicle_offer',
  vehicle: 'Örnek model',
  lead_score: 142,
  priority: 'hot',
  partner_route: 'dealer_partner',
  estimated_revenue: 7500,
  source: 'auto'
});

export const PARTNER_FUNNEL_STEP_EVENTS = Object.freeze({
  2: 'partner_funnel_qualification',
  3: 'partner_funnel_lead_needs',
  4: 'partner_funnel_webhook',
  5: 'partner_funnel_test_payload',
  6: 'partner_onboarding_complete'
});

export function getTokenFromUrl() {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('token') || '';
}

export function getStepFromUrl(fallback = 1) {
  const raw = Number(new URLSearchParams(window.location.search).get('step'));
  return Number.isFinite(raw) && raw >= 1 && raw <= 6 ? raw : fallback;
}

export function setFunnelUrl(token, step) {
  const url = new URL('/partner-basvuru.html', window.location.origin);
  if (token) url.searchParams.set('token', token);
  if (step) url.searchParams.set('step', String(step));
  window.history.replaceState({}, '', url);
}

export async function hubRequest(body) {
  const baseUrl = (window.__env?.SUPABASE_URL || '').replace(/\/$/, '');
  const anonKey = window.__env?.SUPABASE_ANON_KEY || '';
  if (!baseUrl || !anonKey) throw new Error('no_config');

  const res = await fetch(`${baseUrl}/functions/v1/partner-onboarding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`
    },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'request_failed'), { status: res.status, data });
  return data;
}

export async function submitPartnerApplication(payload) {
  const baseUrl = (window.__env?.SUPABASE_URL || '').replace(/\/$/, '');
  const anonKey = window.__env?.SUPABASE_ANON_KEY || '';
  const res = await fetch(`${baseUrl}/functions/v1/partner-application`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`
    },
    body: JSON.stringify({ ...payload, ...capturePartnerAttribution() })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'request_failed');
  return data;
}

export function trackFunnelStep(step, properties = {}) {
  const event = PARTNER_FUNNEL_STEP_EVENTS[step];
  if (event) {
    trackPartnerFunnel(event, { step, ...properties }, { oncePerSession: false });
  }
  if (step === 1) {
    trackPartnerFunnel(PARTNER_FUNNEL_EVENTS.APPLICATION_SUBMIT, properties, { oncePerSession: false });
  }
}

/**
 * Client-side HMAC-SHA256 hex for webhook signature self-test (secret never leaves browser).
 */
export async function computeHmacSha256Hex(secret, body) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifySamplePayloadSignature(secret) {
  const body = JSON.stringify(SAMPLE_WEBHOOK_PAYLOAD);
  return computeHmacSha256Hex(secret, body);
}

export function renderStepper(currentStep, completedThrough = 0) {
  return `
    <nav class="ib-partner-funnel-stepper" aria-label="Onboarding adımları">
      <ol>
        ${FUNNEL_STEPS.map((s) => {
          const done = s.id < currentStep || s.id <= completedThrough;
          const current = s.id === currentStep;
          return `<li class="${done ? 'is-done' : ''}${current ? ' is-current' : ''}">
            <span class="ib-partner-funnel-step-num">${s.id}</span>
            <span class="ib-partner-funnel-step-label">${s.short}</span>
          </li>`;
        }).join('')}
      </ol>
    </nav>`;
}
