import test from 'node:test';
import assert from 'node:assert/strict';

const { createCart } = await import('../../js/restoran/preorder-cart.js');

test('createCart returns an empty cart', () => {
  const cart = createCart();
  assert.deepEqual(cart.getItems(), []);
  assert.deepEqual(cart.getSummary(), {
    lines: [],
    totalQty: 0,
    lineCount: 0,
    grandTotal: null,
    grandTotalLabel: ''
  });
});

test('addItem adds a new product line', () => {
  const cart = createCart();
  const added = cart.addItem({
    id: 'soup-1',
    name: 'Çorba',
    price: 120,
    currency: 'TRY'
  });

  assert.equal(added, true);
  const items = cart.getItems();
  assert.equal(items.length, 1);
  assert.equal(items[0].id, 'soup-1');
  assert.equal(items[0].name, 'Çorba');
  assert.equal(items[0].qty, 1);
  assert.equal(items[0].priceLabel, '120 TL');
  assert.equal(items[0].lineTotalLabel, '120 TL');
});

test('addItem increases qty for the same product', () => {
  const cart = createCart();
  cart.addItem({ id: 'p1', name: 'Levrek', price: 250 });
  cart.addItem({ id: 'p1', name: 'Levrek', price: 250 });

  const items = cart.getItems();
  assert.equal(items.length, 1);
  assert.equal(items[0].qty, 2);
  assert.equal(items[0].lineTotal, 500);
  assert.equal(items[0].lineTotalLabel, '500 TL');
});

test('increaseQty and decreaseQty update line quantity', () => {
  const cart = createCart();
  cart.addItem({ id: 'p1', name: 'Salata', price: 90 });

  assert.equal(cart.increaseQty('p1'), true);
  assert.equal(cart.getItems()[0].qty, 2);

  assert.equal(cart.decreaseQty('p1'), true);
  assert.equal(cart.getItems()[0].qty, 1);

  assert.equal(cart.decreaseQty('p1'), true);
  assert.deepEqual(cart.getItems(), []);
});

test('removeItem deletes a line', () => {
  const cart = createCart();
  cart.addItem({ id: 'p1', name: 'Tatlı', price: 75 });
  cart.addItem({ id: 'p2', name: 'Kahve', price: 45 });

  assert.equal(cart.removeItem('p1'), true);
  assert.equal(cart.getItems().length, 1);
  assert.equal(cart.getItems()[0].id, 'p2');
  assert.equal(cart.removeItem('missing'), false);
});

test('updateItemNote stores product note', () => {
  const cart = createCart();
  cart.addItem({ id: 'p1', name: 'Biftek', price: 420 });

  assert.equal(cart.updateItemNote('p1', 'az pişmiş'), true);
  assert.equal(cart.getItems()[0].note, 'az pişmiş');
  assert.equal(cart.updateItemNote('missing', 'sossuz'), false);
});

test('getSummary returns line totals and grand total', () => {
  const cart = createCart();
  cart.addItem({ id: 'p1', name: 'Çorba', price: 100 });
  cart.addItem({ id: 'p2', name: 'Salata', price: 80 });
  cart.increaseQty('p1');

  const summary = cart.getSummary();
  assert.equal(summary.totalQty, 3);
  assert.equal(summary.lineCount, 2);
  assert.equal(summary.grandTotal, 280);
  assert.equal(summary.grandTotalLabel, '280 TL');
  assert.equal(summary.lines[0].unitPriceLabel, '100 TL');
  assert.equal(summary.lines[0].lineTotalLabel, '200 TL');
});

test('serialize and deserialize round-trip cart state', () => {
  const cart = createCart();
  cart.addItem({ id: 'p1', name: 'Risotto', price: 220 });
  cart.increaseQty('p1');
  cart.updateItemNote('p1', 'peynirsiz');

  const payload = cart.serialize();
  const restored = createCart();
  assert.equal(restored.deserialize(payload), true);

  const items = restored.getItems();
  assert.equal(items.length, 1);
  assert.equal(items[0].qty, 2);
  assert.equal(items[0].note, 'peynirsiz');
  assert.equal(restored.getSummary().grandTotal, 440);
});

test('deserialize accepts raw items array', () => {
  const cart = createCart();
  assert.equal(
    cart.deserialize([
      { id: 'p1', name: 'Ayran', price: 30, qty: 2, note: 'soğuk' }
    ]),
    true
  );

  assert.equal(cart.getItems()[0].qty, 2);
  assert.equal(cart.getItems()[0].note, 'soğuk');
});

test('clearCart removes all items', () => {
  const cart = createCart();
  cart.addItem({ id: 'p1', name: 'Su', price: 20 });
  cart.clearCart();
  assert.deepEqual(cart.getItems(), []);
  assert.equal(cart.getSummary().lineCount, 0);
});

test('addItem rejects invalid product payload', () => {
  const cart = createCart();
  assert.equal(cart.addItem({ id: '', name: 'X' }), false);
  assert.equal(cart.addItem({ id: 'x', name: '' }), false);
});
