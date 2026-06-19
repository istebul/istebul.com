import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PARTNER_LEAD_PAYLOAD_FIELDS,
  RETRY_SCHEDULE,
  EXAMPLE_PRODUCTION_PAYLOAD,
  timingSafeEqualHex,
  canonicalJsonStringify,
  verifyWebhookSignature,
  buildExamplePayloadJson
} from '../../js/features/partner/partner-api-docs.js';

test('PARTNER_LEAD_PAYLOAD_FIELDS includes dispatch metadata', () => {
  const fields = PARTNER_LEAD_PAYLOAD_FIELDS.map((f) => f.field);
  assert.ok(fields.includes('lead_id'));
  assert.ok(fields.includes('dispatch_attempt_id'));
});

test('RETRY_SCHEDULE has five attempts', () => {
  assert.equal(RETRY_SCHEDULE.length, 5);
});

test('EXAMPLE_PRODUCTION_PAYLOAD has hot priority fields', () => {
  assert.ok(['hot', 'very_hot'].includes(EXAMPLE_PRODUCTION_PAYLOAD.priority));
  assert.ok(EXAMPLE_PRODUCTION_PAYLOAD.lead_score >= 120);
});

test('timingSafeEqualHex is constant-time safe for length mismatch', () => {
  assert.equal(timingSafeEqualHex('abc', 'abcd'), false);
});

test('verifyWebhookSignature validates HMAC hex', async () => {
  const body = canonicalJsonStringify({ test: 1 });
  const secret = 'test-secret-32chars-min!!!!';
  const { expected } = await verifyWebhookSignature(secret, body, '');
  const check = await verifyWebhookSignature(secret, body, expected);
  assert.equal(check.valid, true);
});

test('buildExamplePayloadJson returns parseable JSON', () => {
  const json = buildExamplePayloadJson();
  const parsed = JSON.parse(json);
  assert.equal(parsed.partner_route, 'dealer_partner');
});
