import test from 'node:test';
import assert from 'node:assert/strict';

const {
  onRequestGet,
  toPublicEvdsSource,
  buildFallbackReason
} = await import('../../functions/api/evds-snapshot.js');
const { __resetEvdsCacheForTests, EVDS_SERIES } = await import('../../js/services/evds-service.js');

function mockEvdsFetchResponse(body) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'application/json; charset=UTF-8' },
    async text() {
      return JSON.stringify(body);
    }
  };
}

function seriesFromEvdsUrl(url) {
  const match = String(url).match(/series=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function mockEvdsResponse(seriesCode, value, date = '2026-3') {
  const col = seriesCode.replace(/\./g, '_');
  return { items: [{ Tarih: date, [col]: String(value) }] };
}

test('evds-snapshot debug=1 exposes series codes', async () => {
  __resetEvdsCacheForTests();

  const fetchImpl = async (url) => {
    const series = seriesFromEvdsUrl(url);
    if (series?.includes('-')) {
      return mockEvdsFetchResponse({
        items: [{ Tarih: '04-06-2026', TP_DK_USD_A: '45.87', TP_DK_EUR_A: '53.28' }]
      });
    }
    const valueBySeries = {
      [EVDS_SERIES.POLICY_RATE]: 40,
      [EVDS_SERIES.CPI_ANNUAL]: 35.4,
      [EVDS_SERIES.HOUSING_LOAN]: 53.23
    };
    return mockEvdsFetchResponse(mockEvdsResponse(series, valueBySeries[series] ?? 10));
  };

  globalThis.fetch = fetchImpl;

  const response = await onRequestGet({
    request: new Request('https://www.istebul.com/api/evds-snapshot?debug=1'),
    env: { TCMB_EVDS_API_KEY: 'test-key' }
  });

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.data.source, 'evds');
  assert.equal(body.data.debug.publicSource, 'evds');
  assert.equal(body.data.debug.sourceDetail, 'live');
  assert.equal(body.data.debug.fallbackReason, null);
  assert.equal(body.data.debug.apiKeyConfigured, true);
  assert.match(body.data.debug.seriesCodes.cpiAnnual, /TP\.FG\.J0/);
  assert.equal(typeof body.data.rates.cpiAnnual, 'number');
  assert.ok(body.data.seriesDates.cpiAnnual);
  assert.equal(body.meta.errorCount, 0);
  assert.equal(body.meta.sourceDetail, 'live');
});

test('toPublicEvdsSource maps live/cache/stale-with-data to evds', () => {
  assert.equal(toPublicEvdsSource({ source: 'live', rates: { usdTry: 1 } }), 'evds');
  assert.equal(toPublicEvdsSource({ source: 'cache', rates: { policyRate: 40 } }), 'evds');
  assert.equal(
    toPublicEvdsSource({ source: 'stale', rates: { usdTry: 1, eurTry: 2 } }),
    'evds'
  );
  assert.equal(toPublicEvdsSource({ source: 'fallback', rates: {} }), 'fallback');
});

test('buildFallbackReason explains missing API key', () => {
  const reason = buildFallbackReason({ source: 'unconfigured' }, {});
  assert.match(reason, /TCMB_EVDS_API_KEY/);
  assert.match(reason, /EVDS_API_KEY/);
});

test('evds-snapshot without API key returns fallback source and debug reason', async () => {
  __resetEvdsCacheForTests();

  const response = await onRequestGet({
    request: new Request('https://www.istebul.com/api/evds-snapshot?debug=1'),
    env: {}
  });

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.data.source, 'fallback');
  assert.match(body.data.debug.fallbackReason, /TCMB_EVDS_API_KEY/);
  assert.equal(body.data.debug.apiKeyConfigured, false);
  assert.match(body.meta.fallbackReason, /TCMB_EVDS_API_KEY/);
});

test('fetchEvdsSnapshot accepts EVDS_API_KEY alias', async () => {
  __resetEvdsCacheForTests();
  const fetchImpl = async (url) => {
    const series = seriesFromEvdsUrl(url);
    if (series?.includes('-')) {
      return mockEvdsFetchResponse({
        items: [{ Tarih: '04-06-2026', TP_DK_USD_A: '45.87', TP_DK_EUR_A: '53.28' }]
      });
    }
    return mockEvdsFetchResponse(mockEvdsResponse(series, 40));
  };
  globalThis.fetch = fetchImpl;

  const response = await onRequestGet({
    request: new Request('https://www.istebul.com/api/evds-snapshot'),
    env: { EVDS_API_KEY: 'alias-key' }
  });
  const body = await response.json();
  assert.equal(body.data.source, 'evds');
  assert.equal(body.data.rates.usdTry, 45.87);
});
