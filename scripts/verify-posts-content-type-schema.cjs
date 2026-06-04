#!/usr/bin/env node
/**
 * CI: required posts columns exist (Management API).
 */
const https = require('https');

const ref = process.env.SUPABASE_PROJECT_REF || 'hjfrcdstbyonmgatgwcc';
const token = process.env.SUPABASE_ACCESS_TOKEN || '';

const REQUIRED_COLUMNS = [
  'content_type',
  'cover_image_url',
  'excerpt',
  'category',
  'is_featured',
  'source_label',
  'source_url'
];

if (!token) {
  console.log('verify-posts-schema: skip (no SUPABASE_ACCESS_TOKEN)');
  process.exit(0);
}

const inList = REQUIRED_COLUMNS.map((c) => `'${c}'`).join(', ');
const query = `
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'posts'
  AND column_name IN (${inList});
`;

const body = JSON.stringify({ query });

function postQuery() {
  return new Promise((resolve, reject) => {
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
            reject(new Error(`API ${res.statusCode}: ${data}`));
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

postQuery()
  .then((parsed) => {
    const rows = Array.isArray(parsed) ? parsed : [];
    const found = new Set(rows.map((r) => r.column_name).filter(Boolean));
    const missing = REQUIRED_COLUMNS.filter((c) => !found.has(c));
    if (missing.length) {
      console.error('verify-posts-schema: missing columns:', missing.join(', '));
      process.exit(1);
    }
    console.log('verify-posts-schema: OK', REQUIRED_COLUMNS.join(', '));
  })
  .catch((e) => {
    console.error('verify-posts-schema:', e.message || e);
    process.exit(1);
  });
