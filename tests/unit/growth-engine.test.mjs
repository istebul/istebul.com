import test from 'node:test';
import assert from 'node:assert/strict';

const {
  resolveGrowthChannel,
  buildReferralUrl,
  buildRecoveryUrl,
  generateReferralCodeFromEmail,
  normalizeReferralCode,
  GROWTH_CHANNELS
} = await import('../../js/features/growth/growth-engine.js');

test('resolveGrowthChannel detects referral ref', () => {
  assert.equal(resolveGrowthChannel({ ref: 'ali123' }), GROWTH_CHANNELS.REFERRAL);
});

test('resolveGrowthChannel detects paid gclid', () => {
  assert.equal(resolveGrowthChannel({ gclid: 'x', utm_medium: 'cpc' }), GROWTH_CHANNELS.PAID);
});

test('resolveGrowthChannel detects organic', () => {
  assert.equal(resolveGrowthChannel({ utm_medium: 'organic' }), GROWTH_CHANNELS.SEO);
});

test('buildReferralUrl includes ref and utm', () => {
  const url = buildReferralUrl('testcode', '/auto/');
  assert.match(url, /ref=testcode/);
  assert.match(url, /utm_source=referral/);
});

test('buildRecoveryUrl uses recovery utm', () => {
  const url = buildRecoveryUrl('abandon_24h');
  assert.match(url, /utm_source=recovery/);
  assert.match(url, /utm_medium=abandon/);
  assert.match(url, /growth_campaign=abandon_24h/);
});

test('generateReferralCodeFromEmail is stable and bounded', () => {
  const a = generateReferralCodeFromEmail('ali@example.com');
  const b = generateReferralCodeFromEmail('ali@example.com');
  assert.equal(a, b);
  assert.ok(a.length <= 16);
  assert.ok(a.length >= 4);
});

test('resolveGrowthChannel detects lifecycle email', () => {
  assert.equal(resolveGrowthChannel({ utm_medium: 'lifecycle' }), GROWTH_CHANNELS.LIFECYCLE_EMAIL);
});

test('normalizeReferralCode strips invalid characters', () => {
  assert.equal(normalizeReferralCode('IB-2026'), 'ib2026');
});
