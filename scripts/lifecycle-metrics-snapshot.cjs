#!/usr/bin/env node
/**
 * Lifecycle CRM metrics snapshot (requires service role).
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/lifecycle-metrics-snapshot.cjs
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
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: enrollments, error: e1 } = await sb
    .from('lifecycle_enrollments')
    .select('flow_id, status')
    .gte('enrolled_at', since);

  const { data: messages, error: e2 } = await sb
    .from('lifecycle_messages')
    .select('flow_id, status')
    .gte('created_at', since);

  if (e1 || e2) {
    console.error(e1 || e2);
    process.exit(1);
  }

  const byFlow = {};
  for (const row of enrollments || []) {
    byFlow[row.flow_id] = byFlow[row.flow_id] || { enrolled: 0, active: 0, completed: 0 };
    byFlow[row.flow_id].enrolled += 1;
    if (row.status === 'active') byFlow[row.flow_id].active += 1;
    if (row.status === 'completed') byFlow[row.flow_id].completed += 1;
  }

  const msgStats = {};
  for (const row of messages || []) {
    const key = `${row.flow_id}:${row.status}`;
    msgStats[key] = (msgStats[key] || 0) + 1;
  }

  const payload = {
    period: '7d',
    since,
    enrollments_by_flow: byFlow,
    messages: msgStats,
    totals: {
      enrollments: enrollments?.length || 0,
      messages: messages?.length || 0,
      failed_messages: (messages || []).filter((m) => m.status === 'failed').length
    }
  };

  const fs = require('fs');
  const path = require('path');
  const out = path.join(__dirname, '..', 'dist', 'lifecycle-metrics-snapshot.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(payload, null, 2));

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
