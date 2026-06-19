#!/usr/bin/env node
'use strict';

/**
 * Export investor KPI snapshot JSON for data room / board decks.
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or anon + admin session not supported here).
 *
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/investor-metrics-snapshot.cjs
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outPath = path.join(root, 'dist', 'investor-metrics-snapshot.json');

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to export live metrics.');
    process.exit(1);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const [subs, leads, events] = await Promise.all([
    sb.from('subscriptions').select('status, current_period_start, current_period_end, cancel_at_period_end').limit(5000),
    sb.from('auto_leads').select('estimated_revenue, actual_revenue, partner_status').limit(10000),
    sb.from('analytics_events').select('event_name').order('created_at', { ascending: false }).limit(5000)
  ]);

  if (subs.error && subs.error.code !== '42P01') throw subs.error;
  if (leads.error) throw leads.error;
  if (events.error) throw events.error;

  const { buildInvestorSnapshot } = await import('../js/features/metrics/investor-kpis.js');

  const snapshot = buildInvestorSnapshot({
    subscriptions: subs.data || [],
    leads: leads.data || [],
    analyticsEvents: events.data || []
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
