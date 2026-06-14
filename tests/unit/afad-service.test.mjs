import test from 'node:test';
import assert from 'node:assert/strict';

const {
  aggregateEarthquakeRisk,
  buildAfadFilterUrl,
  fetchAfadEventsSnapshot,
  fetchAfadRegionalRisk,
  filterEventsByLocation,
  normalizeTurkishText,
  parseAfadEvents,
  __resetAfadCacheForTests
} = await import('../../js/services/afad-service.js');
const { resolveSeismicBaseRisk } = await import('../../js/data/turkey-seismic-zones.js');

const sampleEvents = [
  {
    eventID: '1',
    magnitude: '4.2',
    depth: '10',
    province: 'Balıkesir',
    district: 'Sındırgı',
    location: 'Sındırgı (Balıkesir)',
    date: '2026-05-01T12:00:00'
  },
  {
    eventID: '2',
    magnitude: '2.1',
    depth: '8',
    province: 'Balıkesir',
    district: 'Sındırgı',
    location: 'Sındırgı (Balıkesir)',
    date: '2026-05-02T08:00:00'
  },
  {
    eventID: '3',
    magnitude: '1.5',
    depth: '6',
    province: 'Ankara',
    district: 'Çankaya',
    location: 'Çankaya (Ankara)',
    date: '2026-05-03T08:00:00'
  }
];

test('normalizeTurkishText handles Turkish characters', () => {
  assert.equal(normalizeTurkishText('İstanbul'), 'istanbul');
  assert.equal(normalizeTurkishText('Kadıköy'), 'kadikoy');
});

test('filterEventsByLocation matches province and district', () => {
  const balikesir = filterEventsByLocation(sampleEvents, { province: 'Balıkesir' });
  const sindirgi = filterEventsByLocation(sampleEvents, { province: 'Balıkesir', district: 'Sındırgı' });
  assert.equal(balikesir.length, 2);
  assert.equal(sindirgi.length, 2);
});

test('aggregateEarthquakeRisk computes score, activity and summary', () => {
  const agg = aggregateEarthquakeRisk({
    province: 'Balıkesir',
    district: 'Sındırgı',
    events: sampleEvents
  });

  assert.ok(agg.earthquakeRiskScore >= 55);
  assert.ok(['düşük', 'orta', 'yüksek', 'çok yüksek', 'sakin'].includes(agg.earthquakeActivityLevel));
  assert.match(agg.earthquakeSummary, /AFAD deprem istihbaratı/i);
  assert.equal(agg.eventCount, 2);
  assert.equal(agg.maxMagnitude, 4.2);
});

test('aggregateEarthquakeRisk falls back to seismic base when no events', () => {
  const agg = aggregateEarthquakeRisk({ province: 'İstanbul', district: 'Kadıköy', events: [] });
  assert.equal(agg.eventCount, 0);
  assert.equal(agg.seismicBaseRisk, resolveSeismicBaseRisk('İstanbul'));
  assert.ok(agg.earthquakeRiskScore >= 50);
  assert.equal(agg.earthquakeActivityLevel, 'sakin');
});

test('buildAfadFilterUrl includes date range and limit', () => {
  const url = buildAfadFilterUrl({
    start: '2026-01-01T00:00:00',
    end: '2026-06-01T00:00:00',
    limit: 100
  });
  assert.match(url, /apiv2\/event\/filter/);
  assert.match(url, /start=2026-01-01T00(%3A|:)00(%3A|:)00/);
  assert.match(url, /limit=100/);
});

test('parseAfadEvents accepts array and wrapped payloads', () => {
  assert.equal(parseAfadEvents(sampleEvents).length, 3);
  assert.equal(parseAfadEvents({ data: sampleEvents }).length, 3);
});

test('fetchAfadEventsSnapshot caches successful upstream response', async () => {
  __resetAfadCacheForTests();

  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    async text() {
      return JSON.stringify(sampleEvents);
    }
  });

  const first = await fetchAfadEventsSnapshot({ fetchImpl });
  const second = await fetchAfadEventsSnapshot({ fetchImpl });

  assert.equal(first.source, 'live');
  assert.equal(second.source, 'cache');
  assert.equal(first.eventCount, 3);
});

test('fetchAfadRegionalRisk returns fallback snapshot when upstream unavailable', async () => {
  __resetAfadCacheForTests();

  const fetchImpl = async () => {
    throw new Error('network down');
  };

  const snapshot = await fetchAfadRegionalRisk(
    { province: 'İzmir', district: 'Konak' },
    { fetchImpl }
  );

  assert.equal(snapshot.source, 'fallback');
  assert.ok(snapshot.earthquakeRiskScore >= 40);
  assert.match(snapshot.earthquakeSummary, /AFAD deprem istihbaratı/i);
});
