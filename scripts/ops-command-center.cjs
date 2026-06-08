#!/usr/bin/env node
'use strict';

/**
 * P9 — Unified ops command center JSON export.
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run metrics:ops:center
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outPath = path.join(root, 'dist', 'ops-command-center.json');
const rulesPath = path.join(root, 'data/ops/alert-rules.json');

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const { buildOpsCommandCenter } = await import('../js/features/ops/ops-command-center.js');
  const { buildPartnerOpsSnapshot } = await import('../js/features/partner/partner-ops-monitor.js');
  const { EXECUTIVE_WINDOW_DAYS } = await import('../js/features/metrics/executive-dashboard.js');

  const partnerConfig = JSON.parse(
    fs.readFileSync(path.join(root, 'data/partner/partner-ops.json'), 'utf8')
  );

  const alertRules = JSON.parse(fs.readFileSync(rulesPath, 'utf8')).rules || [];
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const windowDays = EXECUTIVE_WINDOW_DAYS;
  const since = new Date(Date.now() - windowDays * 86400000).toISOString();
  const since7d = new Date(Date.now() - 7 * 86400000).toISOString();

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    eventsRes,
    subsRes,
    leadsRes,
    opsRes,
    dispatchRes,
    enrollRes,
    msgRes,
    dispatchDetailRes,
    endpointsRes,
    retryLeadsRes
  ] = await Promise.all([
    sb
      .from('analytics_events')
      .select('event_name, session_id, attribution, properties, revenue_cents, funnel, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20000),
    sb.from('subscriptions').select('status, current_period_start, current_period_end, cancel_at_period_end').limit(5000),
    sb
      .from('auto_leads')
      .select('lead_score, partner_status, estimated_revenue, actual_revenue, created_at')
      .gte('created_at', since)
      .limit(10000),
    sb
      .from('operational_events')
      .select('severity, category, event_name, created_at, source')
      .gte('created_at', since24h)
      .limit(3000),
    sb
      .from('partner_lead_dispatch_logs')
      .select('success, created_at')
      .gte('created_at', since24h),
    sb.from('lifecycle_enrollments').select('flow_id, status').gte('enrolled_at', since7d),
    sb.from('lifecycle_messages').select('status').gte('created_at', since7d),
    sb
      .from('partner_lead_dispatch_logs')
      .select('success, latency_ms, created_at')
      .gte('created_at', since24h)
      .limit(5000),
    sb
      .from('partner_endpoints')
      .select(
        'id, name, route_type, is_active, health_status, circuit_open_until, last_success_at'
      )
      .limit(500),
    sb
      .from('auto_leads')
      .select('id, partner_status, next_retry_at, dispatch_retry_count')
      .in('partner_status', ['dispatch_failed', 'dispatch_dead', 'pending'])
      .limit(3000)
  ]);

  if (eventsRes.error && eventsRes.error.code !== '42P01') throw eventsRes.error;
  if (leadsRes.error) throw leadsRes.error;

  const failedDispatch = (dispatchRes.data || []).filter((r) => r.success === false).length;
  const failedMessages = (msgRes.data || []).filter((r) => r.status === 'failed').length;

  const partnerOpsSnapshot = buildPartnerOpsSnapshot({
    config: partnerConfig,
    dispatchLogs24h: dispatchDetailRes.data || [],
    endpoints: endpointsRes.data || [],
    leads: retryLeadsRes.data || [],
    alertRules: alertRules.filter((r) => r.domain === 'partner')
  });

  const snapshot = buildOpsCommandCenter({
    analyticsEvents: eventsRes.data || [],
    subscriptions: subsRes.data || [],
    autoLeads: leadsRes.data || [],
    operationalEvents: opsRes.data || [],
    partnerWebhookFails: failedDispatch,
    partnerOps: partnerOpsSnapshot,
    lifecycle: {
      enrollments7d: enrollRes.data?.length || 0,
      failedMessages
    },
    alertRules,
    windowDays,
    analyticsRowCap: 20000
  });

  snapshot.period = { start: since, end: new Date().toISOString() };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log('Wrote', outPath);
  console.log(JSON.stringify({ overallHealth: snapshot.overallHealth, alerts: snapshot.alerts.triggeredCount }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
