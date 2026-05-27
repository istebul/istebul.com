import { createClient } from '@supabase/supabase-js';
import { buildGoogleAdsConversionPayload, buildMetaCapiPayload } from './_shared/paid-capi-payloads.js';
import { recordOpsEvent } from './_shared/record-ops-event.js';

import { isAllowedOrigin } from '../_shared/cors-origins.js';
import { API_ERROR_CODES } from '../_shared/api-response.js';
import { buildCorsJsonHeaders, corsJson, corsJsonError } from '../_shared/cors-json.js';

const paidCorsHeaders = (origin = null) =>
  buildCorsJsonHeaders(origin, {
    'Access-Control-Allow-Headers': 'Content-Type, x-paid-conversion-secret'
  });

const QUALIFIED_EVENTS = new Set([
  'paid_landing_view',
  'lead_submit',
  'auto_lead_submit',
  'checkout_start',
  'checkout_complete',
  'paid_conversion',
  'pricing_view',
  'paid_funnel_step',
  'paid_conversion_signal'
]);

async function dispatchMetaCapi(env, payload) {
  const pixelId = env.META_PIXEL_ID;
  const token = env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !token) {
    return { ok: false, reason: 'meta_not_configured' };
  }

  const res = await fetch(
    `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, reason: 'meta_api_error', detail: text.slice(0, 200) };
  }

  return { ok: true, platform: 'meta' };
}

async function recordAnalyticsEvent(env, row) {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  const { error } = await supabase.from('analytics_events').insert({
    event_name: 'paid_capi_dispatch',
    event_category: 'growth',
    funnel: 'paid',
    funnel_step: row.event_name,
    properties: row,
    attribution: row.attribution || {},
    source: 'paid_conversion_ingest'
  });

  if (error && error.code !== '23505') {
    throw error;
  }
}

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: paidCorsHeaders(request.headers.get('Origin')) });
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('Origin');

  try {
    const secret = env.PAID_CONVERSION_SECRET;
    if (secret) {
      const header = request.headers.get('x-paid-conversion-secret');
      if (header !== secret) {
        return corsJsonError(403, API_ERROR_CODES.FORBIDDEN, 'Forbidden', origin, undefined, {
          'Access-Control-Allow-Headers': 'Content-Type, x-paid-conversion-secret'
        });
      }
    }

    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return corsJsonError(
        500,
        API_ERROR_CODES.SERVER_MISCONFIGURED,
        'Server not configured',
        origin,
        undefined,
        { 'Access-Control-Allow-Headers': 'Content-Type, x-paid-conversion-secret' }
      );
    }

    const body = await request.json();
    const eventName = String(body.event_name || '');
    if (!QUALIFIED_EVENTS.has(eventName)) {
      return corsJsonError(400, API_ERROR_CODES.BAD_REQUEST, 'Invalid event_name', origin, undefined, {
        'Access-Control-Allow-Headers': 'Content-Type, x-paid-conversion-secret'
      });
    }

    const eventTime = Number(body.event_time) || Math.floor(Date.now() / 1000);
    const eventId = String(body.event_id || `srv:${eventName}:${eventTime}`).slice(0, 120);
    const attribution = body.attribution && typeof body.attribution === 'object' ? body.attribution : {};
    const properties = body.properties && typeof body.properties === 'object' ? body.properties : {};
    const paidPlatform = body.paid_platform || attribution.paid_platform || null;

    const user = {
      email: properties.email || null,
      phone: properties.phone || null,
      event_source_url: properties.page_path
        ? `https://www.istebul.com${properties.page_path}`
        : 'https://www.istebul.com/auto/'
    };

    const capiResults = [];

    if (paidPlatform === 'meta' || attribution.fbclid) {
      const metaPayload = await buildMetaCapiPayload({
        pixelId: env.META_PIXEL_ID,
        eventName,
        eventTime,
        eventId,
        attribution,
        user,
        customData: {
          value: properties.revenue_cents ? properties.revenue_cents / 100 : undefined,
          currency: 'TRY'
        }
      });
      capiResults.push(await dispatchMetaCapi(env, metaPayload));
    }

    if (
      paidPlatform === 'google_search' ||
      paidPlatform === 'youtube' ||
      attribution.gclid ||
      attribution.gbraid
    ) {
      const googlePayload = await buildGoogleAdsConversionPayload({
        conversionActionId: env.GOOGLE_ADS_CONVERSION_ACTION_ID || 'pending',
        eventName,
        eventTime,
        attribution,
        user
      });
      capiResults.push({
        ok: Boolean(env.GOOGLE_ADS_CONVERSION_ACTION_ID),
        platform: 'google_ads',
        reason: env.GOOGLE_ADS_CONVERSION_ACTION_ID ? 'queued_for_upload' : 'google_not_configured',
        payload: googlePayload
      });
    }

    await recordAnalyticsEvent(env, {
      event_name: eventName,
      event_id: eventId,
      paid_platform: paidPlatform,
      attribution,
      properties,
      capi_results: capiResults
    });

    return corsJson({ ok: true, capi: capiResults }, 200, origin, {
      'Access-Control-Allow-Headers': 'Content-Type, x-paid-conversion-secret'
    });
  } catch (err) {
    console.error('paid-conversion-ingest error:', err);
    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false }
      });
      await recordOpsEvent(sb, {
        event_name: 'paid_capi_failed',
        category: 'growth',
        severity: 'warning',
        properties: { message: String(err.message || err).slice(0, 200) }
      }).catch(() => {});
    }
    return corsJsonError(500, API_ERROR_CODES.INTERNAL_ERROR, 'Server error', origin, undefined, {
      'Access-Control-Allow-Headers': 'Content-Type, x-paid-conversion-secret'
    });
  }
}
