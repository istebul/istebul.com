import test from 'node:test';
import assert from 'node:assert/strict';

const { DEMO_RESTAURANT_ID } = await import('../../js/restoran/admin-management.js');
const OTHER_RESTAURANT_ID = 'b0000000-0000-4000-8000-00000000bistro';

const {
  verifyWebhookChallenge,
  processWebhook,
  resolveRestaurantIdFromWebhook,
  routeWhatsAppMessage,
  persistProductionOrder,
  syncWhatsAppCustomer,
  generateOrderStatusReply,
  generateProductionReply,
  processProductionWhatsAppMessage,
  WhatsAppWebhookError
} = await import('../../js/restoran/whatsapp-production/index.js');

const SUPABASE_OPTS = { useSupabase: true };

const DEMO_MENU = [
  {
    id: 'cat-main',
    restaurant_id: DEMO_RESTAURANT_ID,
    name: 'Ana yemekler',
    items: [
      {
        id: 'item-lahmacun',
        restaurant_id: DEMO_RESTAURANT_ID,
        name: 'Lahmacun',
        price: 120,
        active: true
      }
    ]
  }
];

/**
 * @param {Record<string, { rows?: unknown[], insertRows?: unknown[], upsertRows?: unknown[] }>} tables
 */
function createMockClient(tables) {
  return {
    from(table) {
      const store = tables[table] || { rows: [], insertRows: [], upsertRows: [] };
      const state = {
        filters: /** @type {Array<[string, string]>} */ ([]),
        patch: null,
        insertRow: null,
        upsertRow: null,
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
          state.insertRow = row;
          return {
            select() {
              return {
                single: async () => {
                  const created = {
                    id: `new-${table}-${store.rows.length + 1}`,
                    created_at: '2026-07-10T12:00:00.000Z',
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
          state.upsertRow = row;
          return {
            select() {
              return {
                single: async () => {
                  let existing = null;
                  if (options.onConflict?.includes('restaurant_id,phone')) {
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
                        id: `cust-${store.rows.length + 1}`,
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
        maybeSingle: async () => {
          const match = applyFilters(store.rows)[0] || null;
          return { data: match, error: null };
        },
        then(resolve) {
          let rows = applyFilters(store.rows);
          if (state.limit != null) rows = rows.slice(0, state.limit);
          return Promise.resolve({ data: rows, error: null }).then(resolve);
        },
        catch() {
          return query;
        }
      };

      return query;
    }
  };
}

function buildWebhookPayload(restaurantId, phoneNumberId, messageBody) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'entry-1',
        changes: [
          {
            field: 'messages',
            value: {
              metadata: {
                phone_number_id: phoneNumberId,
                restaurant_id: restaurantId
              },
              contacts: [
                {
                  wa_id: '905551110001',
                  profile: { name: 'Ahmet Yılmaz' }
                }
              ],
              messages: [
                {
                  id: 'wamid-1',
                  from: '905551110001',
                  timestamp: '1720000000',
                  type: 'text',
                  text: { body: messageBody }
                }
              ]
            }
          }
        ]
      }
    ]
  };
}

test('verifyWebhookChallenge validates WhatsApp subscription handshake', () => {
  const ok = verifyWebhookChallenge({
    mode: 'subscribe',
    verifyToken: 'garson-secret',
    challenge: '123456',
    expectedToken: 'garson-secret'
  });
  assert.equal(ok.verified, true);
  assert.equal(ok.challenge, '123456');

  const fail = verifyWebhookChallenge({
    mode: 'subscribe',
    verifyToken: 'wrong',
    challenge: '123456',
    expectedToken: 'garson-secret'
  });
  assert.equal(fail.verified, false);
  assert.equal(fail.challenge, null);
});

test('processWebhook resolves restaurantId and routes text messages', () => {
  const payload = buildWebhookPayload(DEMO_RESTAURANT_ID, 'phone-1', '2 lahmacun gönder');
  const messages = processWebhook(payload, {
    restaurantMap: { 'phone-1': DEMO_RESTAURANT_ID }
  });

  assert.equal(messages.length, 1);
  assert.equal(messages[0].restaurantId, DEMO_RESTAURANT_ID);
  assert.equal(messages[0].message.type, 'text');
  assert.equal(messages[0].message.text, '2 lahmacun gönder');
  assert.equal(messages[0].customer.name, 'Ahmet Yılmaz');
});

test('resolveRestaurantIdFromWebhook enforces tenant isolation', () => {
  assert.throws(
    () =>
      resolveRestaurantIdFromWebhook(
        { restaurant_id: OTHER_RESTAURANT_ID, phone_number_id: 'phone-1' },
        { restaurantId: DEMO_RESTAURANT_ID, restaurantMap: { 'phone-1': OTHER_RESTAURANT_ID } }
      ),
    (error) => error instanceof WhatsAppWebhookError
  );
});

test('routeWhatsAppMessage supports button and list reply types', () => {
  const button = routeWhatsAppMessage({
    id: 'm-1',
    from: '905551110001',
    timestamp: '1',
    type: 'interactive',
    interactive: {
      type: 'button_reply',
      button_reply: { id: 'order-again', title: 'Tekrar sipariş' }
    }
  });
  assert.equal(button.type, 'button');
  assert.equal(button.text, 'Tekrar sipariş');

  const list = routeWhatsAppMessage({
    id: 'm-2',
    from: '905551110001',
    timestamp: '1',
    type: 'interactive',
    interactive: {
      type: 'list_reply',
      list_reply: { id: 'item-lahmacun', title: 'Lahmacun' }
    }
  });
  assert.equal(list.type, 'list_reply');
  assert.equal(list.text, 'Lahmacun');
});

test('syncWhatsAppCustomer upserts phone-based tenant customer', async () => {
  const tables = { customers: { rows: [], upsertRows: [] } };
  const client = createMockClient(tables);

  const result = await syncWhatsAppCustomer({
    restaurantId: DEMO_RESTAURANT_ID,
    customer: { phone: '+905551110001', name: 'Ahmet Yılmaz' },
    orderTotal: 240,
    client,
    ...SUPABASE_OPTS
  });

  assert.equal(result.synced, true);
  assert.equal(result.source, 'supabase');
  assert.equal(result.customer?.restaurantId, DEMO_RESTAURANT_ID);
  assert.equal(result.customer?.phone, '+905551110001');
  assert.equal(tables.customers.upsertRows?.length, 1);
});

test('persistProductionOrder saves AI order via repository with tenant guard', async () => {
  const tables = {
    orders: { rows: [], insertRows: [] },
    order_items: { rows: [], insertRows: [] }
  };
  const client = createMockClient(tables);

  const result = await persistProductionOrder(
    {
      restaurantId: DEMO_RESTAURANT_ID,
      status: 'pending',
      source: 'whatsapp',
      total: 240,
      customer: { phone: '+905551110001' },
      items: [{ menuItemId: 'item-lahmacun', name: 'Lahmacun', quantity: 2, unitPrice: 120 }]
    },
    { restaurantId: DEMO_RESTAURANT_ID, customerId: 'cust-1', client, ...SUPABASE_OPTS }
  );

  assert.equal(result.persisted, true);
  assert.equal(result.source, 'supabase');
  assert.equal(result.order?.restaurantId, DEMO_RESTAURANT_ID);
  assert.equal(tables.orders.insertRows?.length, 1);
});

test('generateOrderStatusReply returns Turkish production status messages', () => {
  assert.equal(generateOrderStatusReply('pending'), 'Siparişiniz alındı.');
  assert.equal(generateOrderStatusReply('preparing'), 'Siparişiniz hazırlanıyor.');
  assert.equal(generateOrderStatusReply('ready'), 'Siparişiniz hazır.');
  assert.equal(generateOrderStatusReply('completed'), 'Siparişiniz teslim edildi.');
  assert.match(generateProductionReply({ orderCreated: true, orderStatus: 'pending' }), /alındı/i);
});

test('processProductionWhatsAppMessage runs full live pipeline with mock fallback', async () => {
  const result = await processProductionWhatsAppMessage({
    restaurantId: DEMO_RESTAURANT_ID,
    message: '2 lahmacun gönder',
    menu: DEMO_MENU,
    customer: { phone: '+905551110001', name: 'Ahmet Yılmaz' },
    client: null,
    useSupabase: false,
    persist: true
  });

  assert.equal(result.restaurantId, DEMO_RESTAURANT_ID);
  assert.equal(result.pipeline.intent, 'new_order');
  assert.ok(result.pipeline.order);
  assert.equal(result.persistence.persisted, false);
  assert.equal(result.persistence.source, 'mock');
  assert.match(result.reply, /alındı/i);
});

test('processProductionWhatsAppMessage persists order when Supabase is available', async () => {
  const tables = {
    orders: { rows: [], insertRows: [] },
    order_items: { rows: [], insertRows: [] },
    customers: { rows: [], upsertRows: [] }
  };
  const client = createMockClient(tables);

  const result = await processProductionWhatsAppMessage({
    restaurantId: DEMO_RESTAURANT_ID,
    message: '2 lahmacun gönder',
    menu: DEMO_MENU,
    customer: { phone: '+905551110001', name: 'Ahmet Yılmaz' },
    client,
    useSupabase: true,
    persist: true
  });

  assert.equal(result.persistence.persisted, true);
  assert.equal(result.persistence.source, 'supabase');
  assert.equal(result.customer?.phone, '+905551110001');
  assert.match(result.reply, /Siparişiniz alındı/i);
});
