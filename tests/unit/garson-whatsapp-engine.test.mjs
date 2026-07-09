import test from 'node:test';
import assert from 'node:assert/strict';

const {
  WHATSAPP_INTENTS,
  detectIntent
} = await import('../../js/restoran/whatsapp/intent-detector.js');

const { parseWhatsAppMessage } = await import('../../js/restoran/whatsapp/message-parser.js');

const {
  flattenMenuProducts,
  matchProductsToMenu
} = await import('../../js/restoran/whatsapp/product-matcher.js');

const { buildWhatsAppOrder } = await import('../../js/restoran/whatsapp/order-builder.js');

const { processWhatsAppOrderMessage } = await import('../../js/restoran/whatsapp/index.js');

const DEMO_RESTAURANT_ID = 'a0000000-0000-4000-8000-00000000cafe';
const OTHER_RESTAURANT_ID = 'b0000000-0000-4000-8000-00000000bistro';

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
      },
      {
        id: 'item-kebap',
        restaurant_id: DEMO_RESTAURANT_ID,
        name: 'Adana kebap',
        price: 360,
        active: true
      }
    ]
  },
  {
    id: 'cat-drink',
    restaurant_id: DEMO_RESTAURANT_ID,
    name: 'İçecekler',
    items: [
      {
        id: 'item-ayran',
        restaurant_id: DEMO_RESTAURANT_ID,
        name: 'Ayran',
        price: 40,
        active: true
      }
    ]
  },
  {
    id: 'cat-other',
    restaurant_id: OTHER_RESTAURANT_ID,
    name: 'Diğer restoran',
    items: [
      {
        id: 'item-other',
        restaurant_id: OTHER_RESTAURANT_ID,
        name: 'Başka ürün',
        price: 99,
        active: true
      }
    ]
  }
];

test('detectIntent supports all WhatsApp intent types', () => {
  for (const intent of WHATSAPP_INTENTS) {
    assert.ok(typeof intent === 'string');
  }

  assert.equal(detectIntent('2 lahmacun 1 ayran gönder'), 'new_order');
  assert.equal(detectIntent('siparişimi iptal et'), 'cancel_order');
  assert.equal(detectIntent('bu akşam 4 kişilik rezervasyon'), 'reservation');
  assert.equal(detectIntent('menünüzde ne var'), 'menu_question');
  assert.equal(detectIntent('lahmacun fiyatı ne kadar'), 'price_question');
  assert.equal(detectIntent('kaça kadar açıksınız'), 'working_hours_question');
  assert.equal(detectIntent('merhaba'), 'unknown');
});

test('parseWhatsAppMessage extracts quantities names and notes from Turkish order text', () => {
  const parsed = parseWhatsAppMessage('2 lahmacun biri acısız 1 ayran gönder', {
    intent: 'new_order'
  });

  assert.equal(parsed.intent, 'new_order');
  assert.deepEqual(parsed.items, [
    {
      name: 'lahmacun',
      quantity: 2,
      note: 'biri acısız'
    },
    {
      name: 'ayran',
      quantity: 1
    }
  ]);
});

test('matchProductsToMenu handles Turkish chars case and minor typos', () => {
  const products = flattenMenuProducts(DEMO_MENU, DEMO_RESTAURANT_ID);

  const lahmacunMatch = matchProductsToMenu(
    [{ name: 'LAHMACUN', quantity: 1 }],
    products,
    { restaurantId: DEMO_RESTAURANT_ID }
  );
  assert.equal(lahmacunMatch[0].matched, true);
  assert.equal(lahmacunMatch[0].menuItemId, 'item-lahmacun');
  assert.equal(lahmacunMatch[0].name, 'Lahmacun');

  const typoMatch = matchProductsToMenu(
    [{ name: 'ayrn', quantity: 1 }],
    products,
    { restaurantId: DEMO_RESTAURANT_ID }
  );
  assert.equal(typoMatch[0].matched, true);
  assert.equal(typoMatch[0].menuItemId, 'item-ayran');

  const turkishMatch = matchProductsToMenu(
    [{ name: 'lahmacun', quantity: 1 }],
    products,
    { restaurantId: DEMO_RESTAURANT_ID }
  );
  assert.equal(turkishMatch[0].matched, true);
});

test('flattenMenuProducts enforces restaurant_id tenant isolation', () => {
  const products = flattenMenuProducts(DEMO_MENU, DEMO_RESTAURANT_ID);
  assert.equal(products.length, 3);
  assert.equal(products.every((item) => item.restaurantId === DEMO_RESTAURANT_ID), true);
  assert.equal(products.some((item) => item.name === 'Başka ürün'), false);
});

test('buildWhatsAppOrder returns pending whatsapp order for tenant', () => {
  const matched = matchProductsToMenu(
    [
      { name: 'lahmacun', quantity: 2, note: 'biri acısız' },
      { name: 'ayran', quantity: 1 }
    ],
    flattenMenuProducts(DEMO_MENU, DEMO_RESTAURANT_ID),
    { restaurantId: DEMO_RESTAURANT_ID }
  );

  const order = buildWhatsAppOrder({
    restaurantId: DEMO_RESTAURANT_ID,
    customer: { phone: '+905551112233', name: 'Ayşe' },
    matchedItems: matched
  });

  assert.equal(order.restaurantId, DEMO_RESTAURANT_ID);
  assert.equal(order.status, 'pending');
  assert.equal(order.source, 'whatsapp');
  assert.equal(order.customer.phone, '+905551112233');
  assert.equal(order.items.length, 2);
  assert.equal(order.items[0].quantity, 2);
  assert.equal(order.items[0].note, 'biri acısız');
  assert.equal(order.items[0].menuItemId, 'item-lahmacun');
  assert.ok(order.total > 0);
});

test('buildWhatsAppOrder rejects cross-tenant menu matches', () => {
  assert.throws(
    () =>
      buildWhatsAppOrder({
        restaurantId: DEMO_RESTAURANT_ID,
        customer: { phone: '+905551112233' },
        matchedItems: [
          {
            matched: true,
            menuItemId: 'item-other',
            name: 'Başka ürün',
            quantity: 1,
            price: 99,
            restaurantId: OTHER_RESTAURANT_ID
          }
        ]
      }),
    /tenant/i
  );
});

test('processWhatsAppOrderMessage runs full pipeline for new order messages', () => {
  const result = processWhatsAppOrderMessage({
    message: '2 lahmacun biri acısız 1 ayran gönder',
    restaurantId: DEMO_RESTAURANT_ID,
    menu: DEMO_MENU,
    customer: { phone: '+905551112233', name: 'Mehmet' }
  });

  assert.equal(result.intent, 'new_order');
  assert.equal(result.parsed.items.length, 2);
  assert.equal(result.order?.restaurantId, DEMO_RESTAURANT_ID);
  assert.equal(result.order?.source, 'whatsapp');
  assert.equal(result.order?.items.length, 2);
  assert.equal(result.unmatchedItems.length, 0);
});

test('processWhatsAppOrderMessage returns no order for non-order intents', () => {
  const result = processWhatsAppOrderMessage({
    message: 'menünüzde ne var',
    restaurantId: DEMO_RESTAURANT_ID,
    menu: DEMO_MENU,
    customer: { phone: '+905551112233' }
  });

  assert.equal(result.intent, 'menu_question');
  assert.equal(result.order, null);
});

test('processWhatsAppOrderMessage reports unmatched products', () => {
  const result = processWhatsAppOrderMessage({
    message: '1 pizza gönder',
    restaurantId: DEMO_RESTAURANT_ID,
    menu: DEMO_MENU,
    customer: { phone: '+905551112233' }
  });

  assert.equal(result.intent, 'new_order');
  assert.equal(result.order, null);
  assert.equal(result.unmatchedItems.length, 1);
  assert.equal(result.unmatchedItems[0].name, 'pizza');
});
