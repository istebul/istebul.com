import test from 'node:test';
import assert from 'node:assert/strict';

const {
  fetchEvdsDebugReport,
  fetchEvdsSnapshot,
  getExchangeRates,
  getPolicyRate,
  getInflationData,
  getHousingLoanRates,
  parseLatestValue,
  buildEvdsSeriesUrl,
  seriesCodeToColumn,
  __resetEvdsCacheForTests,
  EVDS_SERIES
} = await import('../../js/services/evds-service.js');

function seriesFromEvdsUrl(url) {
  const match = String(url).match(/series=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function mockEvdsResponse(seriesCode, value, date = '15-05-2026') {
  const col = seriesCodeToColumn(seriesCode);
  return {
    items: [{ Tarih: date, UNIXTIME: '1715760000', [col]: String(value) }]
  };
}

test('buildEvdsSeriesUrl uses path-style params without API key', () => {
  const url = buildEvdsSeriesUrl('TP.DK.USD.A', {
    startDate: '01-01-2026',
    endDate: '04-06-2026'
  });
  assert.ok(url.startsWith('https://evds2.tcmb.gov.tr/service/evds/series='));
  assert.ok(url.includes('startDate=01-01-2026'));
  assert.ok(!url.includes('key='));
});

test('parseLatestValue reads flat EVDS items array', () => {
  const json = {
    items: [
      { Tarih: '01-05-2026', UNIXTIME: '1', TP_DK_USD_A: '32.10' },
      { Tarih: '02-05-2026', UNIXTIME: '2', TP_DK_USD_A: '32.55' }
    ]
  };
  const point = parseLatestValue(json, 'TP.DK.USD.A');
  assert.equal(point.value, 32.55);
  assert.equal(point.date, '02-05-2026');
});

test('parseLatestValue reads nested EVDS bucket (legacy)', () => {
  const json = {
    items: [
      {
        SERIES_CODE: 'TP.DK.USD.A',
        items: [{ Tarih: '15-05-2026', TP_DK_USD_A: '32.5' }]
      }
    ]
  };
  const point = parseLatestValue(json, 'TP.DK.USD.A');
  assert.equal(point.value, 32.5);
  assert.equal(point.date, '15-05-2026');
});

test('fetchEvdsSnapshot returns unconfigured without API key', async () => {
  __resetEvdsCacheForTests();
  const snap = await fetchEvdsSnapshot({});
  assert.equal(snap.configured, false);
  assert.equal(snap.source, 'unconfigured');
  assert.equal(snap.rates.usdTry, null);
});

test('fetchEvdsSnapshot uses header key and path URL (no query key)', async () => {
  __resetEvdsCacheForTests();
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push({ url, key: init?.headers?.key });
    const series = seriesFromEvdsUrl(url);
    return {
      ok: true,
      headers: { get: () => 'application/json; charset=UTF-8' },
      async json() {
        return mockEvdsResponse(series, series === EVDS_SERIES.USD_TRY ? 34.1 : 37.2);
      }
    };
  };

  const env = { TCMB_EVDS_API_KEY: 'test-secret-key' };
  const snap = await fetchEvdsSnapshot(env, { fetchImpl, forceRefresh: true });

  assert.equal(snap.source, 'live');
  assert.equal(snap.rates.usdTry, 34.1);
  assert.equal(snap.rates.eurTry, 37.2);
  assert.ok(snap.dataDate);
  assert.ok(seen.every((s) => !s.url.includes('key=')));
  assert.ok(seen.every((s) => s.key === 'test-secret-key'));
});

test('fetchEvdsSnapshot caches live snapshot for 24h', async () => {
  __resetEvdsCacheForTests();
  let calls = 0;
  const fetchImpl = async (url) => {
    calls += 1;
    const series = seriesFromEvdsUrl(url);
    return {
      ok: true,
      headers: { get: () => 'application/json' },
      async json() {
        if (series === EVDS_SERIES.USD_TRY) return mockEvdsResponse(series, 34.1);
        if (series === EVDS_SERIES.EUR_TRY) return mockEvdsResponse(series, 37.2);
        if (series === EVDS_SERIES.POLICY_RATE) return mockEvdsResponse(series, 45);
        if (series === EVDS_SERIES.CPI_ANNUAL) return mockEvdsResponse(series, 38.5);
        return mockEvdsResponse(series, 3.2);
      }
    };
  };

  const env = { TCMB_EVDS_API_KEY: 'test-secret-key' };
  const first = await fetchEvdsSnapshot(env, { fetchImpl });
  const second = await fetchEvdsSnapshot(env, { fetchImpl });

  assert.equal(first.source, 'live');
  assert.equal(first.rates.usdTry, 34.1);
  assert.equal(second.source, 'cache');
  assert.ok(calls >= 4);
  assert.ok(calls < 20);
});

test('fetchEvdsSnapshot uses stale snapshot when upstream fails', async () => {
  __resetEvdsCacheForTests();
  let fail = false;
  const fetchImpl = async (url) => {
    if (fail) throw new Error('network down');
    const series = seriesFromEvdsUrl(url);
    return {
      ok: true,
      headers: { get: () => 'application/json' },
      async json() {
        return mockEvdsResponse(series, 30);
      }
    };
  };

  const env = { TCMB_EVDS_API_KEY: 'test-secret-key' };
  const okSnap = await fetchEvdsSnapshot(env, { fetchImpl });
  assert.equal(okSnap.rates.usdTry, 30);

  fail = true;
  const stale = await fetchEvdsSnapshot(env, { fetchImpl, forceRefresh: true });
  assert.equal(stale.source, 'stale');
  assert.equal(stale.rates.usdTry, 30);
});

test('fetchEvdsSnapshot returns live when optional series fail but FX ok', async () => {
  __resetEvdsCacheForTests();
  const fetchImpl = async (url) => {
    const series = seriesFromEvdsUrl(url);
    if (series === EVDS_SERIES.HOUSING_LOAN) {
      return {
        ok: true,
        headers: { get: () => 'application/json' },
        async json() {
          return { items: [] };
        }
      };
    }
    return {
      ok: true,
      headers: { get: () => 'application/json' },
      async json() {
        const value =
          series === EVDS_SERIES.USD_TRY ? 35 : series === EVDS_SERIES.EUR_TRY ? 38 : 10;
        return mockEvdsResponse(series, value);
      }
    };
  };

  const snap = await fetchEvdsSnapshot(
    { TCMB_EVDS_API_KEY: 'k' },
    { fetchImpl, forceRefresh: true }
  );

  assert.equal(snap.source, 'live');
  assert.equal(snap.rates.usdTry, 35);
  assert.equal(snap.rates.eurTry, 38);
});

test('getter helpers expose exchange and policy rates', async () => {
  __resetEvdsCacheForTests();
  const fetchImpl = async (url) => {
    const series = seriesFromEvdsUrl(url);
    return {
      ok: true,
      headers: { get: () => 'application/json' },
      async json() {
        return mockEvdsResponse(series, series === EVDS_SERIES.CPI_ANNUAL ? 40 : 10);
      }
    };
  };
  const env = { TCMB_EVDS_API_KEY: 'k' };
  const fx = await getExchangeRates(env, { fetchImpl });
  const policy = await getPolicyRate(env, { fetchImpl });
  const inflation = await getInflationData(env, { fetchImpl });
  const housing = await getHousingLoanRates(env, { fetchImpl });

  assert.equal(typeof fx.usdTry, 'number');
  assert.equal(typeof policy.policyRate, 'number');
  assert.equal(inflation.cpiAnnual, 40);
  assert.ok(housing.housingLoanRate == null || typeof housing.housingLoanRate === 'number');
});

test('fetchEvdsDebugReport exposes safe upstream diagnostics without secrets', async () => {
  const secret = 'super-secret-evds-key';
  const fetchImpl = async (url, init) => {
    const series = seriesFromEvdsUrl(url);
    const body = JSON.stringify(mockEvdsResponse(series, 34.5));
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json; charset=UTF-8' },
      async text() {
        return body;
      }
    };
  };

  const report = await fetchEvdsDebugReport(
    { TCMB_EVDS_API_KEY: secret },
    { fetchImpl }
  );

  assert.equal(report.debug, true);
  assert.equal(report.configured, true);
  assert.deepEqual(report.requiredSeries, [EVDS_SERIES.USD_TRY, EVDS_SERIES.EUR_TRY]);
  assert.equal(report.probes.length, Object.keys(EVDS_SERIES).length);

  const serialized = JSON.stringify(report);
  assert.ok(!serialized.includes(secret));
  assert.ok(!serialized.includes('key='));

  const usdProbe = report.probes.find((probe) => probe.seriesCode === EVDS_SERIES.USD_TRY);
  assert.ok(usdProbe.requestUrl.includes('series=TP.DK.USD.A'));
  assert.ok(!usdProbe.requestUrl.includes('key='));
  assert.equal(usdProbe.httpStatus, 200);
  assert.match(usdProbe.contentType, /json/i);
  assert.ok(usdProbe.responseBodyPreview.length <= 300);
  assert.deepEqual(usdProbe.parsedTopLevelKeys, ['items']);
  assert.ok(usdProbe.normalizedFieldNames.includes('TP_DK_USD_A'));
  assert.equal(usdProbe.parseResult.value, 34.5);
  assert.equal(usdProbe.errorMessage, null);
});

test('fetchEvdsDebugReport reports upstream HTTP errors safely', async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 403,
    headers: { get: () => 'text/html' },
    async text() {
      return '<html>Forbidden key=leaked-secret-value</html>';
    }
  });

  const report = await fetchEvdsDebugReport(
    { TCMB_EVDS_API_KEY: 'leaked-secret-value' },
    { fetchImpl }
  );

  const probe = report.probes[0];
  assert.equal(probe.httpStatus, 403);
  assert.match(probe.errorMessage, /403/);
  assert.ok(!probe.responseBodyPreview.includes('leaked-secret-value'));
  assert.ok(probe.responseBodyPreview.includes('[REDACTED]'));
});
