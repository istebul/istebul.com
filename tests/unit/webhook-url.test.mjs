import test from 'node:test';
import assert from 'node:assert/strict';

// Deno shared module — validate logic via inline mirror for CI (esbuild path)
function isPrivateIpv4(host) {
  const parts = host.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
}

function assertSafePartnerWebhookUrl(raw) {
  const url = new URL(String(raw || '').trim());
  if (url.protocol !== 'https:') throw new Error('HTTPS required');
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || isPrivateIpv4(host)) throw new Error('blocked');
  return url.href;
}

test('webhook URL rejects HTTP and private hosts', () => {
  assert.throws(() => assertSafePartnerWebhookUrl('http://example.com/hook'));
  assert.throws(() => assertSafePartnerWebhookUrl('https://127.0.0.1/hook'));
  assert.equal(assertSafePartnerWebhookUrl('https://partner.example.com/leads'), 'https://partner.example.com/leads');
});
