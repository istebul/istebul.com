#!/usr/bin/env node
/**
 * Production smoke: submit test leads for each vertical and verify dispatch fields.
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://hjfrcdstbyonmgatgwcc.supabase.co').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

if (!SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY required for smoke verification');
  process.exit(1);
}

const TEST_PHONE = '905559876543';
const SESSION = `smoke_${Date.now()}`;

const CASES = [
  {
    name: 'konut (housing-intake)',
    invoke: 'housing-intake',
    body: {
      type: 'lead',
      formData: {
        full_name: 'Smoke Konut',
        email: 'smoke-konut@test.istebul.com',
        phone: TEST_PHONE,
        housing_purpose: 'Satın alma',
        decision_score: 82,
        privacy_consent: 'accepted'
      },
      metadata: { session_id: SESSION }
    },
    table: 'housing_leads',
    vertical: 'konut'
  },
  {
    name: 'finans (vertical-intake)',
    invoke: 'vertical-intake',
    body: {
      type: 'lead',
      vertical: 'finans',
      full_name: 'Smoke Finans',
      email: 'smoke-finans@test.istebul.com',
      phone: TEST_PHONE,
      decision_score: 78,
      metadata: { session_id: `${SESSION}_finans` }
    },
    table: 'vertical_leads',
    vertical: 'finans'
  },
  {
    name: 'tatil (vacation-intake)',
    invoke: 'vacation-intake',
    body: {
      type: 'lead',
      formData: {
        full_name: 'Smoke Tatil',
        email: 'smoke-tatil@test.istebul.com',
        phone: TEST_PHONE,
        vacation_goal: 'Dinlenme',
        decision_score: 75
      },
      metadata: { session_id: `${SESSION}_tatil` }
    },
    table: 'vacation_leads',
    vertical: 'tatil'
  },
  {
    name: 'sigorta (sigorta-intake)',
    invoke: 'sigorta-intake',
    body: {
      type: 'lead',
      formData: {
        full_name: 'Smoke Sigorta',
        email: 'smoke-sigorta@test.istebul.com',
        phone: TEST_PHONE,
        interest_type: 'insurance_quote',
        decision_score: 80,
        privacy_consent: 'accepted'
      },
      metadata: { session_id: `${SESSION}_sigorta` }
    },
    table: 'sigorta_leads',
    vertical: 'sigorta'
  },
  {
    name: 'kasko (kasko-intake)',
    invoke: 'kasko-intake',
    body: {
      type: 'lead',
      full_name: 'Smoke Kasko',
      email: 'smoke-kasko@test.istebul.com',
      phone: TEST_PHONE,
      decision_score: 76,
      privacy_consent: 'accepted',
      metadata: { session_id: `${SESSION}_kasko` }
    },
    table: 'kasko_leads',
    vertical: 'kasko'
  }
];

async function invokeEdge(fn, body) {
  const key = ANON_KEY || SERVICE_KEY;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function fetchLead(table, id) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}&select=id,partner_dispatch_status,partner_dispatch_at,partner_dispatch_error,partner_endpoint_id,partner_dispatch_retry_count,status`,
    {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`
      }
    }
  );
  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) ? rows[0] : null;
}

async function fetchDispatchLogs(leadId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/partner_lead_dispatch_logs?lead_id=eq.${leadId}&select=id,success,partner_route,lead_source,trigger_source&order=created_at.desc&limit=3`,
    {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`
      }
    }
  );
  return res.json().catch(() => []);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('\nVertical partner dispatch production smoke\n');
  let failed = 0;
  const results = [];

  for (const c of CASES) {
    process.stdout.write(`${c.name} … `);
    const inv = await invokeEdge(c.invoke, c.body);
    if (!inv.ok || !inv.data?.id) {
      console.log(`FAIL invoke ${inv.status} ${JSON.stringify(inv.data)}`);
      failed += 1;
      results.push({ ...c, ok: false, reason: 'invoke_failed' });
      continue;
    }

    const leadId = inv.data.id;
    await sleep(3500);

    const lead = await fetchLead(c.table, leadId);
    if (!lead) {
      console.log(`FAIL lead not found in ${c.table}`);
      failed += 1;
      results.push({ ...c, ok: false, leadId, reason: 'lead_missing' });
      continue;
    }

    const status = String(lead.partner_dispatch_status || '');
    const validStatus = ['pending', 'sent', 'failed', 'dead'].includes(status);
    const logs = await fetchDispatchLogs(leadId);

    if (!validStatus) {
      console.log(`FAIL invalid partner_dispatch_status: ${status}`);
      failed += 1;
      results.push({ ...c, ok: false, leadId, lead, logs });
      continue;
    }

    console.log(`OK id=${leadId.slice(0, 8)}… status=${status} logs=${logs.length}`);
    results.push({ ...c, ok: true, leadId, lead, logs });
  }

  console.log('\n--- Summary ---');
  for (const r of results) {
    const st = r.lead?.partner_dispatch_status || 'n/a';
    const err = r.lead?.partner_dispatch_error || '';
    console.log(
      `${r.ok ? '✓' : '✗'} ${r.name}: status=${st}${err ? ` error=${err.slice(0, 60)}` : ''}`
    );
  }

  const noEndpoint = results.filter(
    (r) => r.ok && ['failed', 'pending'].includes(r.lead?.partner_dispatch_status)
  );
  if (noEndpoint.length) {
    console.log(
      `\nNote: ${noEndpoint.length} lead(s) pending/failed — expected when no partner_endpoints configured.`
    );
  }

  if (failed) process.exit(1);
  console.log('\nSmoke tamam.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
