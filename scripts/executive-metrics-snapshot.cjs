#!/usr/bin/env node
'use strict';

/**
 * Export CEO executive metrics snapshot JSON.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/executive-metrics-snapshot.cjs
 *
 * Optional:
 *   EXECUTIVE_MARKETING_SPEND_TRY_30D=50000
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outPath = path.join(root, 'dist', 'executive-metrics-snapshot.json');

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to export live metrics.');
    process.exit(1);
  }

  const marketingRaw = process.env.EXECUTIVE_MARKETING_SPEND_TRY_30D;
  const marketingSpendTry30d =
    marketingRaw != null && marketingRaw !== '' ? Number(marketingRaw) : null;

  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const since90 = new Date(Date.now() - 90 * 86400000).toISOString();

  const [subs, leads, events, sessions] = await Promise.all([
    sb
      .from('subscriptions')
      .select('status, current_period_start, current_period_end, cancel_at_period_end')
      .limit(5000),
    sb
      .from('auto_leads')
      .select(
        'estimated_revenue, actual_revenue, partner_status, lead_score, priority, created_at'
      )
      .limit(10000),
    sb
      .from('analytics_events')
      .select('event_name, created_at, user_id, anonymous_id, session_id, funnel, funnel_step')
      .gte('created_at', since90)
      .order('created_at', { ascending: false })
      .limit(15000),
    sb
      .from('analytics_sessions')
      .select('user_id, created_at, updated_at')
      .gte('updated_at', since90)
      .limit(8000)
  ]);

  if (subs.error && subs.error.code !== '42P01') throw subs.error;
  if (leads.error) throw leads.error;
  if (events.error) throw events.error;
  if (sessions.error && sessions.error.code !== '42P01') throw sessions.error;

  const { buildExecutiveSnapshot } = await import('../js/features/metrics/executive-metrics.js');

  const snapshot = buildExecutiveSnapshot({
    subscriptions: subs.data || [],
    leads: leads.data || [],
    analyticsEvents: events.data || [],
    analyticsSessions: sessions.data || [],
    assumptions: {
      marketingSpendTry30d: Number.isFinite(marketingSpendTry30d) ? marketingSpendTry30d : null
    }
  });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log('Wrote', outPath);
  console.log(JSON.stringify(snapshot, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
