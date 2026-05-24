#!/usr/bin/env node
/**
 * 24h SLO guard against operational_events rollups.
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * Exit 1 when thresholds exceeded (for cron / CI with secrets).
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const root = path.join(__dirname, '..');
const thresholds = JSON.parse(
  fs.readFileSync(path.join(root, 'data/scale/slo-thresholds.json'), 'utf8')
);

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for live SLO check.');
  console.error('Skipping live check (static thresholds file present).');
  process.exit(0);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const alerts = thresholds.alerts || {};

async function main() {
  const violations = [];

  const { data: severityRows } = await sb.from('ops_severity_24h').select('*');
  for (const row of severityRows || []) {
    if (row.severity === 'critical' && row.events > (alerts.critical_events_max ?? 25)) {
      violations.push(`critical events ${row.events} > ${alerts.critical_events_max}`);
    }
    if (row.severity === 'error' && row.events > (alerts.error_events_max ?? 200)) {
      violations.push(`error events ${row.events} > ${alerts.error_events_max}`);
    }
  }

  const { count: rateLimited } = await sb
    .from('operational_events')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since)
    .eq('event_name', 'api_auto_intake_rate_limited');

  if ((rateLimited || 0) > (alerts.api_auto_intake_rate_limited_max ?? 100)) {
    violations.push(
      `api_auto_intake_rate_limited ${rateLimited} > ${alerts.api_auto_intake_rate_limited_max}`
    );
  }

  const { count: dispatchFails } = await sb
    .from('partner_lead_dispatch_logs')
    .select('id', { count: 'exact', head: true })
    .eq('success', false)
    .gte('created_at', since);

  if ((dispatchFails || 0) > (alerts.partner_webhook_fails_max ?? 50)) {
    violations.push(
      `partner_webhook_fails ${dispatchFails} > ${alerts.partner_webhook_fails_max}`
    );
  }

  const report = {
    generated_at: new Date().toISOString(),
    window: thresholds.window,
    violations,
    ok: violations.length === 0
  };

  console.log(JSON.stringify(report, null, 2));

  if (violations.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
