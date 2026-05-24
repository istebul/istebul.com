/**
 * Client → server bridge for Conversion API (Meta / Google Ads offline).
 */
import { analytics } from '../../core/analytics.js';
import {
  hasPaidClickId,
  isPaidAttribution,
  resolvePaidPlatform
} from './paid-acquisition.js';

/**
 * Send conversion to /api/paid-conversion-ingest (keepalive on unload safe).
 * @param {string} eventName — canonical funnel step (lead_submit, checkout_complete, …)
 * @param {Record<string, unknown>} [properties]
 */
export async function sendServerPaidConversion(eventName, properties = {}) {
  if (typeof window === 'undefined') return;

  const attribution = analytics.getAttribution();
  if (!isPaidAttribution(attribution) && !hasPaidClickId(attribution)) return;

  const body = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: properties.event_id || `ib:${eventName}:${analytics.getSessionId()}`,
    paid_platform: resolvePaidPlatform(attribution),
    attribution,
    properties: {
      ...properties,
      page_path: window.location.pathname,
      session_id: analytics.getSessionId()
    }
  };

  const payload = JSON.stringify(body);

  try {
    if (properties.useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon('/api/paid-conversion-ingest', payload);
      return;
    }

    await fetch('/api/paid-conversion-ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true
    });
  } catch {
    /* non-blocking */
  }
}
