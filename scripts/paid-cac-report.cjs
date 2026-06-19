#!/usr/bin/env node
'use strict';

/**
 * CAC report — combines analytics_events with data/growth/paid-spend.json (manual weekly spend).
 * SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required.
 */

const fs = require('fs');
const path = require('path');
const {
  computePaidPlatformBreakdown,
  computeCacByPlatform,
  loadPaidSpend
} = require('./lib/paid-acquisition.cjs');

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const root = path.join(__dirname, '..');
  const since = new Date(Date.now() - 7 * 86400000).toISOString();

  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: events, error } = await sb
    .from('analytics_events')
    .select('event_name, attribution, properties, revenue_cents, created_at')
    .gte('created_at', since)
    .limit(15000);

  if (error) throw error;

  const rows = events || [];
  const platforms = computePaidPlatformBreakdown(rows);
  const spend = loadPaidSpend(root);
  const cac = computeCacByPlatform(platforms, spend);

  const report = {
    generated_at: new Date().toISOString(),
    period_start: since,
    spend_period: spend
      ? { start: spend.period_start, end: spend.period_end, currency: spend.currency }
      : null,
    spend_note: spend
      ? null
      : 'Copy data/growth/paid-spend.template.json to paid-spend.json and enter weekly spend',
    platforms,
    cac_by_platform: cac
  };

  const out = path.join(process.cwd(), 'dist', 'paid-cac-report.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
