import test from 'node:test';
import assert from 'node:assert/strict';

const {
  BRAND,
  CTA,
  getCta,
  getTrustPhrases,
  containsBannedPhrase,
  auditCopy,
  getBrandSnapshot
} = await import('../../js/core/brand-voice.js');

test('BRAND exposes canonical name and descriptor', () => {
  assert.equal(BRAND.name, 'isteBul');
  assert.ok(BRAND.descriptor.includes('Karar'));
});

test('getCta returns primary CTA', () => {
  assert.equal(getCta('primary'), 'Karar analizini başlat');
});

test('getTrustPhrases returns rail copy', () => {
  const rail = getTrustPhrases('rail');
  assert.equal(rail.length, 4);
  assert.ok(rail[0].includes('KVKK'));
});

test('containsBannedPhrase detects hype copy', () => {
  assert.equal(containsBannedPhrase('2 dk ücretsiz deneme'), true);
  assert.equal(containsBannedPhrase('Karar analizini başlat'), false);
});

test('auditCopy reports violations', () => {
  const result = auditCopy('Son şans — hemen al');
  assert.equal(result.ok, false);
  assert.ok(result.violations.length >= 1);
});

test('getBrandSnapshot is serializable', () => {
  const snap = getBrandSnapshot();
  assert.equal(snap.cta.primary, CTA.primary);
});
