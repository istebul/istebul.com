/**
 * Client operational telemetry — batches to ops-ingest edge function.
 * Errors may fire without marketing consent; no raw email/phone in payloads.
 */
import { analytics } from './analytics.js';
import { SCALE_LIMITS } from './scale-limits.js';

const queue = [];
let flushTimer = null;

function getConfig() {
  const url = window.__env?.SUPABASE_URL;
  const key = window.__env?.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushOpsEvents();
  }, 1500);
}

/**
 * @param {string} eventName
 * @param {Record<string, unknown>} [properties]
 * @param {{ category?: string, severity?: string, http_status?: number, duration_ms?: number }} [meta]
 */
export function trackOpsEvent(eventName, properties = {}, meta = {}) {
  while (queue.length >= SCALE_LIMITS.opsTelemetry.maxQueue) {
    queue.shift();
  }

  queue.push({
    event_name: eventName,
    category: meta.category || inferCategory(eventName),
    severity: meta.severity || inferSeverity(eventName),
    source: 'web',
    session_id: analytics.getSessionId?.() || null,
    user_id: analytics.getUserId?.() || null,
    http_status: meta.http_status ?? null,
    duration_ms: meta.duration_ms ?? null,
    properties: sanitizeProps(properties),
    idempotency_key: properties.idempotency_key || null
  });

  if (queue.length >= Math.min(10, SCALE_LIMITS.opsTelemetry.flushBatch)) {
    flushOpsEvents();
    return;
  }
  scheduleFlush();
}

function inferCategory(eventName) {
  if (eventName.startsWith('auth_')) return 'auth';
  if (eventName.startsWith('payment_')) return 'payment';
  if (eventName.startsWith('performance_')) return 'performance';
  if (eventName.startsWith('abuse_')) return 'abuse';
  if (eventName.startsWith('client_api')) return 'api';
  return 'error';
}

function inferSeverity(eventName) {
  if (eventName.includes('failed') || eventName.includes('error')) return 'error';
  if (eventName.includes('slow') || eventName.includes('high')) return 'warning';
  return 'info';
}

function sanitizeProps(props) {
  const out = {};
  for (const [key, val] of Object.entries(props || {})) {
    if (/email|phone|password|token|secret/i.test(key)) continue;
    if (typeof val === 'string') out[key] = val.slice(0, 300);
    else if (typeof val === 'number' || typeof val === 'boolean' || val === null) {
      out[key] = val;
    }
  }
  return out;
}

export async function flushOpsEvents(options = {}) {
  if (!queue.length) return;
  const config = getConfig();
  if (!config) return;

  const batch = queue.splice(0, SCALE_LIMITS.opsTelemetry.flushBatch);
  const body = JSON.stringify({ events: batch });
  const url = `${config.url.replace(/\/$/, '')}/functions/v1/ops-ingest`;

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.key,
        Authorization: `Bearer ${config.key}`
      },
      body,
      keepalive: Boolean(options.beacon)
    });
  } catch {
    queue.unshift(...batch);
  }
}

export function initPerformanceObservability() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (!last) return;
      const lcp = last.startTime;
      if (lcp >= 4000) {
        trackOpsEvent('performance_lcp_slow', {
          lcp_ms: Math.round(lcp),
          path: window.location.pathname
        }, { category: 'performance', severity: 'warning' });
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    /* unsupported */
  }

  try {
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration >= 200) {
          trackOpsEvent('performance_long_task', {
            duration_ms: Math.round(entry.duration),
            path: window.location.pathname
          }, { category: 'performance', severity: 'warning' });
        }
      }
    });
    longTaskObserver.observe({ type: 'longtask', buffered: true });
  } catch {
    /* unsupported */
  }
}
