import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

if (!globalThis.Deno) {
  globalThis.Deno = { env: { get: (key) => process.env[key] } };
}

let createIyzwsv2AuthorizationHeader;
let verifyIyzicoWebhookSignature;

test.before(async () => {
  ({
    createIyzwsv2AuthorizationHeader,
    verifyIyzicoWebhookSignature
  } = await import('../../supabase/functions/_shared/iyzico-client.ts'));
});

const root = join(process.cwd());
const clientPath = join(root, 'supabase/functions/_shared/iyzico-client.ts');

const CHECKOUT_FIXTURE = {
  apiKey: 'sandbox-api-key',
  secretKey: 'sandbox-secret-key',
  randomKey: '1234567890123',
  uriPath: '/payment/iyzipos/checkoutform/initialize/auth/ecom',
  body: { locale: 'tr', conversationId: 'conv-fixture-001', price: '199.00' }
};

const WEBHOOK_SECRET = 'dummy-webhook-secret-for-tests';
const WEBHOOK_BODY = '{"paymentStatus":"success","conversationId":"conv-fixture-001"}';

async function hmacSha256Hex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sigBuf))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function expectedCheckoutAuthorization(fixture) {
  const payload =
    fixture.randomKey + fixture.uriPath + JSON.stringify(fixture.body);
  const signature = await hmacSha256Hex(fixture.secretKey, payload);
  const authorizationString =
    `apiKey:${fixture.apiKey}&randomKey:${fixture.randomKey}&signature:${signature}`;
  return `IYZWSv2 ${Buffer.from(authorizationString, 'utf8').toString('base64')}`;
}

async function webhookSignatureForBody(body, secret = WEBHOOK_SECRET) {
  return hmacSha256Hex(secret, body);
}

test('iyzico client source wires checkout signer through createIyzwsv2AuthorizationHeader', () => {
  const source = readFileSync(clientPath, 'utf8');
  assert.match(source, /export async function createIyzwsv2AuthorizationHeader/);
  assert.match(source, /return createIyzwsv2AuthorizationHeader\(apiKey, secretKey, randomKey, uriPath, body\)/);
  assert.doesNotMatch(source, /full HMAC implementation TODO/);
});

test('createIyzwsv2AuthorizationHeader produces deterministic IYZWSv2 header', async () => {
  const header = await createIyzwsv2AuthorizationHeader(
    CHECKOUT_FIXTURE.apiKey,
    CHECKOUT_FIXTURE.secretKey,
    CHECKOUT_FIXTURE.randomKey,
    CHECKOUT_FIXTURE.uriPath,
    CHECKOUT_FIXTURE.body
  );

  assert.match(header, /^IYZWSv2 /);

  const encoded = header.slice('IYZWSv2 '.length);
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  assert.match(decoded, /^apiKey:sandbox-api-key&randomKey:1234567890123&signature:[0-9a-f]{64}$/);

  const expected = await expectedCheckoutAuthorization(CHECKOUT_FIXTURE);
  assert.equal(header, expected);

  const again = await createIyzwsv2AuthorizationHeader(
    CHECKOUT_FIXTURE.apiKey,
    CHECKOUT_FIXTURE.secretKey,
    CHECKOUT_FIXTURE.randomKey,
    CHECKOUT_FIXTURE.uriPath,
    CHECKOUT_FIXTURE.body
  );
  assert.equal(again, header);
});

test('createIyzwsv2AuthorizationHeader changes signature when request body changes', async () => {
  const base = await createIyzwsv2AuthorizationHeader(
    CHECKOUT_FIXTURE.apiKey,
    CHECKOUT_FIXTURE.secretKey,
    CHECKOUT_FIXTURE.randomKey,
    CHECKOUT_FIXTURE.uriPath,
    CHECKOUT_FIXTURE.body
  );
  const changed = await createIyzwsv2AuthorizationHeader(
    CHECKOUT_FIXTURE.apiKey,
    CHECKOUT_FIXTURE.secretKey,
    CHECKOUT_FIXTURE.randomKey,
    CHECKOUT_FIXTURE.uriPath,
    { ...CHECKOUT_FIXTURE.body, conversationId: 'conv-fixture-002' }
  );
  assert.notEqual(base, changed);
});

test('verifyIyzicoWebhookSignature accepts valid x-iyz-signature-v3', async () => {
  process.env.IYZICO_WEBHOOK_SECRET = WEBHOOK_SECRET;
  const signature = await webhookSignatureForBody(WEBHOOK_BODY);
  const headers = new Headers({ 'x-iyz-signature-v3': signature });

  assert.equal(await verifyIyzicoWebhookSignature(WEBHOOK_BODY, headers), true);
});

test('verifyIyzicoWebhookSignature rejects missing header', async () => {
  process.env.IYZICO_WEBHOOK_SECRET = WEBHOOK_SECRET;
  assert.equal(await verifyIyzicoWebhookSignature(WEBHOOK_BODY, new Headers()), false);
});

test('verifyIyzicoWebhookSignature rejects wrong signature', async () => {
  process.env.IYZICO_WEBHOOK_SECRET = WEBHOOK_SECRET;
  const headers = new Headers({ 'x-iyz-signature-v3': '0'.repeat(64) });
  assert.equal(await verifyIyzicoWebhookSignature(WEBHOOK_BODY, headers), false);
});

test('verifyIyzicoWebhookSignature rejects when webhook secret is unset', async () => {
  delete process.env.IYZICO_WEBHOOK_SECRET;
  const signature = await webhookSignatureForBody(WEBHOOK_BODY);
  const headers = new Headers({ 'x-iyz-signature-v3': signature });
  assert.equal(await verifyIyzicoWebhookSignature(WEBHOOK_BODY, headers), false);
});

test('verifyIyzicoWebhookSignature rejects tampered body', async () => {
  process.env.IYZICO_WEBHOOK_SECRET = WEBHOOK_SECRET;
  const signature = await webhookSignatureForBody(WEBHOOK_BODY);
  const headers = new Headers({ 'x-iyz-signature-v3': signature });
  const tamperedBody = WEBHOOK_BODY.replace('success', 'failed');

  assert.equal(await verifyIyzicoWebhookSignature(tamperedBody, headers), false);
});

test('payments-env documents IYZWSv2 checkout auth and x-iyz-signature-v3 webhook header', () => {
  const doc = readFileSync(join(root, 'docs/payments-env.md'), 'utf8');
  assert.match(doc, /IYZWSv2/);
  assert.match(doc, /x-iyz-signature-v3/i);
  assert.match(doc, /sandbox/i);
  assert.doesNotMatch(doc, /IYZWSv2 — `iyzico-webhook`/);
});
