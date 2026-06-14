import test from 'node:test';
import assert from 'node:assert/strict';

const {
  onRequestGet,
  toPublicAfadSource,
  buildFallbackReason
} = await import('../../functions/api/afad-earthquake-snapshot.js');
const { __resetAfadCacheForTests } = await import('../../js/services/afad-service.js');

const sampleEvents = [
  {
    eventID: '10',
    magnitude: '3.8',
    province: 'Manisa',
    district: 'Akhisar',
    location: 'Akhisar (Manisa)',
    date: '2026-05-10T10:00:00'
  }
];

test('toPublicAfadSource maps live/cache/stale-with-data to afad', () => {
  assert.equal(toPublicAfadSource({ source: 'live', earthquakeRiskScore: 70 }), 'afad');
  assert.equal(toPublicAfadSource({ source: 'cache', earthquakeRiskScore: 60 }), 'afad');
  assert.equal(
    toPublicAfadSource({ source: 'stale', earthquakeRiskScore: 65, earthquakeSummary: 'x' }),
    'afad'
  );
  assert.equal(toPublicAfadSource({ source: 'fallback' }), 'fallback');
});

test('buildFallbackReason explains stale upstream', () => {
  const reason = buildFallbackReason({ source: 'stale', errors: [{ message: 'upstream_unavailable' }] });
  assert.match(reason, /önbellekteki son veri/i);
});

test('afad-earthquake-snapshot requires city parameter', async () => {
  const response = await onRequestGet({
    request: new Request('https://www.istebul.com/api/afad-earthquake-snapshot')
  });

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.data.source, 'fallback');
  assert.match(body.meta.fallbackReason, /city|province/i);
});

test('afad-earthquake-snapshot serves regional risk with debug payload', async () => {
  __resetAfadCacheForTests();

  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    async text() {
      return JSON.stringify(sampleEvents);
    }
  });

  const response = await onRequestGet({
    request: new Request(
      'https://www.istebul.com/api/afad-earthquake-snapshot?city=Manisa&district=Akhisar&debug=1'
    )
  });

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.data.source, 'afad');
  assert.equal(body.data.location.province, 'Manisa');
  assert.equal(body.data.location.district, 'Akhisar');
  assert.ok(body.data.earthquakeRiskScore >= 40);
  assert.ok(body.data.earthquakeSummary);
  assert.equal(body.data.debug.publicSource, 'afad');
});
