#!/usr/bin/env node
'use strict';

/**
 * P12 — Partner ops monitoring snapshot.
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run metrics:partner:ops
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outPath = path.join(root, 'dist', 'partner-ops-snapshot.json');
const configPath = path.join(root, 'data/partner/partner-ops.json');
const rulesPath = path.join(root, 'data/ops/alert-rules.json');

function partnerAlertRules(allRules) {
  return (allRules || []).filter(
    (r) =>
      r.domain === 'partner' &&
      (r.metric?.startsWith('partner.') ||
        ['partner_dispatch_fails', 'partner_dispatch_rate_low'].includes(r.id))
  );
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const allRules = JSON.parse(fs.readFileSync(rulesPath, 'utf8')).rules || [];
  const alertRules = partnerAlertRules(allRules);

  const { createClient } = await import('@supabase/supabase-js');
  const { buildPartnerOpsSnapshot } = await import(
    '../js/features/partner/partner-ops-monitor.js'
  );

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [logsRes, endpointsRes, leadsRes] = await Promise.all([
    sb
      .from('partner_lead_dispatch_logs')
      .select('success, latency_ms, created_at, endpoint_id, http_status')
      .gte('created_at', since24h)
      .order('created_at', { ascending: false })
      .limit(5000),
    sb
      .from('partner_endpoints')
      .select(
        'id, name, route_type, is_active, health_status, circuit_open_until, consecutive_failures, last_success_at, last_failure_at, sent_today, daily_cap'
      )
      .limit(500),
    sb
      .from('auto_leads')
      .select('id, partner_status, next_retry_at, dispatch_retry_count, created_at')
      .in('partner_status', ['dispatch_failed', 'dispatch_dead', 'pending'])
      .limit(3000)
  ]);

  if (logsRes.error && logsRes.error.code !== '42P01') throw logsRes.error;
  if (endpointsRes.error && endpointsRes.error.code !== '42P01') throw endpointsRes.error;
  if (leadsRes.error) throw leadsRes.error;

  const snapshot = buildPartnerOpsSnapshot({
    config,
    dispatchLogs24h: logsRes.data || [],
    endpoints: endpointsRes.data || [],
    leads: leadsRes.data || [],
    alertRules
  });

  snapshot.period = { since24h, end: new Date().toISOString() };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log('Wrote', outPath);
  console.log(
    JSON.stringify(
      {
        overallHealth: snapshot.overallHealth,
        alerts: snapshot.alerts.triggeredCount,
        slaBreached: snapshot.sla.breached
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
