import test from 'node:test';
import assert from 'node:assert/strict';

const {
  normalizeReferralCode,
  generateReferralCodeFromEmail,
  buildReferralUrl,
  getStoredReferralCode,
  storeReferralCode
} = await import('../../js/features/growth/growth-engine.js');

test('normalizeReferralCode rejects short or invalid codes', () => {
  assert.equal(normalizeReferralCode('ab'), '');
  assert.equal(normalizeReferralCode('  Ali-123!  '), 'ali123');
});

test('storeReferralCode persists normalized value', () => {
  const key = 'istebul_referral_code';
  const prev = globalThis.localStorage?.getItem?.(key);
  try {
    if (typeof localStorage !== 'undefined') {
      storeReferralCode('  TestCODE99  ');
      assert.equal(getStoredReferralCode(), 'testcode99');
    }
  } finally {
    if (typeof localStorage !== 'undefined') {
      if (prev == null) localStorage.removeItem(key);
      else localStorage.setItem(key, prev);
    }
  }
});

test('buildReferralUrl encodes ref param', () => {
  const url = buildReferralUrl('demo12', '/auto/');
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('ref'), 'demo12');
  assert.equal(parsed.searchParams.get('utm_source'), 'referral');
});

test('generateReferralCodeFromEmail matches server shape', () => {
  const code = generateReferralCodeFromEmail('user@example.com');
  assert.match(code, /^[a-z0-9]{4,16}$/);
});
