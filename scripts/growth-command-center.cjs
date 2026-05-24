#!/usr/bin/env node
'use strict';

/**
 * Growth command center export — funnel CR, channel breakdown, experiment stats.
 * SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required.
 */

const fs = require('fs');
const path = require('path');
const {
  computeExecutiveFunnel,
  computeChannelBreakdown
} = require('./lib/growth-kpis.cjs');

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const since = new Date(Date.now() - 7 * 86400000).toISOString();

  const { data: events, error } = await sb
    .from('analytics_events')
    .select('event_name, attribution, properties, revenue_cents, funnel, created_at')
    .gte('created_at', since)
    .limit(15000);

  if (error) throw error;

  const rows = events || [];
  const funnel = computeExecutiveFunnel(rows);
  const channels = computeChannelBreakdown(rows);

  const experiments = {
    exposures: rows.filter((r) => r.event_name === 'growth_experiment_exposure').length,
    conversions: rows.filter((r) => r.event_name === 'growth_experiment_conversion').length
  };

  const paid = {
    click_capture: rows.filter((r) => r.event_name === 'paid_click_capture').length,
    conversion_signals: rows.filter((r) => r.event_name === 'paid_conversion_signal').length
  };

  const retention = {
    return_visits: rows.filter((r) => r.event_name === 'retention_return_visit').length,
    engagement: rows.filter((r) => r.event_name === 'retention_engagement').length
  };

  const report = {
    generated_at: new Date().toISOString(),
    period_start: since,
    period_end: new Date().toISOString(),
    total_events: rows.length,
    north_star: funnel.northStar,
    executive_funnel: funnel.steps,
    channels: channels.slice(0, 12),
    experiments,
    paid_readiness: paid,
    retention
  };

  const out = path.join(process.cwd(), 'dist', 'growth-command-center.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
