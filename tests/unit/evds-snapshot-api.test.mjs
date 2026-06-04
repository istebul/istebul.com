import test from 'node:test';
import assert from 'node:assert/strict';

const { onRequestGet } = await import('../../functions/api/evds-snapshot.js');
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
  assert.match(body.data.debug.seriesCodes.cpiAnnual, /TP\.FG\.J0/);
  assert.equal(typeof body.data.rates.cpiAnnual, 'number');
  assert.ok(body.data.seriesDates.cpiAnnual);
  assert.equal(body.meta.errorCount, 0);
});
