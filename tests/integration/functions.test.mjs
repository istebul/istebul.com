import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { handler: healthHandler } = require('../../netlify/functions/health.js');
const { handler: claudeHandler } = require('../../netlify/functions/claude-proxy.js');
const { handler: uploadHandler } = require('../../netlify/functions/upload-image.js');
const { handler: supabaseProxyHandler } = require('../../netlify/functions/supabase-proxy.js');
const { checkRateLimit, withRateLimitHeaders } = require('../../netlify/functions/_rate-limit.js');

test('health endpoint returns no-store ok payload', async () => {
  const response = await healthHandler();
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.equal(body.status, 'ok');
  assert.equal(body.service, 'istebul');
});

test('rate limit helper returns limit and retry headers', () => {
  const event = { headers: { 'x-forwarded-for': '203.0.113.10' } };
  const first = checkRateLimit(event, { scope: 'integration-test', windowMs: 60000, max: 1 });
  const second = checkRateLimit(event, { scope: 'integration-test', windowMs: 60000, max: 1 });
  const response = withRateLimitHeaders({ statusCode: 429, headers: {}, body: '{}' }, second);

  assert.equal(first.limited, false);
  assert.equal(second.limited, true);
  assert.equal(response.headers['X-RateLimit-Limit'], '1');
  assert.equal(response.headers['X-RateLimit-Remaining'], '0');
  assert.ok(response.headers['Retry-After']);
});

test('protected function CORS defaults are scoped to production origin', async () => {
  const event = { httpMethod: 'OPTIONS', headers: {} };
  const responses = await Promise.all([
    claudeHandler(event),
    uploadHandler(event),
    supabaseProxyHandler(event)
  ]);

  for (const response of responses) {
    assert.equal(response.statusCode, 204);
    assert.equal(response.headers['Access-Control-Allow-Origin'], 'https://istebul.com');
    assert.equal(response.headers.Vary, 'Origin');
    assert.notEqual(response.headers['Access-Control-Allow-Origin'], '*');
  }
});
