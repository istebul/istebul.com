#!/usr/bin/env node
/**
 * CI: posts.content_type column exists (Management API).
 */
const https = require('https');

const ref = process.env.SUPABASE_PROJECT_REF || 'hjfrcdstbyonmgatgwcc';
const token = process.env.SUPABASE_ACCESS_TOKEN || '';

if (!token) {
  console.log('verify-posts-content-type-schema: skip (no SUPABASE_ACCESS_TOKEN)');
  process.exit(0);
}

const query = `
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'posts'
    AND column_name = 'content_type'
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
        console.error('verify-posts-content-type-schema: API', res.statusCode, data);
        process.exit(1);
      }
      try {
        const parsed = JSON.parse(data);
        const row = Array.isArray(parsed) ? parsed[0] : parsed?.[0];
        if (row?.ok !== true) {
          console.error('verify-posts-content-type-schema: column missing');
          process.exit(1);
        }
        console.log('verify-posts-content-type-schema: OK');
        process.exit(0);
      } catch (e) {
        console.error('verify-posts-content-type-schema: parse error', e.message);
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
