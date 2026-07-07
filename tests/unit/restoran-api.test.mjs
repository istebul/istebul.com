import test from 'node:test';
import assert from 'node:assert/strict';

const {
  buildReservationUrl,
  buildReservationQuery,
  buildRestaurantDetailUrl,
  buildRestaurantSlotsUrl,
  getRestaurantDetail,
  getRestaurantSlots,
  normalizeGuestCount,
  normalizeRestaurantDetail,
  normalizeRestaurantSlots,
  normalizeSearchResults,
  parseBusinessIdFromLocation,
  parseReservationContext,
  resolveSlotDate
} = await import('../../js/restoran/restoran-api.js');

const ORIGIN = 'https://www.istebul.com';

test('buildReservationUrl encodes businessId', () => {
  const url = buildReservationUrl('cafe/demo+1', {}, ORIGIN);
  assert.equal(url, `${ORIGIN}/r/cafe%2Fdemo%2B1`);
});

test('buildReservationUrl preserves query context', () => {
  const url = buildReservationUrl(
    'abc-123',
    {
      q: 'Beşiktaş',
      food: 'levrek',
      date: '2026-07-08',
      time: '19:30',
      guests: 4
    },
    ORIGIN
  );

  const parsed = new URL(url);
  assert.equal(parsed.pathname, '/r/abc-123');
  assert.equal(parsed.searchParams.get('q'), 'Beşiktaş');
  assert.equal(parsed.searchParams.get('food'), 'levrek');
  assert.equal(parsed.searchParams.get('date'), '2026-07-08');
  assert.equal(parsed.searchParams.get('time'), '19:30');
  assert.equal(parsed.searchParams.get('guests'), '4');
});

test('buildReservationUrl returns safe fallback when businessId is empty', () => {
  const bare = buildReservationUrl('', {}, ORIGIN);
  assert.equal(bare, `${ORIGIN}/r/`);

  const withContext = buildReservationUrl('', { guests: 2, date: '2026-07-08' }, ORIGIN);
  const parsed = new URL(withContext);
  assert.equal(parsed.pathname, '/r/');
  assert.equal(parsed.searchParams.get('guests'), '2');
  assert.equal(parsed.searchParams.get('date'), '2026-07-08');
});

test('buildReservationQuery ignores empty values', () => {
  assert.equal(buildReservationQuery({ q: '', guests: 0 }), '');
  const params = new URLSearchParams(buildReservationQuery({ guests: 2, time: '20:00' }));
  assert.equal(params.get('guests'), '2');
  assert.equal(params.get('time'), '20:00');
});

test('parseBusinessIdFromLocation reads path and query fallbacks', () => {
  assert.equal(parseBusinessIdFromLocation('/r/cafe-42', ''), 'cafe-42');
  assert.equal(parseBusinessIdFromLocation('/r/cafe%2F42', ''), 'cafe/42');
  assert.equal(parseBusinessIdFromLocation('/r/index.html', '?id=cafe-99'), 'cafe-99');
  assert.equal(parseBusinessIdFromLocation('/r/', ''), '');
});

test('parseReservationContext maps search params', () => {
  const context = parseReservationContext(
    '?q=Ni%C5%9Fanta%C5%9F%C4%B1&food=risotto&date=2026-07-08&time=20%3A00&guests=3'
  );
  assert.deepEqual(context, {
    q: 'Nişantaşı',
    food: 'risotto',
    date: '2026-07-08',
    time: '20:00',
    guests: 3
  });
});

test('normalizeSearchResults keeps existing shape', () => {
  const items = normalizeSearchResults({
    restaurants: [
      {
        business_id: 'r1',
        name: 'Deniz Restoran',
        matching_products: [{ name: 'Levrek' }],
        table_availability: { available: true }
      }
    ]
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].businessId, 'r1');
  assert.equal(items[0].name, 'Deniz Restoran');
  assert.deepEqual(items[0].products, ['Levrek']);
  assert.equal(items[0].availability, 'Müsait masa var');
});

test('normalizeRestaurantDetail maps detail payload', () => {
  const detail = normalizeRestaurantDetail({
    restaurant: {
      business_id: 'r2',
      name: 'Sahil',
      address: 'Bebek Cd. 12',
      availability: 3
    }
  });

  assert.deepEqual(detail, {
    businessId: 'r2',
    name: 'Sahil',
    address: 'Bebek Cd. 12',
    availability: '3 masa müsait'
  });
});

test('buildRestaurantDetailUrl encodes restaurant id', () => {
  const url = buildRestaurantDetailUrl('demo/1');
  assert.match(url, /\/public\/restaurants\/demo%2F1$/);
});

test('getRestaurantDetail throws for missing id', async () => {
  await assert.rejects(() => getRestaurantDetail(''), /Restoran kimliği gerekli/);
});

test('getRestaurantDetail throws on non-ok response', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 503
  });

  try {
    await assert.rejects(() => getRestaurantDetail('demo'), /Restoran bilgisi alınamadı \(503\)/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('getRestaurantDetail returns json payload on success', async () => {
  const originalFetch = globalThis.fetch;
  const payload = { restaurant: { id: 'demo', name: 'Demo' } };

  globalThis.fetch = async (url) => {
    assert.match(String(url), /\/public\/restaurants\/demo$/);
    return {
      ok: true,
      async json() {
        return payload;
      }
    };
  };

  try {
    const result = await getRestaurantDetail('demo');
    assert.deepEqual(result, payload);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('normalizeGuestCount falls back for invalid values', () => {
  assert.equal(normalizeGuestCount('4'), 4);
  assert.equal(normalizeGuestCount(0), 2);
  assert.equal(normalizeGuestCount('abc', 3), 3);
});

test('resolveSlotDate uses provided ISO date or today', () => {
  assert.equal(resolveSlotDate('2026-07-10'), '2026-07-10');
  assert.match(resolveSlotDate(''), /^\d{4}-\d{2}-\d{2}$/);
});

test('buildRestaurantSlotsUrl encodes id and query params', () => {
  const url = buildRestaurantSlotsUrl('demo/cafe', { date: '2026-07-10', guestCount: 2 });
  const parsed = new URL(url);

  assert.equal(parsed.pathname, '/public/restaurants/demo%2Fcafe/slots');
  assert.equal(parsed.searchParams.get('date'), '2026-07-10');
  assert.equal(parsed.searchParams.get('guest_count'), '2');
});

test('getRestaurantSlots throws for missing id', async () => {
  await assert.rejects(() => getRestaurantSlots(''), /Restoran kimliği gerekli/);
});

test('getRestaurantSlots throws on non-ok response', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 502
  });

  try {
    await assert.rejects(() => getRestaurantSlots('demo', { date: '2026-07-10', guestCount: 2 }), /Müsait saatler alınamadı \(502\)/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('getRestaurantSlots returns json payload on success', async () => {
  const originalFetch = globalThis.fetch;
  const payload = { slots: [{ id: 's1', time: '19:30', available: true }] };

  globalThis.fetch = async (url) => {
    const parsed = new URL(String(url));
    assert.equal(parsed.pathname, '/public/restaurants/demo/slots');
    assert.equal(parsed.searchParams.get('date'), '2026-07-10');
    assert.equal(parsed.searchParams.get('guest_count'), '2');
    return {
      ok: true,
      async json() {
        return payload;
      }
    };
  };

  try {
    const result = await getRestaurantSlots('demo', { date: '2026-07-10', guestCount: 2 });
    assert.deepEqual(result, payload);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('normalizeRestaurantSlots handles slots object format', () => {
  const slots = normalizeRestaurantSlots({
    slots: [
      { id: 'a', time: '18:00', label: '18:00', available: true, capacity_left: 2 },
      { id: 'b', time: '20:00', available: false }
    ]
  });

  assert.equal(slots.length, 2);
  assert.equal(slots[0].id, 'a');
  assert.equal(slots[0].time, '18:00');
  assert.equal(slots[0].available, true);
  assert.equal(slots[0].capacityLeft, 2);
  assert.equal(slots[1].available, false);
});

test('normalizeRestaurantSlots handles array format', () => {
  const slots = normalizeRestaurantSlots(['19:00', '20:30']);
  assert.deepEqual(
    slots.map((slot) => slot.time),
    ['19:00', '20:30']
  );
  assert.ok(slots.every((slot) => slot.available));
});

test('normalizeRestaurantSlots handles nested data.slots format', () => {
  const slots = normalizeRestaurantSlots({
    data: {
      slots: [{ slot_id: 'x1', start_time: '19:30', is_available: true }]
    }
  });

  assert.equal(slots.length, 1);
  assert.equal(slots[0].id, 'x1');
  assert.equal(slots[0].time, '19:30');
  assert.equal(slots[0].available, true);
});

test('normalizeRestaurantSlots returns empty array for broken payload', () => {
  assert.deepEqual(normalizeRestaurantSlots(null), []);
  assert.deepEqual(normalizeRestaurantSlots({ slots: 'bad' }), []);
  assert.deepEqual(normalizeRestaurantSlots({ data: { slots: null } }), []);
});
