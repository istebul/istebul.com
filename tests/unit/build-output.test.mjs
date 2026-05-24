import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('production env script only contains browser-safe keys', () => {
  const script = fs.readFileSync(path.join(root, 'scripts/production-build.cjs'), 'utf8');

  assert.match(script, /SUPABASE_URL/);
  assert.match(script, /SUPABASE_ANON_KEY/);
  assert.doesNotMatch(script, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(script, /CLAUDE_API_KEY/);
  assert.doesNotMatch(script, /NETLIFY_AUTH_TOKEN/);
});

test('service worker pre-caches offline page but bypasses env.js cache', () => {
  const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

  assert.match(worker, /'\/offline\.html'/);
  assert.match(worker, /pathname === '\/env\.js'/);
  assert.match(worker, /cache: 'no-store'/);
  assert.match(worker, /IMMUTABLE_ASSET/);
});

test('offline page has no third-party runtime dependencies', () => {
  const offline = fs.readFileSync(path.join(root, 'offline.html'), 'utf8');

  assert.doesNotMatch(offline, /https:\/\//);
  assert.match(offline, /Çevrimdışı moddasınız/);
});
