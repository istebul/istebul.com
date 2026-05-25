#!/usr/bin/env node
'use strict';

/**
 * P13 — CEO alert metrics snapshot.
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run metrics:ceo:alerts
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outPath = path.join(root, 'dist', 'ceo-alerts-snapshot.json');
const configPath = path.join(root, 'data/ops/ceo-alerts.json');
const rulesPath = path.join(root, 'data/ops/ceo-alert-rules.json');

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const alertRules = JSON.parse(fs.readFileSync(rulesPath, 'utf8')).rules || [];

  const { createClient } = await import('@supabase/supabase-js');
  const { buildCeoAlertSnapshot } = await import('../js/features/ops/ceo-alert-engine.js');

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [eventsRes, leadsRes, opsRes, subsRes, dispatchRes] = await Promise.all([
    sb
      .from('analytics_events')
      .select('event_name, session_id, created_at, funnel')
      .gte('created_at', since48h)
      .order('created_at', { ascending: false })
      .limit(15000),
    sb
      .from('auto_leads')
      .select('id, created_at, partner_status')
      .gte('created_at', since48h)
      .limit(5000),
    sb
      .from('operational_events')
      .select('severity, category, event_name, created_at, source')
      .gte('created_at', since48h)
      .limit(3000),
    sb
      .from('subscriptions')
      .select('status, cancel_at_period_end, current_period_end')
      .limit(3000),
    sb
      .from('partner_lead_dispatch_logs')
      .select('success, created_at')
      .gte('created_at', since24h)
      .limit(3000)
  ]);

  if (eventsRes.error && eventsRes.error.code !== '42P01') throw eventsRes.error;
  if (leadsRes.error) throw leadsRes.error;

  const snapshot = buildCeoAlertSnapshot({
    config,
    analyticsEvents: eventsRes.data || [],
    autoLeads: leadsRes.data || [],
    operationalEvents: opsRes.data || [],
    subscriptions: subsRes.data || [],
    dispatchLogs24h: dispatchRes.data || [],
    alertRules
  });

  snapshot.period = { since48h, end: new Date().toISOString() };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log('Wrote', outPath);
  console.log(
    JSON.stringify(
      {
        overallHealth: snapshot.overallHealth,
        triggered: snapshot.alerts.triggeredCount
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
