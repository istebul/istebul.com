#!/usr/bin/env node
'use strict';

/**
 * Weekly growth channel snapshot from analytics_events (last 7 days).
 * SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required.
 */

const fs = require('fs');
const path = require('path');
const { computeExecutiveFunnel, computeChannelBreakdown } = require('./lib/growth-kpis.cjs');

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
    .select('event_name, attribution, properties, revenue_cents, created_at')
    .gte('created_at', since)
    .limit(10000);

  if (error) throw error;

  const rows = events || [];
  const byEvent = {};
  const byChannel = {};

  for (const row of rows) {
    byEvent[row.event_name] = (byEvent[row.event_name] || 0) + 1;
    const medium = row.attribution?.utm_medium || 'direct';
    const source = row.attribution?.utm_source || 'none';
    const key = `${source}/${medium}`;
    byChannel[key] = (byChannel[key] || 0) + 1;
  }

  const funnel = computeExecutiveFunnel(rows);
  const channels = computeChannelBreakdown(rows);

  const report = {
    period_start: since,
    period_end: new Date().toISOString(),
    total_events: rows.length,
    north_star: funnel.northStar,
    executive_funnel: funnel.steps,
    top_channels: channels.slice(0, 10),
    top_events: Object.entries(byEvent)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ name, count })),
    by_source_medium: byChannel,
    growth_events: Object.fromEntries(
      Object.entries(byEvent).filter(([k]) => k.startsWith('growth_'))
    )
  };

  const out = path.join(process.cwd(), 'dist', 'growth-weekly-report.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
