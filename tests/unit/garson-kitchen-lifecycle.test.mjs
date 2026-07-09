import test from 'node:test';
import assert from 'node:assert/strict';

const {
  ORDER_STATUSES,
  canCancelOrderStatus,
  getNextOrderStatuses,
  normalizeOrderStatus,
  validateOrderTransition
} = await import('../../js/restoran/kitchen/order-status.js');

const { buildKitchenQueue } = await import('../../js/restoran/kitchen/kitchen-queue.js');

const { estimatePreparation } = await import('../../js/restoran/kitchen/preparation-engine.js');

const { createCustomerNotification } = await import('../../js/restoran/kitchen/notification-engine.js');

const { processKitchenOrder } = await import('../../js/restoran/kitchen/index.js');

const DEMO_RESTAURANT_ID = 'a0000000-0000-4000-8000-00000000cafe';
const OTHER_RESTAURANT_ID = 'b0000000-0000-4000-8000-00000000bistro';

const BASE_ORDER = {
  id: 'order-1',
  restaurantId: DEMO_RESTAURANT_ID,
  table: 'Masa 4',
  status: 'pending',
  createdAt: '2026-07-09T10:00:00.000Z',
  items: [
    { name: 'Lahmacun', quantity: 2 },
    { name: 'Ayran', quantity: 1 }
  ],
  customer: { phone: '+905551112233', name: 'Ayşe' },
  source: 'whatsapp'
};

test('validateOrderTransition allows lifecycle flow and cancel from any stage', () => {
  assert.deepEqual(ORDER_STATUSES, [
    'pending',
    'accepted',
    'preparing',
    'ready',
    'delivering',
    'completed',
    'cancelled'
  ]);

  assert.equal(validateOrderTransition('pending', 'accepted').ok, true);
  assert.equal(validateOrderTransition('accepted', 'preparing').ok, true);
  assert.equal(validateOrderTransition('preparing', 'ready').ok, true);
  assert.equal(validateOrderTransition('ready', 'delivering').ok, true);
  assert.equal(validateOrderTransition('delivering', 'completed').ok, true);

  assert.equal(validateOrderTransition('pending', 'preparing').ok, false);
  assert.equal(validateOrderTransition('completed', 'ready').ok, false);
  assert.equal(validateOrderTransition('cancelled', 'accepted').ok, false);

  assert.equal(canCancelOrderStatus('preparing'), true);
  assert.equal(validateOrderTransition('ready', 'cancelled').ok, true);
  assert.equal(validateOrderTransition('completed', 'cancelled').ok, false);

  assert.deepEqual(getNextOrderStatuses('accepted'), ['preparing', 'cancelled']);
  assert.equal(normalizeOrderStatus('PREPARING'), 'preparing');
});

test('buildKitchenQueue sorts older orders first and flags large and delayed orders', () => {
  const now = new Date('2026-07-09T10:45:00.000Z');
  const orders = [
    {
      id: 'order-new',
      restaurantId: DEMO_RESTAURANT_ID,
      table: 'Masa 1',
      status: 'accepted',
      createdAt: '2026-07-09T10:35:00.000Z',
      items: [{ name: 'Ayran', quantity: 1 }]
    },
    {
      id: 'order-old',
      restaurantId: DEMO_RESTAURANT_ID,
      table: 'Masa 2',
      status: 'preparing',
      createdAt: '2026-07-09T10:00:00.000Z',
      items: Array.from({ length: 6 }, () => ({ name: 'Lahmacun', quantity: 1 }))
    },
    {
      id: 'order-other-tenant',
      restaurantId: OTHER_RESTAURANT_ID,
      table: 'Masa 99',
      status: 'accepted',
      createdAt: '2026-07-09T09:00:00.000Z',
      items: [{ name: 'Başka ürün', quantity: 1 }]
    }
  ];

  const queue = buildKitchenQueue(orders, {
    restaurantId: DEMO_RESTAURANT_ID,
    now,
    delayThresholdMinutes: 30,
    largeItemThreshold: 5
  });

  assert.equal(queue.length, 2);
  assert.equal(queue[0].orderId, 'order-old');
  assert.equal(queue[1].orderId, 'order-new');
  assert.equal(queue[0].priority, 'overdue');
  assert.equal(queue[0].largeOrder, true);
  assert.equal(queue[0].delayed, true);
  assert.ok(queue[0].waitingMinutes >= 45);
});

test('estimatePreparation returns minutes and complexity for mixed orders', () => {
  const simple = estimatePreparation([{ name: 'Ayran', quantity: 1 }]);
  assert.equal(simple.complexity, 'low');
  assert.ok(simple.estimatedMinutes <= 10);

  const mixed = estimatePreparation([
    { name: 'Pizza', quantity: 1 },
    { name: 'Burger', quantity: 1 },
    { name: 'Ayran', quantity: 1 }
  ]);
  assert.equal(mixed.complexity, 'high');
  assert.ok(mixed.estimatedMinutes >= 20);
});

test('createCustomerNotification returns Turkish status messages', () => {
  const accepted = createCustomerNotification(BASE_ORDER, 'accepted');
  assert.equal(accepted.message, 'Siparişiniz alındı');
  assert.equal(accepted.channel, 'whatsapp');

  const ready = createCustomerNotification(BASE_ORDER, 'ready');
  assert.equal(ready.message, 'Siparişiniz hazır');
});

test('processKitchenOrder validates transition builds queue and notification', () => {
  const result = processKitchenOrder({
    order: BASE_ORDER,
    nextStatus: 'accepted',
    restaurantId: DEMO_RESTAURANT_ID,
    allOrders: [BASE_ORDER],
    now: new Date('2026-07-09T10:05:00.000Z')
  });

  assert.equal(result.ok, true);
  assert.equal(result.order.status, 'accepted');
  assert.equal(result.notification.message, 'Siparişiniz alındı');
  assert.equal(result.preparation.complexity, 'medium');
  assert.equal(result.queue.length, 1);
  assert.equal(result.queue[0].orderId, 'order-1');
});

test('processKitchenOrder rejects invalid transitions and tenant mismatch', () => {
  const invalid = processKitchenOrder({
    order: BASE_ORDER,
    nextStatus: 'ready',
    restaurantId: DEMO_RESTAURANT_ID
  });
  assert.equal(invalid.ok, false);

  const tenantMismatch = processKitchenOrder({
    order: BASE_ORDER,
    nextStatus: 'accepted',
    restaurantId: OTHER_RESTAURANT_ID
  });
  assert.equal(tenantMismatch.ok, false);
  assert.match(tenantMismatch.error || '', /tenant/i);
});
