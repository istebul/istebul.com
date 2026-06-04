import test from 'node:test';
import assert from 'node:assert/strict';

const {
  fetchEvdsFxDebugProbe,
  fetchEvdsSnapshot,
  getExchangeRates,
  getPolicyRate,
  getInflationData,
  getHousingLoanRates,
  parseLatestValue,
  buildEvdsSeriesUrl,
  EVDS_BASE_URL,
  parseEvdsResponseBody,
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

function mockEvdsFetchResponse(body, contentType = 'application/json; charset=UTF-8') {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: true,
    status: 200,
    headers: { get: () => contentType },
    async text() {
      return payload;
    }
  };
}

function mockFxPairFetchResponse(usd = 34.1, eur = 37.2, date = '15-05-2026') {
  return mockEvdsFetchResponse({
    items: [
      {
        Tarih: date,
        UNIXTIME: '1715760000',
        TP_DK_USD_A: String(usd),
        TP_DK_EUR_A: String(eur)
      }
    ]
  });
}

function resolveEvdsFetch(url, valueBySeries = {}) {
  const series = seriesFromEvdsUrl(url);
  if (series?.includes('-')) {
    return mockFxPairFetchResponse(
      valueBySeries[EVDS_SERIES.USD_TRY] ?? 34.1,
      valueBySeries[EVDS_SERIES.EUR_TRY] ?? 37.2
    );
  }
  const value = valueBySeries[series] ?? 10;
  return mockEvdsFetchResponse(mockEvdsResponse(series, value));
}

test('buildEvdsSeriesUrl uses EVDS3 igmevdsms-dis path without API key', () => {
  const url = buildEvdsSeriesUrl('TP.DK.USD.A', {
    startDate: '01-01-2026',
    endDate: '04-06-2026'
  });
  assert.equal(EVDS_BASE_URL, 'https://evds3.tcmb.gov.tr/igmevdsms-dis/service/evds/');
  assert.ok(url.startsWith(`${EVDS_BASE_URL}series=`));
  assert.ok(url.includes('startDate=01-01-2026'));
  assert.ok(!url.includes('key='));
});

test('parseEvdsResponseBody skips JSON parse for HTML upstream', async () => {
  const response = {
    headers: { get: () => 'text/html; charset=utf-8' },
    text: async () => '<!DOCTYPE html><html><body>EVDS app shell</body></html>'
  };
  const parsed = await parseEvdsResponseBody(response, 'secret');
  assert.equal(parsed.parseSkipped, true);
  assert.match(parsed.parseError, /non-JSON/i);
  assert.equal(parsed.json, null);
  assert.ok(!parsed.bodyText.includes('secret'));
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
    return resolveEvdsFetch(url, {
      [EVDS_SERIES.USD_TRY]: 34.1,
      [EVDS_SERIES.EUR_TRY]: 37.2,
      [EVDS_SERIES.POLICY_RATE]: 45,
      [EVDS_SERIES.CPI_ANNUAL]: 38.5,
      [EVDS_SERIES.HOUSING_LOAN]: 3.2
    });
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
    return resolveEvdsFetch(url, {
      [EVDS_SERIES.USD_TRY]: 34.1,
      [EVDS_SERIES.EUR_TRY]: 37.2,
      [EVDS_SERIES.POLICY_RATE]: 45,
      [EVDS_SERIES.CPI_ANNUAL]: 38.5,
      [EVDS_SERIES.HOUSING_LOAN]: 3.2
    });
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
    return resolveEvdsFetch(url, {
      [EVDS_SERIES.USD_TRY]: 30,
      [EVDS_SERIES.EUR_TRY]: 30,
      [EVDS_SERIES.POLICY_RATE]: 30,
      [EVDS_SERIES.CPI_ANNUAL]: 30,
      [EVDS_SERIES.HOUSING_LOAN]: 30
    });
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
      return mockEvdsFetchResponse({ items: [] });
    }
    return resolveEvdsFetch(url, {
      [EVDS_SERIES.USD_TRY]: 35,
      [EVDS_SERIES.EUR_TRY]: 38,
      [EVDS_SERIES.POLICY_RATE]: 10,
      [EVDS_SERIES.CPI_ANNUAL]: 10
    });
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
  const fetchImpl = async (url) =>
    resolveEvdsFetch(url, {
      [EVDS_SERIES.USD_TRY]: 10,
      [EVDS_SERIES.EUR_TRY]: 10,
      [EVDS_SERIES.POLICY_RATE]: 10,
      [EVDS_SERIES.CPI_ANNUAL]: 40,
      [EVDS_SERIES.HOUSING_LOAN]: 10
    });
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

test('fetchEvdsFxDebugProbe exposes safe FX upstream diagnostics without secrets', async () => {
  const secret = 'super-secret-evds-key';
  const fetchImpl = async (url, init) => {
    assert.ok(!url.includes('key='));
    assert.equal(init?.headers?.key, secret);
    return mockFxPairFetchResponse(34.1, 37.2, '01-05-2026');
  };

  const debug = await fetchEvdsFxDebugProbe({ TCMB_EVDS_API_KEY: secret }, { fetchImpl });

  assert.equal(debug.temporary, true);
  assert.deepEqual(debug.usedSeries, [EVDS_SERIES.USD_TRY, EVDS_SERIES.EUR_TRY]);
  assert.ok(debug.evdsRequestUrlMasked.includes('igmevdsms-dis/service/evds/'));
  assert.ok(debug.evdsRequestUrlMasked.includes('series=TP.DK.USD.A-TP.DK.EUR.A'));
  assert.ok(!debug.evdsRequestUrlMasked.includes('key='));
  assert.equal(debug.evdsHttpStatus, 200);
  assert.match(debug.evdsContentType, /json/i);
  assert.ok(debug.evdsBodyPreview.length <= 300);
  assert.deepEqual(debug.evdsTopLevelKeys, ['items']);
  assert.equal(debug.evdsItemsLength, 1);
  assert.ok(debug.evdsFirstItemKeys.includes('TP_DK_USD_A'));
  assert.ok(debug.normalizedFieldCandidates.includes('TP_DK_USD_A'));
  assert.equal(debug.errorMessage, null);

  const serialized = JSON.stringify(debug);
  assert.ok(!serialized.includes(secret));
});

test('fetchEvdsFxDebugProbe reports HTML app shell without JSON parse', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => 'text/html; charset=utf-8' },
    async text() {
      return '<!DOCTYPE html><html><body>EVDS app shell</body></html>';
    }
  });

  const debug = await fetchEvdsFxDebugProbe({ TCMB_EVDS_API_KEY: 'k' }, { fetchImpl });

  assert.match(debug.evdsContentType, /text\/html/i);
  assert.match(debug.errorMessage, /non-JSON/i);
  assert.equal(debug.evdsTopLevelKeys.length, 0);
});

test('fetchEvdsFxDebugProbe reports upstream HTTP errors safely', async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 403,
    headers: { get: () => 'text/html' },
    async text() {
      return '<html>Forbidden key=leaked-secret-value</html>';
    }
  });

  const debug = await fetchEvdsFxDebugProbe(
    { TCMB_EVDS_API_KEY: 'leaked-secret-value' },
    { fetchImpl }
  );

  assert.equal(debug.evdsHttpStatus, 403);
  assert.match(debug.errorMessage, /403/);
  assert.ok(!debug.evdsBodyPreview.includes('leaked-secret-value'));
  assert.ok(debug.evdsBodyPreview.includes('[REDACTED]'));
});

test('fetchEvdsFxDebugProbe handles missing API key', async () => {
  const debug = await fetchEvdsFxDebugProbe({});
  assert.match(debug.errorMessage, /not configured/i);
  assert.equal(debug.evdsRequestUrlMasked, null);
});
