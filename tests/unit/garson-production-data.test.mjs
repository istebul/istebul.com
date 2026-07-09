import test from 'node:test';
import assert from 'node:assert/strict';

const { DEMO_RESTAURANT_ID } = await import('../../js/restoran/admin-management.js');
const OTHER_RESTAURANT_ID = 'b0000000-0000-4000-8000-00000000bistro';

const {
  getRestaurantOrderData,
  getRestaurantMenuData,
  getRestaurantCustomerData,
  mapRepositoryOrderToAdminRow,
  mapMenuItemsToCategories,
  isGarsonSupabaseClientAvailable
} = await import('../../js/restoran/data-service.js');

const {
  loadProductionDashboardDataset,
  loadRestaurantDashboardLive
} = await import('../../js/restoran/dashboard/ai-dashboard-service.js');

const { persistWhatsAppOrder } = await import('../../js/restoran/whatsapp/index.js');
const { bindKitchenOrderRealtime } = await import('../../js/restoran/kitchen-realtime-bridge.js');
const { buildRealtimeChannelName } = await import('../../js/restoran/database/realtime-service.js');

const SUPABASE_OPTS = { useSupabase: true };

/**
 * @param {Record<string, { rows?: unknown[], insertRows?: unknown[], upsertRows?: unknown[] }>} tables
 */
function createProductionMockClient(tables) {
  /** @type {Map<string, unknown>} */
  const channels = new Map();

  return {
    from(table) {
      const store = tables[table] || { rows: [], insertRows: [], upsertRows: [] };
      const state = {
        filters: /** @type {Array<[string, string]>} */ ([]),
        patch: /** @type {Record<string, unknown>|null} */ (null),
        insertRow: /** @type {Record<string, unknown>|null} */ (null),
        upsertRow: /** @type {Record<string, unknown>|null} */ (null),
        upsertConflict: null,
        limit: null,
        ascending: false
      };

      const applyFilters = (rows) =>
        rows.filter((row) => {
          const record = /** @type {Record<string, unknown>} */ (row);
          return state.filters.every(([column, value]) => {
            if (column === 'active' && value === 'true') return record.active === true;
            return String(record[column] ?? '') === value;
          });
        });

      const query = {
        select() {
          return query;
        },
        eq(column, value) {
          state.filters.push([column, String(value)]);
          return query;
        },
        order(_column, options = {}) {
          state.ascending = options.ascending === true;
          return query;
        },
        limit(value) {
          state.limit = value;
          return query;
        },
        insert(row) {
          state.insertRow = /** @type {Record<string, unknown>} */ (row);
          return {
            select() {
              return {
                single: async () => {
                  const created = {
                    id: `new-${table}-${store.rows.length + 1}`,
                    created_at: '2026-07-09T12:00:00.000Z',
                    ...state.insertRow
                  };
                  store.rows.push(created);
                  store.insertRows?.push(created);
                  return { data: created, error: null };
                }
              };
            }
          };
        },
        upsert(row, options = {}) {
          state.upsertRow = /** @type {Record<string, unknown>} */ (row);
          state.upsertConflict = options.onConflict || null;
          return {
            select() {
              return {
                single: async () => {
                  const saved = {
                    id: `upsert-${table}-${store.rows.length + 1}`,
                    ...state.upsertRow
                  };
                  store.rows.push(saved);
                  store.upsertRows?.push(saved);
                  return { data: saved, error: null };
                }
              };
            }
          };
        },
        update(patch) {
          state.patch = patch;
          return query;
        },
        single: async () => query.maybeSingle(),
        maybeSingle: async () => {
          if (state.patch) {
            const match = applyFilters(store.rows)[0];
            if (!match) return { data: null, error: null };
            Object.assign(match, state.patch);
            return { data: match, error: null };
          }
          const match = applyFilters(store.rows)[0] || null;
          return { data: match, error: null };
        },
        then(resolve) {
          let rows = applyFilters(store.rows);
          if (state.ascending) rows = [...rows].reverse();
          if (state.limit != null) rows = rows.slice(0, state.limit);
          return Promise.resolve({ data: rows, error: null }).then(resolve);
        },
        catch() {
          return query;
        }
      };

      return query;
    },
    channel(name) {
      const channel = {
        on(_eventType, config, callback) {
          channels.set(name, { config, callback });
          return channel;
        },
        subscribe(statusCallback) {
          statusCallback?.('SUBSCRIBED');
          return channel;
        },
        name
      };
      return channel;
    },
    async removeChannel(channel) {
      channels.delete(channel.name);
    },
    __channels: channels
  };
}

test('getRestaurantOrderData uses repository orders with tenant filter', async () => {
  const client = createProductionMockClient({
    orders: {
      rows: [
        {
          id: 'order-1',
          restaurant_id: DEMO_RESTAURANT_ID,
          status: 'pending',
          total_amount: 360,
          source: 'panel',
          items: [{ name: 'Lahmacun', quantity: 2 }],
          kitchen_status: 'pending',
          created_at: '2026-07-09T12:00:00.000Z'
        },
        {
          id: 'order-other',
          restaurant_id: OTHER_RESTAURANT_ID,
          status: 'pending',
          total_amount: 999,
          source: 'whatsapp',
          items: [],
          created_at: '2026-07-09T12:00:00.000Z'
        }
      ]
    }
  });

  const result = await getRestaurantOrderData({
    restaurantId: DEMO_RESTAURANT_ID,
    client,
    ...SUPABASE_OPTS
  });

  assert.equal(result.source, 'supabase');
  assert.equal(result.data.orders.length, 1);
  assert.equal(result.data.orders[0].total, 360);
});

test('getRestaurantMenuData prefers live menu_items repository data', async () => {
  const client = createProductionMockClient({
    menu_items: {
      rows: [
        {
          id: 'item-1',
          restaurant_id: DEMO_RESTAURANT_ID,
          name: 'Lahmacun',
          price: 120,
          category: 'Ana yemekler',
          active: true
        },
        {
          id: 'item-2',
          restaurant_id: DEMO_RESTAURANT_ID,
          name: 'Eski ürün',
          price: 90,
          category: 'Ana yemekler',
          active: false
        }
      ]
    }
  });

  const result = await getRestaurantMenuData({
    restaurantId: DEMO_RESTAURANT_ID,
    client,
    ...SUPABASE_OPTS
  });

  assert.equal(result.source, 'supabase');
  assert.equal(result.data.categories.length, 1);
  assert.equal(result.data.categories[0].items.length, 1);
  assert.equal(result.data.categories[0].items[0].name, 'Lahmacun');
});

test('getRestaurantCustomerData returns tenant-scoped customers', async () => {
  const client = createProductionMockClient({
    customers: {
      rows: [
        {
          id: 'cust-1',
          restaurant_id: DEMO_RESTAURANT_ID,
          name: 'Ahmet',
          phone: '+905551110001',
          total_orders: 2,
          total_spent: 500
        }
      ]
    }
  });

  const result = await getRestaurantCustomerData({
    restaurantId: DEMO_RESTAURANT_ID,
    client,
    ...SUPABASE_OPTS
  });

  assert.equal(result.source, 'supabase');
  assert.equal(result.data.customers.length, 1);
  assert.equal(result.data.customers[0].name, 'Ahmet');
});

test('loadProductionDashboardDataset feeds live orders customers and menu to dashboard', async () => {
  const client = createProductionMockClient({
    orders: {
      rows: [
        {
          id: 'order-1',
          restaurant_id: DEMO_RESTAURANT_ID,
          status: 'completed',
          total_amount: 420,
          source: 'panel',
          items: [{ name: 'Lahmacun', quantity: 2 }],
          created_at: '2026-07-09T12:00:00.000Z'
        }
      ]
    },
    menu_items: {
      rows: [
        {
          id: 'item-1',
          restaurant_id: DEMO_RESTAURANT_ID,
          name: 'Lahmacun',
          price: 120,
          category: 'Ana yemekler',
          active: true
        }
      ]
    },
    customers: {
      rows: [
        {
          id: 'cust-1',
          restaurant_id: DEMO_RESTAURANT_ID,
          name: 'Ayşe',
          phone: '+905551110002',
          total_orders: 1,
          total_spent: 420
        }
      ]
    }
  });

  const dataset = await loadProductionDashboardDataset({
    restaurantId: DEMO_RESTAURANT_ID,
    client,
    useSupabase: true,
    now: new Date('2026-07-09T18:00:00.000Z')
  });

  assert.equal(dataset.source, 'supabase');
  assert.ok(dataset.orders.length >= 1);
  assert.ok(dataset.products.length >= 1);
  assert.equal(dataset.customers.length, 1);

  const dashboard = await loadRestaurantDashboardLive({
    restaurantId: DEMO_RESTAURANT_ID,
    client,
    useSupabase: true,
    now: new Date('2026-07-09T18:00:00.000Z')
  });

  assert.equal(dashboard.restaurantId, DEMO_RESTAURANT_ID);
  assert.ok(dashboard.sales.totalRevenue > 0);
  assert.ok(dashboard.customers.totalCustomers >= 1);
});

test('persistWhatsAppOrder saves order via repository when Supabase is available', async () => {
  const tables = {
    orders: { rows: [], insertRows: [] },
    order_items: { rows: [], insertRows: [] }
  };
  const client = createProductionMockClient(tables);

  const result = await persistWhatsAppOrder(
    {
      restaurantId: DEMO_RESTAURANT_ID,
      status: 'pending',
      source: 'whatsapp',
      total: 240,
      customer: { phone: '+905551110001', name: 'Ali' },
      items: [
        {
          menuItemId: 'item-1',
          name: 'Lahmacun',
          quantity: 2,
          unitPrice: 120
        }
      ]
    },
    { client, useSupabase: true }
  );

  assert.equal(result.persisted, true);
  assert.equal(result.source, 'supabase');
  assert.equal(result.order?.restaurantId, DEMO_RESTAURANT_ID);
  assert.equal(tables.orders.insertRows?.length, 1);
});

test('persistWhatsAppOrder falls back to mock when Supabase is unavailable', async () => {
  const order = {
    restaurantId: DEMO_RESTAURANT_ID,
    status: 'pending',
    source: 'whatsapp',
    total: 120,
    items: []
  };

  const result = await persistWhatsAppOrder(order, { client: null, useSupabase: false });
  assert.equal(result.persisted, false);
  assert.equal(result.source, 'mock');
  assert.equal(result.order, order);
});

test('bindKitchenOrderRealtime creates tenant-scoped kitchen channel', async () => {
  const client = createProductionMockClient({
    restaurants: {
      rows: [
        {
          id: DEMO_RESTAURANT_ID,
          name: 'Demo Cafe',
          slug: 'demo-cafe',
          status: 'active',
          plan: 'pilot'
        }
      ]
    }
  });

  let refreshCount = 0;
  const binding = await bindKitchenOrderRealtime({
    slug: 'demo-cafe',
    client,
    onRefresh: () => {
      refreshCount += 1;
    }
  });

  assert.ok(binding);
  assert.equal(binding?.restaurantId, DEMO_RESTAURANT_ID);
  assert.equal(
    binding?.channelName,
    buildRealtimeChannelName(DEMO_RESTAURANT_ID, 'kitchen-orders')
  );

  await binding?.unsubscribe();
});

test('production data helpers map repository rows for admin models', () => {
  const order = mapRepositoryOrderToAdminRow({
    id: 'order-1',
    restaurantId: DEMO_RESTAURANT_ID,
    orderNo: 'PO-1',
    totalAmount: 360,
    status: 'pending',
    kitchenStatus: 'pending',
    items: [{ name: 'Kebap', quantity: 1 }],
    createdAt: '2026-07-09T12:00:00.000Z'
  });

  assert.equal(order.restaurant_id, DEMO_RESTAURANT_ID);
  assert.equal(order.total_amount, 360);

  const categories = mapMenuItemsToCategories(
    [
      {
        id: 'item-1',
        restaurantId: DEMO_RESTAURANT_ID,
        name: 'Lahmacun',
        price: 120,
        category: 'Ana yemekler',
        active: true
      }
    ],
    DEMO_RESTAURANT_ID
  );

  assert.equal(categories.length, 1);
  assert.equal(
    /** @type {{ items: Array<{ name: string }> }} */ (categories[0]).items[0].name,
    'Lahmacun'
  );
});

test('demo fallback remains when Supabase client is unavailable', async () => {
  assert.equal(isGarsonSupabaseClientAvailable(null, { useSupabase: false }), false);

  const orders = await getRestaurantOrderData({ client: null, useSupabase: false });
  const menu = await getRestaurantMenuData({ client: null, useSupabase: false });
  const customers = await getRestaurantCustomerData({ client: null, useSupabase: false });
  const dataset = await loadProductionDashboardDataset({
    restaurantId: DEMO_RESTAURANT_ID,
    client: null,
    useSupabase: false
  });

  assert.equal(orders.source, 'mock');
  assert.equal(menu.source, 'mock');
  assert.equal(customers.source, 'mock');
  assert.equal(dataset.source, 'mock');
  assert.ok(dataset.orders.length > 0);
});
