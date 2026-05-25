#!/usr/bin/env node
'use strict';

/**
 * CEO executive KPI snapshot JSON export.
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run metrics:executive
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outPath = path.join(root, 'dist', 'executive-kpi-snapshot.json');

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const { buildExecutiveDashboard, EXECUTIVE_WINDOW_DAYS } = await import(
    '../js/features/metrics/executive-dashboard.js'
  );

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const since = new Date(Date.now() - EXECUTIVE_WINDOW_DAYS * 86400000).toISOString();

  const [eventsRes, subsRes, leadsRes] = await Promise.all([
    sb
      .from('analytics_events')
      .select(
        'event_name, session_id, attribution, properties, revenue_cents, funnel, created_at'
      )
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20000),
    sb
      .from('subscriptions')
      .select('status, current_period_start, current_period_end, cancel_at_period_end')
      .limit(5000),
    sb
      .from('auto_leads')
      .select(
        'lead_score, partner_status, estimated_revenue, actual_revenue, created_at'
      )
      .gte('created_at', since)
      .limit(10000)
  ]);

  if (eventsRes.error && eventsRes.error.code !== '42P01') throw eventsRes.error;
  if (leadsRes.error) throw leadsRes.error;

  const snapshot = buildExecutiveDashboard({
    analyticsEvents: eventsRes.data || [],
    subscriptions: subsRes.data || [],
    autoLeads: leadsRes.data || [],
    windowDays: EXECUTIVE_WINDOW_DAYS
  });

  snapshot.period = { start: since, end: new Date().toISOString() };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log('Wrote', outPath);
  console.log(JSON.stringify(snapshot, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
