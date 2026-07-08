import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

const {
  ADMIN_STAT_CARD_IDS,
  GARSON_ADMIN_LOGIN_PATH,
  GARSON_ADMIN_PANEL_PATH,
  buildDemoAdminDashboardModel,
  normalizeAdminNavigation,
  normalizeAdminRestaurant,
  normalizeAdminStats,
  renderAdminStatCardsHtml
} = await import('../../js/restoran/admin-portal.js');

const { DEMO_RESTAURANT_SLUG } = await import('../../js/restoran/tenant.js');

function readPage(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('garson login route exists with email and password fields', () => {
  assert.equal(fs.existsSync(path.join(root, 'garson/giris/index.html')), true);
  const html = readPage('garson/giris/index.html');
  assert.match(html, /admin-portal\.js/);
  assert.match(html, /type="email"/i);
  assert.match(html, /type="password"/i);
  assert.match(html, /Giriş yap/);
  assert.match(html, /Demo giriş/);
});

test('garson admin panel route exists with dashboard shell', () => {
  assert.equal(fs.existsSync(path.join(root, 'garson/panel/index.html')), true);
  const html = readPage('garson/panel/index.html');
  assert.match(html, /garson-admin-stats/);
  assert.match(html, /garson-admin-sections/);
  assert.match(html, /admin-portal\.js/);
});

test('admin portal paths match SaaS routes', () => {
  assert.equal(GARSON_ADMIN_LOGIN_PATH, '/garson/giris/');
  assert.equal(GARSON_ADMIN_PANEL_PATH, '/garson/panel/');
});

test('normalizeAdminRestaurant uses tenant normalizer and restaurant_id', () => {
  const restaurant = normalizeAdminRestaurant({
    id: 'a0000000-0000-4000-8000-00000000cafe',
    name: 'Demo Cafe',
    slug: DEMO_RESTAURANT_SLUG,
    status: 'active',
    plan: 'pilot'
  });

  assert.equal(restaurant.restaurantId, 'a0000000-0000-4000-8000-00000000cafe');
  assert.equal(restaurant.slug, 'demo-cafe');
  assert.equal(restaurant.statusLabel, 'Aktif');
  assert.equal(restaurant.planLabel, 'Pilot');
});

test('normalizeAdminStats maps dashboard counters', () => {
  const stats = normalizeAdminStats({
    today_reservations: 8,
    active_preorders: 3,
    kitchen_queue_count: 2,
    kitchen_status: 'preparing'
  }, {
    planLabel: 'Pilot',
    restaurantStatusLabel: 'Aktif'
  });

  assert.equal(stats.todayReservations, 8);
  assert.equal(stats.activePreorders, 3);
  assert.equal(stats.kitchenQueueCount, 2);
  assert.equal(stats.kitchenStatusLabel, 'Hazırlanıyor');
  assert.equal(stats.planLabel, 'Pilot');
});

test('normalizeAdminNavigation links kitchen screen with tenant slug', () => {
  const navigation = normalizeAdminNavigation({
    restaurant: { slug: 'demo-cafe' }
  });

  assert.equal(navigation.length, 6);
  const kitchen = navigation.find((item) => item.id === 'kitchen');
  assert.ok(kitchen);
  assert.match(kitchen.href, /\/garson\/mutfak\/\?businessId=demo-cafe/);
  assert.equal(kitchen.external, true);
});

test('renderAdminStatCardsHtml creates all dashboard cards', () => {
  const model = buildDemoAdminDashboardModel();
  const html = renderAdminStatCardsHtml(model.restaurant, model.stats);

  for (const card of ADMIN_STAT_CARD_IDS) {
    assert.match(html, new RegExp(`garson-admin-stat-${card.id}`));
    assert.match(html, new RegExp(card.label));
  }

  assert.match(html, /Restoran durumu/);
  assert.match(html, /Bugünkü rezervasyon/);
  assert.match(html, /Ön siparişler/);
  assert.match(html, /Mutfak durumu/);
  assert.match(html, /Paket bilgisi/);
});

test('demo dashboard model keeps demo-cafe restaurant_id', () => {
  const model = buildDemoAdminDashboardModel();
  assert.equal(model.restaurant.slug, DEMO_RESTAURANT_SLUG);
  assert.equal(model.restaurant.restaurantId, 'a0000000-0000-4000-8000-00000000cafe');
  assert.equal(model.settings.preorderEnabled, true);
  assert.equal(model.navigation.length, 6);
});
