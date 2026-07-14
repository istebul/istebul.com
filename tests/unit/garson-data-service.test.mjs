import test from 'node:test';
import assert from 'node:assert/strict';

const {
  DEMO_RESTAURANT_ID,
  getMockDemoManagementModel
} = await import('../../js/restoran/admin-management.js');

const { DEMO_RESTAURANT_SLUG } = await import('../../js/restoran/tenant.js');

const {
  GARSON_DATA_MENU_EMPTY_MESSAGE,
  GARSON_DATA_NETWORK_ERROR,
  GARSON_DATA_PERMISSION_ERROR,
  applyRestaurantFilter,
  classifyGarsonDataError,
  getRestaurantMenuData,
  getRestaurantOrderData,
  getRestaurantReservationData,
  isGarsonSupabaseClientAvailable,
  resolveGarsonRestaurantId,
  saveRestaurantMenuItem,
  updateRestaurantOrderStatus
} = await import('../../js/restoran/data-service.js');

const OTHER_RESTAURANT_ID = 'b0000000-0000-4000-8000-00000000bistro';
const SUPABASE_OPTS = { useSupabase: true };

/**
 * @param {Record<string, unknown>} tables
 * @returns {{ from: (table: string) => unknown }}
 */
function createMockSupabaseClient(tables) {
  return {
    from(table) {
      const rows = tables[table] || [];
      const state = {
        filters: /** @type {Array<[string, string]>} */ ([]),
        limit: null
      };

      const query = {
        select() {
          return query;
        },
        eq(column, value) {
          state.filters.push([column, String(value)]);
          return query;
        },
        order() {
          return query;
        },
        update(patch) {
          return {
            eq(column, value) {
              state.filters.push([column, String(value)]);
              return {
                eq(column2, value2) {
                  state.filters.push([column2, String(value2)]);
                  return {
                    select() {
                      return {
                        single: async () => ({ data: { id: String(value) }, error: null }),
                        maybeSingle: async () => ({ data: { id: String(value) }, error: null })
                      };
                    }
                  };
                },
                select() {
                  return {
                    single: async () => ({ data: { id: String(value) }, error: null }),
                    maybeSingle: async () => ({ data: { id: String(value) }, error: null })
                  };
                }
              };
            }
          };
        },
        insert() {
          return {
            select() {
              return {
                single: async () => ({ data: { id: 'new-item' }, error: null })
              };
            }
          };
        },
        single: async () => {
          const match = filterRows(rows, state.filters)[0] || null;
          return { data: match, error: null };
        },
        maybeSingle: async () => {
          const match = filterRows(rows, state.filters)[0] || null;
          return { data: match, error: null };
        },
        then(resolve) {
          const data = filterRows(rows, state.filters);
          return Promise.resolve({ data, error: null }).then(resolve);
        },
        catch() {
          return query;
        }
      };

      return query;
    }
  };
}

/**
 * @param {unknown[]} rows
 * @param {Array<[string, string]>} filters
 * @returns {unknown[]}
 */
function filterRows(rows, filters) {
  return rows.filter((row) => {
    const record = /** @type {Record<string, unknown>} */ (row);
    return filters.every(([column, value]) => String(record[column] ?? '') === value);
  });
}

test('resolveGarsonRestaurantId defaults to demo restaurant id', () => {
  assert.equal(resolveGarsonRestaurantId(), DEMO_RESTAURANT_ID);
  assert.equal(resolveGarsonRestaurantId('custom-id'), 'custom-id');
});

test('classifyGarsonDataError distinguishes permission and network failures', () => {
  assert.equal(classifyGarsonDataError({ code: '42501', message: 'permission denied' }), 'permission');
  assert.equal(classifyGarsonDataError({ message: 'JWT expired' }), 'permission');
  assert.equal(classifyGarsonDataError({ message: 'fetch failed' }), 'network');
  assert.equal(classifyGarsonDataError(new TypeError('Failed to fetch')), 'network');
});

test('getRestaurantMenuData falls back to mock when Supabase client is unavailable', async () => {
  const result = await getRestaurantMenuData({ client: null, useSupabase: false });

  assert.equal(result.source, 'mock');
  assert.equal(result.error, null);
  assert.equal(result.data.restaurantId, DEMO_RESTAURANT_ID);
  assert.ok(result.data.categories.length >= 2);
});

test('getRestaurantMenuData returns empty-menu message without querying products', async () => {
  const queried = [];
  const client = createMockSupabaseClient({
    menu_categories: [],
    menu_items: [],
    restaurants: [{ id: DEMO_RESTAURANT_ID, name: 'Demo Cafe', slug: DEMO_RESTAURANT_SLUG }]
  });
  const originalFrom = client.from.bind(client);
  client.from = (table) => {
    queried.push(table);
    return originalFrom(table);
  };

  const result = await getRestaurantMenuData({
    restaurantId: DEMO_RESTAURANT_ID,
    client,
    ...SUPABASE_OPTS
  });

  assert.equal(result.source, 'supabase');
  assert.equal(result.isEmpty, true);
  assert.equal(result.error, GARSON_DATA_MENU_EMPTY_MESSAGE);
  assert.equal(result.data.categories.length, 0);
  assert.equal(queried.includes('products'), false);
  assert.equal(queried.some((table) => table === 'menu_items' || table === 'menu_categories'), true);
});

test('getRestaurantMenuData maps Supabase menu categories and filters restaurant_id', async () => {
  const client = createMockSupabaseClient({
    menu_categories: [
      {
        id: 'cat-1',
        restaurant_id: DEMO_RESTAURANT_ID,
        name: 'Ana yemekler',
        sort_order: 1,
        menu_items: [
          {
            id: 'item-1',
            restaurant_id: DEMO_RESTAURANT_ID,
            name: 'Levrek',
            price: 420,
            active: true,
            stock_status: 'in_stock'
          },
          {
            id: 'item-other',
            restaurant_id: OTHER_RESTAURANT_ID,
            name: 'Başka restoran ürünü',
            price: 99,
            active: true,
            stock_status: 'in_stock'
          }
        ]
      },
      {
        id: 'cat-other',
        restaurant_id: OTHER_RESTAURANT_ID,
        name: 'Diğer tenant',
        menu_items: []
      }
    ],
    restaurants: [{ id: DEMO_RESTAURANT_ID, name: 'Demo Cafe', slug: DEMO_RESTAURANT_SLUG }]
  });

  const result = await getRestaurantMenuData({
    restaurantId: DEMO_RESTAURANT_ID,
    client,
    ...SUPABASE_OPTS
  });

  assert.equal(result.source, 'supabase');
  assert.equal(result.data.restaurantId, DEMO_RESTAURANT_ID);
  assert.equal(result.data.categories.length, 1);
  assert.equal(result.data.categories[0].name, 'Ana yemekler');
  const item = result.data.categories[0].items[0];
  assert.equal(item.name, 'Levrek');
  assert.equal(item.price, 420);
  assert.equal(item.stockLabel, 'Stokta');
  assert.equal(result.data.categories[0].items.some((row) => row.name === 'Başka restoran ürünü'), false);
});

test('getRestaurantReservationData maps reservations and excludes other tenants', async () => {
  const client = createMockSupabaseClient({
    reservations: [
      {
        id: 'res-1',
        restaurant_id: DEMO_RESTAURANT_ID,
        customer_name: 'Ayşe Yılmaz',
        date: '2026-07-08',
        time: '19:30',
        guest_count: 4,
        status: 'confirmed'
      },
      {
        id: 'res-other',
        restaurant_id: OTHER_RESTAURANT_ID,
        customer_name: 'Başka Restoran Misafiri',
        date: '2026-07-08',
        time: '21:00',
        guest_count: 3,
        status: 'confirmed'
      }
    ]
  });

  const result = await getRestaurantReservationData({
    restaurantId: DEMO_RESTAURANT_ID,
    client,
    ...SUPABASE_OPTS
  });

  assert.equal(result.source, 'supabase');
  assert.equal(result.data.reservations.length, 1);
  const reservation = result.data.reservations[0];
  assert.equal(reservation.customerName, 'Ayşe Yılmaz');
  assert.equal(reservation.date, '2026-07-08');
  assert.equal(reservation.time, '19:30');
  assert.equal(reservation.guestCount, 4);
  assert.equal(reservation.statusLabel, 'Onaylandı');
});

test('getRestaurantOrderData merges orders and preorders with tenant filter', async () => {
  const client = createMockSupabaseClient({
    orders: [
      {
        id: 'po-1',
        restaurant_id: DEMO_RESTAURANT_ID,
        order_no: 'PO-1',
        items: [{ name: 'Kebap', quantity: 2 }],
        total: 720,
        kitchen_status: 'ready'
      }
    ],
    preorders: [
      {
        id: 'po-2',
        restaurant_id: DEMO_RESTAURANT_ID,
        order_no: 'PO-2',
        items: [{ name: 'Levrek', quantity: 1 }],
        total: 420,
        kitchen_status: 'preparing'
      },
      {
        id: 'po-other',
        restaurant_id: OTHER_RESTAURANT_ID,
        order_no: 'PO-900',
        items: [{ name: 'Başka sipariş', quantity: 1 }],
        total: 150,
        kitchen_status: 'submitted'
      }
    ]
  });

  const result = await getRestaurantOrderData({
    restaurantId: DEMO_RESTAURANT_ID,
    slug: DEMO_RESTAURANT_SLUG,
    client,
    ...SUPABASE_OPTS
  });

  assert.equal(result.source, 'supabase');
  assert.equal(result.data.orders.length, 2);
  assert.deepEqual(
    result.data.orders.map((order) => order.orderNo).sort(),
    ['PO-1', 'PO-2']
  );
  assert.equal(result.data.orders[0].kitchenStatusLabel.length > 0, true);
  assert.match(result.data.orders[0].kitchenHref, /businessId=demo-cafe/);
});

test('network errors fall back to demo data with notice', async () => {
  const client = {
    from() {
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        order() {
          return query;
        },
        then(_resolve, reject) {
          return Promise.reject(new TypeError('Failed to fetch')).catch(reject);
        },
        catch(fn) {
          return Promise.reject(new TypeError('Failed to fetch')).catch(fn);
        }
      };
      return query;
    }
  };

  const result = await getRestaurantMenuData({
    restaurantId: DEMO_RESTAURANT_ID,
    client,
    ...SUPABASE_OPTS
  });

  assert.equal(result.source, 'fallback');
  assert.equal(result.error, GARSON_DATA_NETWORK_ERROR);
  assert.equal(result.data.restaurantId, DEMO_RESTAURANT_ID);
});

test('permission errors return user-friendly message and empty state', async () => {
  const permissionError = { code: '42501', message: 'permission denied for table reservations' };
  const client = {
    from() {
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        order() {
          return query;
        },
        then(resolve) {
          return Promise.resolve({ data: null, error: permissionError }).then(resolve);
        },
        catch() {
          return query;
        }
      };
      return query;
    }
  };

  const result = await getRestaurantReservationData({
    restaurantId: DEMO_RESTAURANT_ID,
    client,
    ...SUPABASE_OPTS
  });

  assert.equal(result.source, 'supabase');
  assert.equal(result.error, GARSON_DATA_PERMISSION_ERROR);
  assert.equal(result.isEmpty, true);
  assert.equal(result.data.reservations.length, 0);
});

test('applyRestaurantFilter prevents cross-tenant records', () => {
  const mixed = [
    { id: 'a', restaurant_id: DEMO_RESTAURANT_ID },
    { id: 'b', restaurant_id: OTHER_RESTAURANT_ID }
  ];

  const filtered = applyRestaurantFilter(mixed, DEMO_RESTAURANT_ID);
  assert.deepEqual(filtered.map((row) => row.id), ['a']);
});

test('mock management model remains tenant-safe baseline', () => {
  const model = getMockDemoManagementModel();
  assert.equal(model.menu.categories.every((cat) => cat.restaurantId === DEMO_RESTAURANT_ID), true);
  assert.equal(
    model.reservations.reservations.every((row) => row.restaurantId === DEMO_RESTAURANT_ID),
    true
  );
  assert.equal(model.orders.orders.every((row) => row.restaurantId === DEMO_RESTAURANT_ID), true);
});

test('saveRestaurantMenuItem and updateRestaurantOrderStatus use mock without Supabase', async () => {
  const saveResult = await saveRestaurantMenuItem({
    restaurantId: DEMO_RESTAURANT_ID,
    item: { name: 'Test', price: 10 },
    useSupabase: false
  });
  assert.equal(saveResult.source, 'mock');

  const updateResult = await updateRestaurantOrderStatus({
    restaurantId: DEMO_RESTAURANT_ID,
    orderId: 'po-501',
    status: 'ready',
    slug: DEMO_RESTAURANT_SLUG,
    useSupabase: false
  });
  assert.equal(updateResult.source, 'mock');
});

test('isGarsonSupabaseClientAvailable respects useSupabase override', () => {
  const client = { from: () => ({}) };
  assert.equal(isGarsonSupabaseClientAvailable(null), false);
  assert.equal(isGarsonSupabaseClientAvailable(client, { useSupabase: true }), true);
  assert.equal(isGarsonSupabaseClientAvailable(client, { useSupabase: false }), false);
});
