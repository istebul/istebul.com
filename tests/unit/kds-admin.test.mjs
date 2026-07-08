import test from 'node:test';
import assert from 'node:assert/strict';

const {
  formatKitchenEtaMessage,
  getKitchenOrderAction,
  groupKitchenOrdersByColumn,
  mapKitchenOrderColumn,
  parseKitchenBusinessId,
  renderKitchenOrderCardHtml
} = await import('../../js/restoran/kds-admin.js');

const {
  normalizeKitchenQueue,
  normalizeKitchenOrderStatus
} = await import('../../js/restoran/restoran-api.js');

test('normalizeKitchenQueue maps order fields', () => {
  const result = normalizeKitchenQueue({
    orders: [
      {
        id: 'po-1',
        reservation_id: 'res-9',
        customer_name: 'Ayşe Yılmaz',
        table_name: 'Masa 4',
        arrival_time: '19:30',
        status: 'submitted',
        eta_minutes: 25,
        items: [
          { name: 'Izgara levrek', quantity: 2, note: 'Limonlu' },
          { name: 'Salata', qty: 1 }
        ],
        created_at: '2026-07-08T16:00:00Z'
      }
    ]
  });

  assert.equal(result.orders.length, 1);
  const order = result.orders[0];
  assert.equal(order.id, 'po-1');
  assert.equal(order.reservationId, 'res-9');
  assert.equal(order.customerName, 'Ayşe Yılmaz');
  assert.equal(order.tableName, 'Masa 4');
  assert.equal(order.arrivalTime, '19:30');
  assert.equal(order.status, 'submitted');
  assert.equal(order.etaMinutes, 25);
  assert.equal(order.items.length, 2);
  assert.equal(order.items[0].name, 'Izgara levrek');
  assert.equal(order.items[0].quantity, 2);
  assert.equal(order.items[0].note, 'Limonlu');
  assert.equal(order.createdAt, '2026-07-08T16:00:00Z');
});

test('normalizeKitchenQueue returns empty orders for empty response', () => {
  assert.deepEqual(normalizeKitchenQueue(null).orders, []);
  assert.deepEqual(normalizeKitchenQueue({ orders: [] }).orders, []);
  assert.deepEqual(normalizeKitchenQueue({ data: { orders: [] } }).orders, []);
});

test('mapKitchenOrderColumn maps statuses to board columns', () => {
  assert.equal(mapKitchenOrderColumn('submitted'), 'new');
  assert.equal(mapKitchenOrderColumn('scheduled'), 'new');
  assert.equal(mapKitchenOrderColumn('preparing'), 'preparing');
  assert.equal(mapKitchenOrderColumn('ready'), 'ready');
  assert.equal(mapKitchenOrderColumn('served'), null);
  assert.equal(mapKitchenOrderColumn('cancelled'), null);
});

test('normalizeKitchenOrderStatus handles invalid payload values safely', () => {
  assert.equal(normalizeKitchenOrderStatus('weird'), 'submitted');
  assert.equal(normalizeKitchenOrderStatus(''), 'submitted');
  assert.equal(normalizeKitchenOrderStatus('pending'), 'submitted');
  assert.equal(normalizeKitchenQueue({ orders: [{ id: 'po-x', status: 'bogus' }] }).orders[0].status, 'submitted');
  assert.deepEqual(normalizeKitchenQueue({ orders: [null, 'x', { id: '' }] }).orders, []);
});

test('groupKitchenOrdersByColumn groups active kitchen orders', () => {
  const grouped = groupKitchenOrdersByColumn([
    { id: '1', status: 'submitted' },
    { id: '2', status: 'scheduled' },
    { id: '3', status: 'preparing' },
    { id: '4', status: 'ready' },
    { id: '5', status: 'served' }
  ]);

  assert.deepEqual(grouped.new.map((order) => order.id), ['1', '2']);
  assert.deepEqual(grouped.preparing.map((order) => order.id), ['3']);
  assert.deepEqual(grouped.ready.map((order) => order.id), ['4']);
});

test('getKitchenOrderAction returns next kitchen transitions', () => {
  assert.deepEqual(getKitchenOrderAction('submitted'), {
    label: 'Hazırlamaya Başla',
    nextStatus: 'preparing'
  });
  assert.deepEqual(getKitchenOrderAction('preparing'), {
    label: 'Hazır',
    nextStatus: 'ready'
  });
  assert.deepEqual(getKitchenOrderAction('ready'), {
    label: 'Servis Edildi',
    nextStatus: 'served'
  });
  assert.equal(getKitchenOrderAction('served'), null);
});

test('formatKitchenEtaMessage formats eta when available', () => {
  assert.equal(formatKitchenEtaMessage(12), 'ETA: 12 dk');
  assert.equal(formatKitchenEtaMessage(null), '');
});

test('renderKitchenOrderCardHtml includes customer, items and action button', () => {
  const html = renderKitchenOrderCardHtml({
    id: 'po-7',
    reservationId: 'res-1',
    customerName: 'Mehmet',
    tableName: 'Masa 2',
    arrivalTime: '20:00',
    status: 'preparing',
    etaMinutes: 10,
    items: [{ name: 'Çorba', quantity: 1, note: '' }],
    createdAt: '',
    raw: {}
  });

  assert.match(html, /Mehmet/);
  assert.match(html, /Masa 2/);
  assert.match(html, /Çorba/);
  assert.match(html, /ETA: 10 dk/);
  assert.match(html, /data-next-status="ready"/);
});

test('parseKitchenBusinessId reads businessId from query', () => {
  assert.equal(parseKitchenBusinessId('?businessId=cafe-1'), 'cafe-1');
  assert.equal(parseKitchenBusinessId('?id=abc'), 'abc');
  assert.equal(parseKitchenBusinessId(''), '');
});
