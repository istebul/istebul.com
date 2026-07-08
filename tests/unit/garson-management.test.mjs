import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

const {
  DEMO_RESTAURANT_ID,
  GARSON_MANAGEMENT_MENU_PATH,
  GARSON_MANAGEMENT_ORDERS_PATH,
  GARSON_MANAGEMENT_RESERVATIONS_PATH,
  filterRestaurantData,
  getMockDemoManagementModel,
  normalizeAdminMenu,
  normalizeAdminOrders,
  normalizeAdminReservations,
  renderManagementMenuHtml,
  renderManagementOrdersHtml
} = await import('../../js/restoran/admin-management.js');

const { DEMO_RESTAURANT_SLUG } = await import('../../js/restoran/tenant.js');

function readPage(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('management routes exist with admin-management script', () => {
  assert.equal(fs.existsSync(path.join(root, 'garson/panel/menu/index.html')), true);
  assert.equal(fs.existsSync(path.join(root, 'garson/panel/rezervasyonlar/index.html')), true);
  assert.equal(fs.existsSync(path.join(root, 'garson/panel/siparisler/index.html')), true);

  const menu = readPage('garson/panel/menu/index.html');
  const reservations = readPage('garson/panel/rezervasyonlar/index.html');
  const orders = readPage('garson/panel/siparisler/index.html');

  assert.match(menu, /admin-management\.js/);
  assert.match(menu, /data-page="menu"/);
  assert.match(reservations, /data-page="reservations"/);
  assert.match(orders, /data-page="orders"/);
});

test('management paths match SaaS panel routes', () => {
  assert.equal(GARSON_MANAGEMENT_MENU_PATH, '/garson/panel/menu/');
  assert.equal(GARSON_MANAGEMENT_RESERVATIONS_PATH, '/garson/panel/rezervasyonlar/');
  assert.equal(GARSON_MANAGEMENT_ORDERS_PATH, '/garson/panel/siparisler/');
});

test('normalizeAdminMenu maps categories products price and stock', () => {
  const menu = normalizeAdminMenu({
    restaurant_id: DEMO_RESTAURANT_ID,
    categories: [
      {
        id: 'cat-1',
        restaurant_id: DEMO_RESTAURANT_ID,
        name: 'Ana yemekler',
        items: [
          {
            id: 'item-1',
            restaurant_id: DEMO_RESTAURANT_ID,
            name: 'Levrek',
            price: 420,
            active: true,
            stock_status: 'low_stock'
          }
        ]
      }
    ]
  });

  assert.equal(menu.restaurantId, DEMO_RESTAURANT_ID);
  assert.equal(menu.categories.length, 1);
  assert.equal(menu.categories[0].name, 'Ana yemekler');
  const item = menu.categories[0].items[0];
  assert.equal(item.name, 'Levrek');
  assert.equal(item.price, 420);
  assert.equal(item.priceLabel, '420 TL');
  assert.equal(item.active, true);
  assert.equal(item.stockStatus, 'low_stock');
  assert.equal(item.stockLabel, 'Az stok');
});

test('normalizeAdminReservations maps customer date time guests and status', () => {
  const result = normalizeAdminReservations({
    restaurant_id: DEMO_RESTAURANT_ID,
    reservations: [
      {
        id: 'res-1',
        restaurant_id: DEMO_RESTAURANT_ID,
        customer_name: 'Ayşe Yılmaz',
        date: '2026-07-08',
        time: '19:30',
        guest_count: 4,
        status: 'confirmed'
      }
    ]
  });

  assert.equal(result.restaurantId, DEMO_RESTAURANT_ID);
  assert.equal(result.reservations.length, 1);
  const reservation = result.reservations[0];
  assert.equal(reservation.customerName, 'Ayşe Yılmaz');
  assert.equal(reservation.date, '2026-07-08');
  assert.equal(reservation.time, '19:30');
  assert.equal(reservation.guestCount, 4);
  assert.equal(reservation.statusLabel, 'Onaylandı');
});

test('normalizeAdminOrders maps order items total and kitchen status', () => {
  const result = normalizeAdminOrders(
    {
      restaurant_id: DEMO_RESTAURANT_ID,
      orders: [
        {
          id: 'po-1',
          restaurant_id: DEMO_RESTAURANT_ID,
          order_no: 'PO-1',
          items: [{ name: 'Kebap', quantity: 2 }],
          total: 720,
          kitchen_status: 'ready'
        }
      ]
    },
    { slug: DEMO_RESTAURANT_SLUG }
  );

  assert.equal(result.restaurantId, DEMO_RESTAURANT_ID);
  assert.equal(result.orders.length, 1);
  const order = result.orders[0];
  assert.equal(order.orderNo, 'PO-1');
  assert.equal(order.items[0].name, 'Kebap');
  assert.equal(order.total, 720);
  assert.equal(order.kitchenStatusLabel, 'Hazır');
  assert.match(order.kitchenHref, /businessId=demo-cafe/);
});

test('filterRestaurantData prevents cross-tenant mixing', () => {
  const mixed = [
    { id: 'a', restaurant_id: DEMO_RESTAURANT_ID, name: 'Demo kayıt' },
    { id: 'b', restaurant_id: 'b0000000-0000-4000-8000-00000000bistro', name: 'Diğer tenant' },
    { restaurantId: DEMO_RESTAURANT_ID, id: 'c', name: 'CamelCase tenant id' }
  ];

  const filtered = filterRestaurantData(mixed, DEMO_RESTAURANT_ID);
  assert.deepEqual(
    filtered.map((row) => row.id),
    ['a', 'c']
  );
});

test('demo management model only includes demo-cafe tenant records', () => {
  const model = getMockDemoManagementModel();

  assert.equal(model.restaurantId, DEMO_RESTAURANT_ID);
  assert.equal(model.slug, DEMO_RESTAURANT_SLUG);
  assert.equal(model.menu.categories.length, 2);
  assert.equal(model.reservations.reservations.length, 2);
  assert.equal(model.orders.orders.length, 2);

  for (const category of model.menu.categories) {
    assert.equal(category.restaurantId, DEMO_RESTAURANT_ID);
  }
  for (const reservation of model.reservations.reservations) {
    assert.equal(reservation.restaurantId, DEMO_RESTAURANT_ID);
  }
  for (const order of model.orders.orders) {
    assert.equal(order.restaurantId, DEMO_RESTAURANT_ID);
  }
});

test('renderManagementMenuHtml and orders html include management fields', () => {
  const model = getMockDemoManagementModel();
  const menuHtml = renderManagementMenuHtml(model.menu);
  const ordersHtml = renderManagementOrdersHtml(model.orders);

  assert.match(menuHtml, /Ana yemekler/);
  assert.match(menuHtml, /Izgara levrek/);
  assert.match(menuHtml, /Aktif/);
  assert.match(menuHtml, /Pasif/);
  assert.match(menuHtml, /Stokta/);

  assert.match(ordersHtml, /PO-501/);
  assert.match(ordersHtml, /Hazırlanıyor/);
  assert.match(ordersHtml, /Mutfak ekranı/);
  assert.match(ordersHtml, /businessId=demo-cafe/);
});
