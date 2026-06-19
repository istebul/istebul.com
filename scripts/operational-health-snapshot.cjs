#!/usr/bin/env node
/**
 * Operational health snapshot (24h).
 * SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required.
 */
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(url, key);

async function main() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [severity, health, recent, dispatchFails] = await Promise.all([
    sb.from('ops_severity_24h').select('*'),
    sb.from('ops_health_24h').select('*').limit(50),
    sb
      .from('operational_events')
      .select('severity, category, event_name, created_at')
      .gte('created_at', since)
      .in('severity', ['critical', 'error'])
      .order('created_at', { ascending: false })
      .limit(100),
    sb
      .from('partner_lead_dispatch_logs')
      .select('id')
      .eq('success', false)
      .gte('created_at', since)
  ]);

  const payload = {
    generated_at: new Date().toISOString(),
    window: '24h',
    severity: severity.data,
    health_rollup: health.data,
    recent_critical_errors: recent.data,
    partner_webhook_fails: dispatchFails.data?.length || 0,
    errors: {
      severity: severity.error?.message,
      health: health.error?.message,
      recent: recent.error?.message
    }
  };

  const fs = require('fs');
  const path = require('path');
  const out = path.join(__dirname, '..', 'dist', 'operational-health-snapshot.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(payload, null, 2));

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
