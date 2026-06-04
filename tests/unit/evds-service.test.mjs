import test from 'node:test';
import assert from 'node:assert/strict';

const {
  fetchEvdsSnapshot,
  getExchangeRates,
  getPolicyRate,
  getInflationData,
  getHousingLoanRates,
  parseLatestValue,
  __resetEvdsCacheForTests,
  EVDS_SERIES
} = await import('../../js/services/evds-service.js');

function mockEvdsResponse(seriesCode, value, date = '15-05-2026') {
  const col = seriesCode.replace(/\./g, '_');
  return {
    items: [
      {
        SERIES_CODE: seriesCode,
        items: [{ Tarih: date, [col]: String(value) }]
      }
    ]
  };
}

test('parseLatestValue reads last EVDS row', () => {
  const json = mockEvdsResponse('TP.DK.USD.A', 32.5);
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

test('fetchEvdsSnapshot caches live snapshot for 24h', async () => {
  __resetEvdsCacheForTests();
  let calls = 0;
  const fetchImpl = async (url) => {
    calls += 1;
    const series = new URL(url).searchParams.get('series');
    return {
      ok: true,
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
    const series = new URL(url).searchParams.get('series');
    return {
      ok: true,
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

test('getter helpers expose exchange and policy rates', async () => {
  __resetEvdsCacheForTests();
  const fetchImpl = async (url) => {
    const series = new URL(url).searchParams.get('series');
    return {
      ok: true,
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
