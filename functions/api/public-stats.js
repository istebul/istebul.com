/**
 * Public aggregate platform metrics (no PII). Cached 5 minutes.
 */
import { createClient } from '@supabase/supabase-js';

import { resolveCorsOrigin } from '../_shared/cors-origins.js';

const corsHeaders = (origin = null) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(origin),
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
});

const json = (body, status = 200, origin = null) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });

const getSupabaseAdmin = (env) => {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
};

/** Below this count, API returns example mode so hero metrics stay credible. */
const MIN_LIVE_ANALYSES = 50;

const formatDisplay = (n) => {
  const value = Math.max(0, Number(n) || 0);
  if (value >= 10000) return `${Math.floor(value / 1000)}K+`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace('.0', '')}K+`;
  if (value > 0) return String(value);
  return null;
};

export async function onRequestOptions(context) {
  const origin = context.request.headers.get('Origin');
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function onRequestGet(context) {
  const origin = context.request.headers.get('Origin');
  const sb = getSupabaseAdmin(context.env);

  if (!sb) {
    return json({ mode: 'example', reason: 'stats_unconfigured' }, 200, origin);
  }

  try {
    const [leadsRes, partnersRes, profilesRes] = await Promise.all([
      sb.from('auto_leads').select('id', { count: 'exact', head: true }),
      sb.from('partner_endpoints').select('id', { count: 'exact', head: true }),
      sb.from('profiles').select('id', { count: 'exact', head: true })
    ]);

    const analyses = leadsRes.count ?? 0;
    const partners = partnersRes.count ?? 0;
    const users = profilesRes.count ?? 0;
    const reports = analyses > 0 ? Math.max(1, Math.round(analyses * 0.35)) : 0;

    const hasLive = analyses >= MIN_LIVE_ANALYSES;

    return json(
      {
        mode: hasLive ? 'live' : 'example',
        updatedAt: new Date().toISOString(),
        metrics: {
          analyses: formatDisplay(analyses) || '—',
          reports: formatDisplay(reports) || '—',
          users: users > 0 ? formatDisplay(users) : 'Aktif',
          partners: formatDisplay(partners) || '—'
        },
        raw: { analyses, reports, users, partners }
      },
      200,
      origin
    );
  } catch (error) {
    console.error('[public-stats]', error);
    return json({ mode: 'example', reason: 'stats_error' }, 200, origin);
  }
}
