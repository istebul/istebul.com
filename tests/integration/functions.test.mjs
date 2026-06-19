import test from 'node:test';
import assert from 'node:assert/strict';

const { onRequestGet, onRequestOptions: healthOptions } = await import('../../functions/api/health.js');
const { onRequestOptions: aiProxyOptions } = await import('../../functions/ai-proxy.js');

test('Cloudflare health endpoint returns no-store ok payload', async () => {
  const response = await onRequestGet();
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(body.ok, true);
  assert.equal(body.service, 'istebul.com');
  assert.ok(body.ts);
});

test('Cloudflare health OPTIONS returns 204', async () => {
  const response = await healthOptions();
  assert.equal(response.status, 204);
});

test('AI proxy OPTIONS CORS is scoped to production origin', async () => {
  const request = new Request('https://www.istebul.com/ai-proxy', {
    method: 'OPTIONS',
    headers: { Origin: 'https://istebul.com' }
  });
  const response = await aiProxyOptions({ request, env: {} });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://istebul.com');
  assert.notEqual(response.headers.get('Access-Control-Allow-Origin'), '*');
});

test('AI proxy OPTIONS rejects disallowed origin', async () => {
  const request = new Request('https://www.istebul.com/ai-proxy', {
    method: 'OPTIONS',
    headers: { Origin: 'https://evil.example' }
  });
  const response = await aiProxyOptions({ request, env: {} });
  assert.equal(response.status, 403);
});
