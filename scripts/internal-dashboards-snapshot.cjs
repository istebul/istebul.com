#!/usr/bin/env node
'use strict';

/**
 * P14 — Internal dashboards JSON export.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outPath = path.join(root, 'dist', 'internal-dashboards-snapshot.json');

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const { buildInternalDashboardContext } = await import(
    '../js/features/dashboards/internal-dashboard-context.js'
  );
  const { EXECUTIVE_WINDOW_DAYS } = await import(
    '../js/features/metrics/executive-dashboard.js'
  );

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const windowDays = EXECUTIVE_WINDOW_DAYS;
  const since = new Date(Date.now() - windowDays * 86400000).toISOString();
  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 86400000).toISOString();

  const [eventsRes, subsRes, leadsRes, opsRes, dispatchRes, enrollRes, msgRes, endpointsRes, retryRes, ceoLeadsRes] =
    await Promise.all([
      sb
        .from('analytics_events')
        .select('event_name, session_id, attribution, properties, revenue_cents, funnel, created_at')
        .gte('created_at', since48h)
        .order('created_at', { ascending: false })
        .limit(15000),
      sb.from('subscriptions').select('status, cancel_at_period_end').limit(3000),
      sb
        .from('auto_leads')
        .select('lead_score, partner_status, estimated_revenue, actual_revenue, created_at')
        .gte('created_at', since)
        .limit(8000),
      sb
        .from('operational_events')
        .select('severity, event_name, created_at')
        .gte('created_at', since48h)
        .limit(3000),
      sb
        .from('partner_lead_dispatch_logs')
        .select('success, duration_ms, created_at')
        .gte('created_at', since24h)
        .limit(3000),
      sb.from('lifecycle_enrollments').select('flow_id, status').gte('enrolled_at', since7d),
      sb.from('lifecycle_messages').select('status').gte('created_at', since7d),
      sb.from('partner_endpoints').select('health_status, is_active, last_success_at, circuit_open_until').limit(300),
      sb
        .from('auto_leads')
        .select('partner_status, next_retry_at')
        .in('partner_status', ['dispatch_failed', 'dispatch_dead', 'pending'])
        .limit(2000),
      sb.from('auto_leads').select('created_at').gte('created_at', since48h).limit(2000)
    ]);

  if (eventsRes.error) throw eventsRes.error;

  const partnerConfig = JSON.parse(
    fs.readFileSync(path.join(root, 'data/partner/partner-ops.json'), 'utf8')
  );
  const ceoConfig = JSON.parse(fs.readFileSync(path.join(root, 'data/ops/ceo-alerts.json'), 'utf8'));
  const alertRules = JSON.parse(
    fs.readFileSync(path.join(root, 'data/ops/alert-rules.json'), 'utf8')
  ).rules;
  const ceoRules = JSON.parse(
    fs.readFileSync(path.join(root, 'data/ops/ceo-alert-rules.json'), 'utf8')
  ).rules;
  const supportFlows = JSON.parse(
    fs.readFileSync(path.join(root, 'data/customer/support-workflows.json'), 'utf8')
  ).workflows;

  const sinceMs = new Date(since).getTime();
  const events = (eventsRes.data || []).filter((r) => new Date(r.created_at).getTime() >= sinceMs);

  const snapshot = buildInternalDashboardContext({
    windowDays,
    analyticsEvents: events,
    subscriptions: subsRes.data || [],
    autoLeads: leadsRes.data || [],
    operationalEvents: opsRes.data || [],
    dispatchLogs24h: dispatchRes.data || [],
    endpoints: endpointsRes.data || [],
    retryLeads: retryRes.data || [],
    ceoLeads: ceoLeadsRes.data || [],
    lifecycleEnrollments: enrollRes.data || [],
    lifecycleMessages: msgRes.data || [],
    lifecycle: {
      enrollments7d: enrollRes.data?.length || 0,
      failedMessages: (msgRes.data || []).filter((m) => m.status === 'failed').length
    },
    alertRules,
    ceoAlertRules: ceoRules,
    ceoAlertConfig: ceoConfig,
    partnerOpsConfig: partnerConfig,
    supportFlows
  });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log('Wrote', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
