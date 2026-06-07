import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const {
  DECISION_HISTORY_EVENT_TYPES,
  DECISION_HISTORY_EVENT_LABELS,
  isValidHistoryEventType,
  normalizeHistoryEvent,
  normalizeHistoryRecord,
  createHistoryEvent,
  aggregateHistoryRecord,
  buildHistoryTimeline,
  filterHistoryByEventType,
  getRecentlyViewedListings,
  getRecentComparisons,
  getRecentReports,
  appendHistoryEvent,
  buildHistoryTimelineHtml
} = await import('../../js/decision-history/index.js');

const evil = '<img onerror=alert(1)>';

// --- EVENT TYPES ---

test('six event types defined', () => {
  assert.equal(DECISION_HISTORY_EVENT_TYPES.length, 6);
});

for (const type of DECISION_HISTORY_EVENT_TYPES) {
  test(`valid event type: ${type}`, () => {
    assert.equal(isValidHistoryEventType(type), true);
  });
}

test('invalid event type rejected', () => {
  assert.equal(isValidHistoryEventType('invalid'), false);
});

for (const [type, label] of Object.entries(DECISION_HISTORY_EVENT_LABELS)) {
  test(`event label Turkish for ${type}`, () => {
    assert.ok(label.length > 3);
    assert.match(label, /[a-zA-ZğüşıöçĞÜŞİÖÇ]/);
  });
}

// --- NORMALIZE ---

test('normalizeHistoryEvent fills defaults', () => {
  const event = normalizeHistoryEvent({ event_type: 'listing_viewed', listing_id: 'abc' });
  assert.equal(event.event_type, 'listing_viewed');
  assert.equal(event.listing_id, 'abc');
});

test('normalizeHistoryEvent invalid type falls back', () => {
  const event = normalizeHistoryEvent({ event_type: 'bad' });
  assert.equal(event.event_type, 'listing_viewed');
});

test('normalizeHistoryRecord maps fields', () => {
  const rec = normalizeHistoryRecord({ listingId: 'x', eventCount: 3 });
  assert.equal(rec.listing_id, 'x');
  assert.equal(rec.event_count, 3);
});

// --- CREATE ---

test('createHistoryEvent succeeds', () => {
  const evt = createHistoryEvent({ userId: 'u1', listingId: 'l1', eventType: 'compare_opened' });
  assert.equal(evt.event_type, 'compare_opened');
});

test('createHistoryEvent throws on invalid type', () => {
  assert.throws(() => createHistoryEvent({ eventType: 'bad' }), /Geçersiz/);
});

// --- AGGREGATE ---

test('aggregateHistoryRecord counts events', () => {
  const events = [
    normalizeHistoryEvent({ event_type: 'listing_viewed', listing_id: 'a', created_at: '2026-01-02' }),
    normalizeHistoryEvent({ event_type: 'compare_opened', listing_id: 'a', created_at: '2026-01-03' })
  ];
  const rec = aggregateHistoryRecord(events);
  assert.equal(rec.event_count, 2);
  assert.equal(rec.last_event_type, 'compare_opened');
});

// --- TIMELINE ---

test('buildHistoryTimeline sorts descending', () => {
  const events = [
    { event_type: 'listing_viewed', listing_id: 'a', created_at: '2026-01-01' },
    { event_type: 'report_opened', listing_id: 'a', created_at: '2026-01-05' }
  ];
  const timeline = buildHistoryTimeline(events);
  assert.equal(timeline[0].event_type, 'report_opened');
});

test('timeline items have labels', () => {
  const timeline = buildHistoryTimeline([{ event_type: 'scenario_opened', listing_id: 'x' }]);
  assert.equal(timeline[0].label, DECISION_HISTORY_EVENT_LABELS.scenario_opened);
});

// --- FILTERS ---

test('getRecentlyViewedListings filters listing_viewed', () => {
  const records = [
    { listing_id: 'a', last_event_type: 'listing_viewed', listing_title: 'A' },
    { listing_id: 'b', last_event_type: 'compare_opened', listing_title: 'B' }
  ];
  const recent = getRecentlyViewedListings(records);
  assert.equal(recent.length, 1);
  assert.equal(recent[0].listing_id, 'a');
});

test('getRecentComparisons filters compare_opened', () => {
  const records = [{ listing_id: 'c', last_event_type: 'compare_opened' }];
  assert.equal(getRecentComparisons(records).length, 1);
});

test('getRecentReports filters report_opened', () => {
  const records = [{ listing_id: 'd', last_event_type: 'report_opened' }];
  assert.equal(getRecentReports(records).length, 1);
});

test('filterHistoryByEventType respects limit', () => {
  const records = Array.from({ length: 15 }, (_, i) => ({
    listing_id: `l${i}`,
    last_event_type: 'listing_viewed'
  }));
  assert.equal(filterHistoryByEventType(records, 'listing_viewed', 5).length, 5);
});

// --- APPEND ---

test('appendHistoryEvent adds event and updates record', () => {
  const result = appendHistoryEvent([], {}, { userId: 'u', listingId: 'l', eventType: 'listing_viewed' });
  assert.equal(result.events.length, 1);
  assert.equal(result.record.listing_id, 'l');
});

// --- BUILDER ---

test('timeline html renders Karar Geçmişi', () => {
  assert.match(buildHistoryTimelineHtml({}), /Karar Geçmişi/);
});

test('timeline html shows Son görüntülenen ilanlar', () => {
  assert.match(buildHistoryTimelineHtml({}), /Son görüntülenen ilanlar/);
});

test('timeline html shows Son karşılaştırmalar', () => {
  assert.match(buildHistoryTimelineHtml({}), /Son karşılaştırmalar/);
});

test('timeline html shows Son raporlar', () => {
  assert.match(buildHistoryTimelineHtml({}), /Son raporlar/);
});

test('timeline html shows Zaman çizelgesi', () => {
  assert.match(buildHistoryTimelineHtml({}), /Zaman çizelgesi/);
});

test('timeline html XSS safe', () => {
  const html = buildHistoryTimelineHtml({
    events: [{ event_type: 'listing_viewed', listing_id: evil, created_at: new Date().toISOString() }],
    records: [{ listing_id: 'x', listing_title: evil, last_event_type: 'listing_viewed' }]
  });
  assert.ok(!html.includes('<img onerror'));
});

test('timeline html has role list', () => {
  const html = buildHistoryTimelineHtml({
    events: [{ event_type: 'listing_viewed', listing_id: 'a', created_at: new Date().toISOString() }]
  });
  assert.match(html, /role="list"/);
});

// --- MIGRATION GUARD ---

test('decision_history table in migration', () => {
  const sql = fs.readFileSync('supabase/migrations/20260702_user_decision_platform_v1.sql', 'utf8');
  assert.match(sql, /decision_history/);
  assert.match(sql, /decision_history_events/);
});

// --- PARAMETERIZED ---

for (let i = 0; i < 30; i++) {
  test(`append event iteration ${i}`, () => {
    let events = [];
    let record = {};
    const type = DECISION_HISTORY_EVENT_TYPES[i % DECISION_HISTORY_EVENT_TYPES.length];
    ({ events, record } = appendHistoryEvent(events, record, {
      userId: 'u',
      listingId: `l${i}`,
      eventType: type
    }));
    assert.equal(events.length, 1);
    assert.equal(record.last_event_type, type);
  });
}

for (let count = 1; count <= 15; count++) {
  test(`aggregate ${count} events`, () => {
    const events = Array.from({ length: count }, (_, j) => ({
      event_type: 'listing_viewed',
      listing_id: 'same',
      created_at: `2026-01-${String(j + 1).padStart(2, '0')}`
    }));
    const rec = aggregateHistoryRecord(events);
    assert.equal(rec.event_count, count);
  });
}

for (const type of DECISION_HISTORY_EVENT_TYPES) {
  test(`timeline label for ${type}`, () => {
    const timeline = buildHistoryTimeline([{ event_type: type, listing_id: 'x' }]);
    assert.ok(timeline[0].label);
  });
}

for (let limit = 1; limit <= 10; limit++) {
  test(`recent listings limit ${limit}`, () => {
    const records = Array.from({ length: 20 }, (_, i) => ({
      listing_id: `l${i}`,
      last_event_type: 'listing_viewed'
    }));
    assert.equal(getRecentlyViewedListings(records, limit).length, limit);
  });
}
