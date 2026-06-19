#!/usr/bin/env node
/**
 * CI check: analytics_exclusion_rules exists (via Management API when token set).
 */
const https = require('https');

const ref = process.env.SUPABASE_PROJECT_REF || 'hjfrcdstbyonmgatgwcc';
const token = process.env.SUPABASE_ACCESS_TOKEN || '';

if (!token) {
  console.log('verify-analytics-exclusion-schema: skip (no SUPABASE_ACCESS_TOKEN)');
  process.exit(0);
}

const query = `
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'analytics_exclusion_rules'
) AS ok;
`;

const body = JSON.stringify({ query });

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
        console.error('verify-analytics-exclusion-schema: API', res.statusCode, data);
        process.exit(1);
      }
      try {
        const parsed = JSON.parse(data);
        const row = Array.isArray(parsed) ? parsed[0] : parsed?.[0];
        const ok = row?.ok === true || row?.exists === true;
        if (!ok) {
          console.error('verify-analytics-exclusion-schema: table missing');
          process.exit(1);
        }
        console.log('verify-analytics-exclusion-schema: OK');
        process.exit(0);
      } catch (e) {
        console.error('verify-analytics-exclusion-schema: parse error', e.message);
        process.exit(1);
      }
    });
  }
);
req.on('error', (e) => {
  console.error(e);
  process.exit(1);
});
req.write(body);
req.end();
