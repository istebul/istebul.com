import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const migrationPath = path.join(
  root,
  'supabase/migrations/20260709_garsonai_p4_live_restaurant_layer.sql'
);

const { DEMO_RESTAURANT_ID } = await import('../../js/restoran/admin-management.js');
const OTHER_RESTAURANT_ID = 'b0000000-0000-4000-8000-00000000bistro';

const {
  RestaurantDatabaseError,
  requireRestaurantId,
  getRestaurant,
  updateRestaurant,
  createOrder,
  updateOrderStatus,
  getRestaurantOrders,
  upsertCustomer,
  getCustomerHistory,
  getActiveMenu,
  buildRealtimeChannelName,
  subscribeKitchenOrders,
  subscribeAIInsights,
  listActiveRealtimeChannels,
  unsubscribeRealtimeChannel
} = await import('../../js/restoran/database/index.js');

/**
 * @param {Record<string, { rows?: unknown[], insertRows?: unknown[], upsertRows?: unknown[] }>} tables
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function createMockDatabaseClient(tables) {
  /** @type {Map<string, { channel: unknown, handlers: Array<{ event: string, table: string, filter: string, callback: (payload: unknown) => void }>, statusCallback?: (status: string) => void }>} */
  const channels = new Map();

  return /** @type {import('@supabase/supabase-js').SupabaseClient} */ (
    /** @type {unknown} */ ({
      from(table) {
        const store = tables[table] || { rows: [], insertRows: [], upsertRows: [] };
        const state = {
          filters: /** @type {Array<[string, string]>} */ ([]),
          patch: /** @type {Record<string, unknown>|null} */ (null),
          insertRow: /** @type {Record<string, unknown>|null} */ (null),
          upsertRow: /** @type {Record<string, unknown>|null} */ (null),
          upsertConflict: /** @type {string|null} */ (null),
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
                    const conflictKey = String(state.upsertConflict || '');
                    let existing = null;

                    if (conflictKey.includes('restaurant_id,phone')) {
                      existing = store.rows.find((item) => {
                        const record = /** @type {Record<string, unknown>} */ (item);
                        return (
                          String(record.restaurant_id) === String(state.upsertRow?.restaurant_id) &&
                          String(record.phone ?? '') === String(state.upsertRow?.phone ?? '')
                        );
                      });
                    }

                    const saved = existing
                      ? Object.assign(existing, state.upsertRow)
                      : {
                          id: `upsert-${table}-${store.rows.length + 1}`,
                          ...state.upsertRow
                        };

                    if (!existing) store.rows.push(saved);
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
            if (state.ascending) {
              rows = [...rows].reverse();
            }
            if (state.limit != null) {
              rows = rows.slice(0, state.limit);
            }
            return Promise.resolve({ data: rows, error: null }).then(resolve);
          },
          catch() {
            return query;
          }
        };

        return query;
      },
      channel(name) {
        const channelState = {
          channel: { name },
          handlers: [],
          statusCallback: undefined
        };
        channels.set(name, channelState);

        const channel = {
          on(_eventType, config, callback) {
            channelState.handlers.push({
              event: config.event,
              table: config.table,
              filter: config.filter,
              callback
            });
            return channel;
          },
          subscribe(statusCallback) {
            channelState.statusCallback = statusCallback;
            statusCallback?.('SUBSCRIBED');
            return channel;
          }
        };

        return channel;
      },
      async removeChannel(channel) {
        const name = channel?.name;
        if (name) channels.delete(name);
      },
      __channels: channels
    })
  );
}

test('P4 live restaurant migration defines tables, RLS and tenant helper', () => {
  assert.equal(fs.existsSync(migrationPath), true);
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.customers/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.menu_items/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.orders/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.order_items/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.kitchen_events/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.ai_insights/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.whatsapp_messages/i);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(sql, /garson_current_user_restaurant_ids/i);
  assert.match(sql, /staff/i);
});

test('requireRestaurantId rejects missing tenant id', () => {
  assert.throws(() => requireRestaurantId(''), (error) => error instanceof RestaurantDatabaseError);
});

test('getRestaurant scopes query by restaurant id', async () => {
  const client = createMockDatabaseClient({
    restaurants: {
      rows: [
        {
          id: DEMO_RESTAURANT_ID,
          name: 'Demo Cafe',
          slug: 'demo-cafe',
          status: 'active',
          plan: 'pilot',
          subscription_plan: 'pilot'
        },
        {
          id: OTHER_RESTAURANT_ID,
          name: 'Other Bistro',
          slug: 'other-bistro',
          status: 'active',
          plan: 'starter',
          subscription_plan: 'starter'
        }
      ]
    }
  });

  const restaurant = await getRestaurant({ restaurantId: DEMO_RESTAURANT_ID, client });
  assert.equal(restaurant.id, DEMO_RESTAURANT_ID);
  assert.equal(restaurant.name, 'Demo Cafe');
});

test('createOrder and getRestaurantOrders enforce restaurant isolation', async () => {
  const client = createMockDatabaseClient({
    orders: {
      rows: [
        {
          id: 'order-1',
          restaurant_id: DEMO_RESTAURANT_ID,
          status: 'pending',
          total_amount: 120,
          source: 'panel',
          items: [],
          created_at: '2026-07-09T10:00:00.000Z'
        },
        {
          id: 'order-2',
          restaurant_id: OTHER_RESTAURANT_ID,
          status: 'pending',
          total_amount: 999,
          source: 'whatsapp',
          items: [],
          created_at: '2026-07-09T11:00:00.000Z'
        }
      ],
      insertRows: []
    },
    order_items: { rows: [], insertRows: [] }
  });

  const created = await createOrder({
    restaurantId: DEMO_RESTAURANT_ID,
    client,
    order: {
      status: 'accepted',
      totalAmount: 360,
      source: 'whatsapp',
      customerId: 'c-1'
    },
    items: [{ menuItemId: 'item-1', quantity: 2, unitPrice: 180 }]
  });

  assert.equal(created.restaurantId, DEMO_RESTAURANT_ID);
  assert.equal(created.status, 'accepted');
  assert.equal(created.source, 'whatsapp');

  const orders = await getRestaurantOrders({ restaurantId: DEMO_RESTAURANT_ID, client });
  assert.ok(orders.every((order) => order.restaurantId === DEMO_RESTAURANT_ID));
  assert.equal(orders.some((order) => order.totalAmount === 999), false);
});

test('updateOrderStatus updates only matching restaurant order', async () => {
  const client = createMockDatabaseClient({
    orders: {
      rows: [
        {
          id: 'order-1',
          restaurant_id: DEMO_RESTAURANT_ID,
          status: 'pending',
          total_amount: 120,
          source: 'panel',
          items: [],
          kitchen_status: 'pending',
          created_at: '2026-07-09T10:00:00.000Z'
        }
      ]
    }
  });

  const updated = await updateOrderStatus({
    restaurantId: DEMO_RESTAURANT_ID,
    orderId: 'order-1',
    status: 'preparing',
    client
  });

  assert.equal(updated.status, 'preparing');
  assert.equal(updated.kitchenStatus, 'preparing');
});

test('upsertCustomer stores tenant-scoped customer profile', async () => {
  const client = createMockDatabaseClient({
    customers: { rows: [], upsertRows: [] }
  });

  const customer = await upsertCustomer({
    restaurantId: DEMO_RESTAURANT_ID,
    client,
    customer: {
      name: 'Ahmet Yılmaz',
      phone: '+905551110001',
      totalOrders: 2,
      totalSpent: 780
    }
  });

  assert.equal(customer.restaurantId, DEMO_RESTAURANT_ID);
  assert.equal(customer.name, 'Ahmet Yılmaz');
  assert.equal(customer.totalOrders, 2);
});

test('getCustomerHistory returns customer and scoped orders', async () => {
  const client = createMockDatabaseClient({
    customers: {
      rows: [
        {
          id: 'cust-1',
          restaurant_id: DEMO_RESTAURANT_ID,
          name: 'Ayşe Demir',
          phone: '+905551110002',
          total_orders: 1,
          total_spent: 360
        }
      ]
    },
    orders: {
      rows: [
        {
          id: 'order-10',
          restaurant_id: DEMO_RESTAURANT_ID,
          customer_id: 'cust-1',
          status: 'completed',
          total_amount: 360,
          source: 'panel',
          items: [],
          created_at: '2026-07-09T12:00:00.000Z'
        },
        {
          id: 'order-11',
          restaurant_id: OTHER_RESTAURANT_ID,
          customer_id: 'cust-1',
          status: 'completed',
          total_amount: 999,
          source: 'panel',
          items: [],
          created_at: '2026-07-09T12:30:00.000Z'
        }
      ]
    }
  });

  const history = await getCustomerHistory({
    restaurantId: DEMO_RESTAURANT_ID,
    customerId: 'cust-1',
    client
  });

  assert.equal(history.customer.name, 'Ayşe Demir');
  assert.equal(history.orders.length, 1);
  assert.equal(history.orders[0].totalAmount, 360);
});

test('getActiveMenu returns only active items for restaurant', async () => {
  const client = createMockDatabaseClient({
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
        },
        {
          id: 'item-3',
          restaurant_id: OTHER_RESTAURANT_ID,
          name: 'Başka ürün',
          price: 50,
          category: 'Ana yemekler',
          active: true
        }
      ]
    }
  });

  const menu = await getActiveMenu({ restaurantId: DEMO_RESTAURANT_ID, client });
  assert.equal(menu.length, 1);
  assert.equal(menu[0].name, 'Lahmacun');
});

test('realtime subscriptions create tenant-scoped kitchen and AI channels', async () => {
  const client = createMockDatabaseClient({});

  const kitchen = subscribeKitchenOrders(
    DEMO_RESTAURANT_ID,
    { onStatus: () => {} },
    { client }
  );
  const insights = subscribeAIInsights(
    DEMO_RESTAURANT_ID,
    { onStatus: () => {} },
    { client }
  );

  assert.equal(
    kitchen.channelName,
    buildRealtimeChannelName(DEMO_RESTAURANT_ID, 'kitchen-orders')
  );
  assert.equal(
    insights.channelName,
    buildRealtimeChannelName(DEMO_RESTAURANT_ID, 'ai-insights')
  );
  assert.ok(listActiveRealtimeChannels().includes(kitchen.channelName));
  assert.ok(listActiveRealtimeChannels().includes(insights.channelName));

  await unsubscribeRealtimeChannel(kitchen.channelName);
  await unsubscribeRealtimeChannel(insights.channelName);

  assert.equal(listActiveRealtimeChannels().includes(kitchen.channelName), false);
});

test('updateRestaurant patches tenant restaurant profile', async () => {
  const client = createMockDatabaseClient({
    restaurants: {
      rows: [
        {
          id: DEMO_RESTAURANT_ID,
          name: 'Demo Cafe',
          slug: 'demo-cafe',
          phone: null,
          address: null,
          status: 'active',
          plan: 'pilot',
          subscription_plan: 'pilot'
        }
      ]
    }
  });

  const updated = await updateRestaurant({
    restaurantId: DEMO_RESTAURANT_ID,
    client,
    patch: {
      phone: '+902121112233',
      address: 'Kadıköy, İstanbul',
      subscriptionPlan: 'growth'
    }
  });

  assert.equal(updated.phone, '+902121112233');
  assert.equal(updated.address, 'Kadıköy, İstanbul');
  assert.equal(updated.subscriptionPlan, 'growth');
});
