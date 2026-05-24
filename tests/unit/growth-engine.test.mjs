import test from 'node:test';
import assert from 'node:assert/strict';

const {
  resolveGrowthChannel,
  buildReferralUrl,
  buildRecoveryUrl,
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
  assert.match(url, /recover/);
});
