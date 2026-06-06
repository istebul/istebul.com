import test from 'node:test';
import assert from 'node:assert/strict';

const {
  isAfadEarthquakeEnabled,
  setAfadEarthquakeFeatureOverride,
  clearAfadEarthquakeFeatureOverride,
  fetchAfadEarthquakeRiskSnapshot,
  resetAfadEarthquakeCacheForTests
} = await import('../../js/data/afad-earthquake-service.js');

const {
  buildAfadEarthquakeRiskModel,
  buildAfadEarthquakeFallbackModel,
  parseAfadEarthquakeEvents
} = await import('../../js/data/afad-earthquake-model.js');

const sampleEvents = [
  {
    eventID: '1',
    magnitude: '4.1',
    depth: '8',
    province: 'Balıkesir',
    district: 'Sındırgı',
    location: 'Sındırgı (Balıkesir)',
    date: '2026-05-01T12:00:00'
  },
  {
    eventID: '2',
    magnitude: '2.0',
    depth: '6',
    province: 'Balıkesir',
    district: 'Sındırgı',
    location: 'Sındırgı (Balıkesir)',
    date: '2026-05-02T08:00:00'
  }
];

test('feature flag disabled returns disabled snapshot without upstream fetch', async () => {
  clearAfadEarthquakeFeatureOverride();
  resetAfadEarthquakeCacheForTests();

  let fetchCalled = false;
  const snapshot = await fetchAfadEarthquakeRiskSnapshot(
    { province: 'İstanbul', district: 'Kadıköy' },
    {
      env: { AFAD_EARTHQUAKE_ENABLED: 'false' },
      fetchImpl: async () => {
        fetchCalled = true;
        return { ok: true, headers: { get: () => 'application/json' }, text: async () => '[]' };
      }
    }
  );

  assert.equal(isAfadEarthquakeEnabled({ AFAD_EARTHQUAKE_ENABLED: 'false' }), false);
  assert.equal(fetchCalled, false);
  assert.equal(snapshot.enabled, false);
  assert.equal(snapshot.source, 'disabled');
  assert.equal(snapshot.model.fallbackReason, 'feature_disabled');
  assert.ok(snapshot.model.earthquakeRiskScore >= 0);
});

test('invalid data falls back to static regional model', async () => {
  clearAfadEarthquakeFeatureOverride();
  resetAfadEarthquakeCacheForTests();
  setAfadEarthquakeFeatureOverride(true);

  const snapshot = await fetchAfadEarthquakeRiskSnapshot(
    { province: 'İzmir', district: 'Konak' },
    {
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        async text() {
          return '<html>not-json</html>';
        }
      })
    }
  );

  assert.equal(snapshot.source, 'fallback');
  assert.equal(snapshot.model.fallbackReason, 'AFAD non-JSON response');
  assert.equal(snapshot.model.eventCount, 0);
  assert.match(snapshot.model.earthquakeSummary, /AFAD deprem istihbaratı/i);
});

test('risk model output aggregates province events and scores', () => {
  const invalid = parseAfadEarthquakeEvents({ data: [{ magnitude: 'bad' }, null, 'x'] });
  assert.equal(invalid.length, 0);

  const model = buildAfadEarthquakeRiskModel({
    province: 'Balıkesir',
    district: 'Sındırgı',
    events: sampleEvents
  });

  assert.equal(model.eventCount, 2);
  assert.equal(model.maxMagnitude, 4.1);
  assert.ok(model.earthquakeRiskScore >= 55);
  assert.ok(['düşük', 'orta', 'yüksek', 'çok yüksek', 'sakin'].includes(model.earthquakeActivityLevel));
  assert.match(model.earthquakeSummary, /AFAD deprem istihbaratı/i);

  const fallback = buildAfadEarthquakeFallbackModel({ province: 'İstanbul', reason: 'test' });
  assert.equal(fallback.eventCount, 0);
  assert.equal(fallback.fallbackReason, 'test');
  assert.ok(fallback.earthquakeRiskScore >= 70);
});
