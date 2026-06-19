import test from 'node:test';
import assert from 'node:assert/strict';

const {
  onRequestGet,
  toPublicAfadSource,
  buildAfadFallbackReason,
  sanitizePublicEarthquakeEvent,
  sanitizeRegionalSignal,
  fetchAfadEarthquakeNationalSnapshot,
  __resetAfadSnapshotStateForTests
} = await import('../../functions/api/afad-earthquake-snapshot.js');

const {
  clearAfadEarthquakeFeatureOverride,
  setAfadEarthquakeFeatureOverride,
  resetAfadEarthquakeCacheForTests
} = await import('../../js/data/afad-earthquake-service.js');

const sampleAfadPayload = {
  data: [
    {
      eventID: 'secret-internal-1',
      magnitude: '4.2',
      depth: '9.5',
      province: 'Balıkesir',
      district: 'Sındırgı',
      location: 'Sındırgı (Balıkesir)',
      date: '2026-05-10T14:22:00',
      latitude: 39.12,
      longitude: 28.18
    },
    {
      eventID: 'secret-internal-2',
      magnitude: '2.4',
      depth: '6.0',
      province: 'İstanbul',
      district: 'Silivri',
      location: 'Silivri (İstanbul)',
      date: '2026-05-11T08:10:00'
    },
    {
      magnitude: 'bad',
      province: 'İzmir'
    }
  ]
};

function mockAfadJsonResponse(payload = sampleAfadPayload) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'application/json; charset=UTF-8' },
    async text() {
      return JSON.stringify(payload);
    }
  };
}

function resetAfadTestState() {
  clearAfadEarthquakeFeatureOverride();
  resetAfadEarthquakeCacheForTests();
  __resetAfadSnapshotStateForTests();
}

test('feature flag disabled returns safe unconfigured response without upstream fetch', async () => {
  resetAfadTestState();

  let fetchCalled = false;
  const response = await onRequestGet({
    request: new Request('https://www.istebul.com/api/afad-earthquake-snapshot'),
    env: { AFAD_EARTHQUAKE_ENABLED: 'false' }
  });

  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, false);
  assert.equal(body.data.status, 'disabled');
  assert.equal(body.data.source, 'disabled');
  assert.deepEqual(body.data.earthquakes, []);
  assert.deepEqual(body.data.regionalSignals, []);
  assert.equal(body.meta.featureEnabled, false);
  assert.match(body.meta.fallbackReason, /AFAD_EARTHQUAKE_ENABLED/);
  assert.equal(fetchCalled, false);
});

test('successful mock fetch returns normalized earthquakes and regional signals', async () => {
  resetAfadTestState();
  setAfadEarthquakeFeatureOverride(true);

  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return mockAfadJsonResponse();
  };

  const response = await onRequestGet({
    request: new Request('https://www.istebul.com/api/afad-earthquake-snapshot'),
    env: { AFAD_EARTHQUAKE_ENABLED: 'true' }
  });

  const body = await response.json();
  assert.equal(fetchCalled, true);
  assert.equal(body.ok, true);
  assert.equal(body.data.status, 'connected');
  assert.equal(body.data.source, 'afad');
  assert.ok(body.data.earthquakes.length >= 2);
  assert.ok(body.data.regionalSignals.length >= 2);
  assert.equal(body.data.earthquakes[0].magnitude, 2.4);
  assert.equal(body.data.earthquakes[0].province, 'İstanbul');
  assert.equal(body.data.earthquakes[0].eventID, undefined);
  assert.equal(body.data.earthquakes[0].latitude, undefined);
  assert.ok(body.data.attribution.provider.includes('AFAD'));
  assert.equal(body.meta.featureEnabled, true);
});

test('sanitize helpers normalize public fields only', () => {
  const event = sanitizePublicEarthquakeEvent({
    eventID: 'x',
    magnitude: '3.3',
    depth: '7',
    province: 'Ankara',
    district: 'Çankaya',
    location: 'Çankaya (Ankara)',
    date: '2026-05-01T00:00:00',
    secret: 'hidden'
  });

  assert.deepEqual(event, {
    date: '2026-05-01T00:00:00',
    magnitude: 3.3,
    depth: 7,
    location: 'Çankaya (Ankara)',
    province: 'Ankara',
    district: 'Çankaya'
  });

  const signal = sanitizeRegionalSignal(
    {
      province: 'Ankara',
      district: 'Çankaya',
      locationLabel: 'Ankara / Çankaya',
      eventCount: 4,
      maxMagnitude: 3.3,
      avgMagnitude: 2.1,
      significantCount: 0,
      earthquakeActivityLevel: 'düşük',
      hasLiveActivity: true,
      earthquakeSummary: 'Özet',
      earthquakeRiskScore: 88,
      activityScore: 44,
      seismicBaseRisk: 55
    },
    { province: 'Ankara', district: 'Çankaya' }
  );

  assert.equal(signal.activityLevel, 'düşük');
  assert.equal(signal.eventCount, 4);
  assert.equal(signal.earthquakeRiskScore, undefined);
  assert.equal(signal.activityScore, undefined);
  assert.equal(signal.seismicBaseRisk, undefined);
});

test('province filter scopes regional signals', async () => {
  resetAfadTestState();
  setAfadEarthquakeFeatureOverride(true);

  globalThis.fetch = async () => mockAfadJsonResponse();

  const response = await onRequestGet({
    request: new Request(
      'https://www.istebul.com/api/afad-earthquake-snapshot?province=İstanbul&district=Silivri'
    ),
    env: { AFAD_EARTHQUAKE_ENABLED: 'true' }
  });

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.data.regionalSignals.length, 1);
  assert.equal(body.data.regionalSignals[0].province, 'İstanbul');
  assert.equal(body.data.regionalSignals[0].district, 'Silivri');
});

test('AFAD unavailable falls back to static regional model', async () => {
  resetAfadTestState();
  setAfadEarthquakeFeatureOverride(true);

  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    async text() {
      return '<html>upstream-down</html>';
    }
  });

  const response = await onRequestGet({
    request: new Request('https://www.istebul.com/api/afad-earthquake-snapshot?province=İzmir'),
    env: { AFAD_EARTHQUAKE_ENABLED: 'true' }
  });

  const body = await response.json();
  assert.equal(body.ok, false);
  assert.equal(body.data.status, 'degraded');
  assert.equal(body.data.source, 'fallback');
  assert.deepEqual(body.data.earthquakes, []);
  assert.equal(body.data.regionalSignals.length, 1);
  assert.equal(body.data.regionalSignals[0].fallbackReason, 'AFAD non-JSON response');
  assert.match(body.meta.fallbackReason, /AFAD canlı veri çekilemedi/);
});

test('stale snapshot is served when live fetch fails after a successful pull', async () => {
  resetAfadTestState();
  setAfadEarthquakeFeatureOverride(true);

  let callCount = 0;
  globalThis.fetch = async () => {
    callCount += 1;
    if (callCount === 1) return mockAfadJsonResponse();
    throw new Error('AFAD network down');
  };

  const first = await fetchAfadEarthquakeNationalSnapshot(
    { AFAD_EARTHQUAKE_ENABLED: 'true' },
    { forceRefresh: true }
  );
  assert.equal(first.source, 'live');
  assert.ok(first.earthquakes.length > 0);

  resetAfadEarthquakeCacheForTests();

  const stale = await fetchAfadEarthquakeNationalSnapshot(
    { AFAD_EARTHQUAKE_ENABLED: 'true' },
    { forceRefresh: true }
  );
  assert.equal(stale.source, 'stale');
  assert.ok(stale.earthquakes.length > 0);
  assert.match(stale.errors?.[0]?.message || '', /AFAD network down/);
  assert.equal(toPublicAfadSource(stale), 'afad');
});

test('response does not leak secrets or internal scoring fields', async () => {
  resetAfadTestState();
  setAfadEarthquakeFeatureOverride(true);

  globalThis.fetch = async () => mockAfadJsonResponse();

  const response = await onRequestGet({
    request: new Request('https://www.istebul.com/api/afad-earthquake-snapshot'),
    env: {
      AFAD_EARTHQUAKE_ENABLED: 'true',
      AFAD_EARTHQUAKE_FEATURE_ENABLED: 'true',
      SECRET_TOKEN: 'super-secret-token'
    }
  });

  const raw = await response.text();
  const lower = raw.toLowerCase();
  assert.doesNotMatch(lower, /secret-internal/);
  assert.doesNotMatch(lower, /super-secret-token/);
  assert.doesNotMatch(lower, /earthquakeriskscore/);
  assert.doesNotMatch(lower, /activityscore/);
  assert.doesNotMatch(lower, /seismicbaserisk/);
  assert.doesNotMatch(lower, /api_key/);
  assert.doesNotMatch(lower, /authorization/);
});

test('toPublicAfadSource and buildAfadFallbackReason mappings', () => {
  resetAfadTestState();
  assert.equal(toPublicAfadSource({ source: 'live', earthquakes: [{ magnitude: 2 }] }), 'afad');
  assert.equal(toPublicAfadSource({ source: 'cache', earthquakes: [{ magnitude: 2 }] }), 'afad');
  assert.equal(
    toPublicAfadSource({ source: 'stale', earthquakes: [{ magnitude: 2 }] }),
    'afad'
  );
  assert.equal(toPublicAfadSource({ source: 'fallback', earthquakes: [] }), 'fallback');
  assert.equal(toPublicAfadSource({ source: 'disabled' }), 'disabled');

  const disabledReason = buildAfadFallbackReason({ source: 'disabled' }, {});
  assert.match(disabledReason, /AFAD_EARTHQUAKE_ENABLED/);
});
