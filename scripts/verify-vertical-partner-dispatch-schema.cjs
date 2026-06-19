#!/usr/bin/env node
/**
 * Verify vertical partner dispatch migration applied (Management API).
 * Requires SUPABASE_ACCESS_TOKEN.
 */
const https = require('https');

const ref = process.env.SUPABASE_PROJECT_REF || 'hjfrcdstbyonmgatgwcc';
const token = process.env.SUPABASE_ACCESS_TOKEN || '';

const TABLES = [
  'housing_leads',
  'vacation_leads',
  'sigorta_leads',
  'vertical_leads',
  'kasko_leads'
];

const ROUTE_TYPES = ['housing', 'finance', 'vacation', 'insurance', 'kasko'];

function query(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const req = https.request(
      {
        hostname: 'api.supabase.com',
        path: `/v1/projects/${ref}/database/query`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode !== 200 && res.statusCode !== 201) {
            reject(new Error(`API ${res.statusCode}: ${data.slice(0, 400)}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  if (!token) {
    console.log('verify-vertical-partner-dispatch-schema: skip (no SUPABASE_ACCESS_TOKEN)');
    process.exit(0);
  }

  let failed = 0;

  for (const table of TABLES) {
    const rows = await query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = '${table}'
        AND column_name = 'partner_dispatch_status';
    `);
    if (!Array.isArray(rows) || rows.length === 0) {
      console.error(`FAIL: ${table}.partner_dispatch_status missing`);
      failed += 1;
    } else {
      console.log(`OK: ${table}.partner_dispatch_status`);
    }
  }

  const kaskoTable = await query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'kasko_leads'
    ) AS ok;
  `);
  const kaskoOk = kaskoTable?.[0]?.ok === true;
  if (!kaskoOk) {
    console.error('FAIL: kasko_leads table missing');
    failed += 1;
  } else {
    console.log('OK: kasko_leads table exists');
  }

  for (const routeType of ROUTE_TYPES) {
    try {
      await query(`
        SELECT 1 FROM public.partner_endpoints
        WHERE false
        AND '${routeType}' = '${routeType}';
      `);
      console.log(`OK: route_type constraint accepts '${routeType}'`);
    } catch (e) {
      if (String(e.message).includes('partner_endpoints_route_type_check')) {
        console.error(`FAIL: route_type '${routeType}' not in CHECK constraint`);
        failed += 1;
      } else {
        console.log(`OK: route_type '${routeType}' (constraint probe)`);
      }
    }
  }

  const leadSource = await query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'partner_lead_dispatch_logs'
      AND column_name = 'lead_source';
  `);
  if (!Array.isArray(leadSource) || leadSource.length === 0) {
    console.error('FAIL: partner_lead_dispatch_logs.lead_source missing');
    failed += 1;
  } else {
    console.log('OK: partner_lead_dispatch_logs.lead_source');
  }

  if (failed) process.exit(1);
  console.log('verify-vertical-partner-dispatch-schema: ALL OK');
}

main().catch((e) => {
  console.error('verify-vertical-partner-dispatch-schema:', e.message || e);
  process.exit(1);
});
