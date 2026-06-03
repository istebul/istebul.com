/**
 * Cloudflare Pages — canonical analytics ingest proxy.
 * Route: POST /api/analytics-ingest → Supabase Edge analytics-ingest
 */
import { resolveCorsOrigin } from '../_shared/cors-origins.js';
import { normalizeAnalyticsIngestBody } from './_shared/analytics-ingest-normalize.js';

const corsHeaders = (origin = null, overrides = {}) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(origin, 'https://www.istebul.com', {
    allowLocalDev: true
  }),
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
  ...overrides
});

function json(body, status = 200, origin = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(origin)
  });
}

function pickSupabaseUrl(env) {
  const url = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim();
  return url.replace(/\/$/, '');
}

function pickServiceRoleKey(env) {
  return String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} payload
 * @param {Record<string, string>} env
 */
async function forwardToSupabaseEdge(request, payload, env) {
  const supabaseUrl = pickSupabaseUrl(env);
  const serviceKey = pickServiceRoleKey(env);

  if (!supabaseUrl || !serviceKey) {
    return json(
      { ok: false, error: 'analytics_ingest_unconfigured', message: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' },
      503,
      request.headers.get('Origin')
    );
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey
  };

  const origin = request.headers.get('Origin');
  if (origin) headers.Origin = origin;

  const ua = request.headers.get('User-Agent');
  if (ua) headers['User-Agent'] = ua;

  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for');
  if (ip) {
    headers['cf-connecting-ip'] = ip.split(',')[0].trim();
    headers['x-forwarded-for'] = ip;
  }

  const edgeUrl = `${supabaseUrl}/functions/v1/analytics-ingest`;
  const edgeRes = await fetch(edgeUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const text = await edgeRes.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { ok: false, error: 'upstream_invalid_json', detail: text.slice(0, 200) };
  }

  return new Response(JSON.stringify(parsed ?? { ok: edgeRes.ok }), {
    status: edgeRes.status,
    headers: corsHeaders(origin)
  });
}

export async function onRequestOptions(context) {
  const origin = context.request.headers.get('Origin');
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function onRequestGet(context) {
  const origin = context.request.headers.get('Origin');
  const configured = Boolean(pickSupabaseUrl(context.env) && pickServiceRoleKey(context.env));
  return json(
    {
      ok: true,
      service: 'analytics-ingest',
      configured,
      ts: new Date().toISOString()
    },
    200,
    origin
  );
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin');

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400, origin);
  }

  const payload = normalizeAnalyticsIngestBody(body);

  if (!payload.events.length) {
    return json({ ok: false, error: 'no_events' }, 400, origin);
  }

  if (payload.events.length > 25) {
    return json({ ok: false, error: 'too_many_events' }, 400, origin);
  }

  return forwardToSupabaseEdge(request, payload, env);
}
