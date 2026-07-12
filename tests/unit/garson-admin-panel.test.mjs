import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

const { ADMIN_NAV_ITEMS } = await import('../../js/restoran/admin/shared/constants.js');
const { ADMIN_PAGE_MOUNTERS } = await import('../../js/restoran/admin/index.js');
const { loadDashboardMetrics } = await import('../../js/restoran/admin/dashboard/metrics.js');
const { mapOrderToTableRow } = await import('../../js/restoran/admin/siparisler/index.js');
const { renderDataTable } = await import('../../js/restoran/admin/shared/table.js');
const { renderMetricGrid } = await import('../../js/restoran/admin/shared/cards.js');

function readPage(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('admin module tree exists with all P5-D modules', () => {
  const modules = [
    'dashboard/index.js',
    'siparisler/index.js',
    'rezervasyonlar/index.js',
    'musteriler/index.js',
    'menu/index.js',
    'masalar/index.js',
    'mutfak/index.js',
    'whatsapp/index.js',
    'analitik/index.js',
    'bildirimler/index.js',
    'ayarlar/index.js',
    'shared/constants.js',
    'shared/table.js',
    'shared/demo-data.js',
    'bootstrap.js',
    'index.js'
  ];

  for (const file of modules) {
    assert.equal(
      fs.existsSync(path.join(root, 'js/restoran/admin', file)),
      true,
      `missing js/restoran/admin/${file}`
    );
  }
});

test('panel routes use enterprise design system styles', () => {
  const panel = readPage('garson/panel/index.html');
  assert.match(panel, /garsonai-design-system-v1\.css/);
  assert.match(panel, /garsonai-admin-v1\.css/);
  assert.match(panel, /garsonai-page/);
  assert.match(panel, /data-admin-nav/);
});

test('all admin panel HTML routes exist', () => {
  const routes = [
    'garson/panel/index.html',
    'garson/panel/siparisler/index.html',
    'garson/panel/rezervasyonlar/index.html',
    'garson/panel/menu/index.html',
    'garson/panel/musteriler/index.html',
    'garson/panel/masalar/index.html',
    'garson/panel/mutfak/index.html',
    'garson/panel/whatsapp/index.html',
    'garson/panel/analitik/index.html',
    'garson/panel/bildirimler/index.html',
    'garson/panel/ayarlar/index.html'
  ];

  for (const route of routes) {
    assert.equal(fs.existsSync(path.join(root, route)), true, `${route} missing`);
  }
});

test('admin navigation includes Turkish module labels', () => {
  const labels = ADMIN_NAV_ITEMS.map((item) => item.label);
  assert.ok(labels.includes('Özet'));
  assert.ok(labels.includes('Siparişler'));
  assert.ok(labels.includes('Rezervasyonlar'));
  assert.ok(labels.includes('Müşteriler'));
  assert.ok(labels.includes('Menü'));
  assert.ok(labels.includes('Masalar'));
  assert.ok(labels.includes('Mutfak'));
  assert.ok(labels.includes('WhatsApp'));
  assert.ok(labels.includes('Analitik'));
  assert.ok(labels.includes('Bildirimler'));
  assert.ok(labels.includes('Ayarlar'));
});

test('admin page mounters cover all modules', () => {
  assert.equal(typeof ADMIN_PAGE_MOUNTERS.dashboard, 'function');
  assert.equal(typeof ADMIN_PAGE_MOUNTERS.siparisler, 'function');
  assert.equal(typeof ADMIN_PAGE_MOUNTERS.rezervasyonlar, 'function');
  assert.equal(typeof ADMIN_PAGE_MOUNTERS.musteriler, 'function');
  assert.equal(typeof ADMIN_PAGE_MOUNTERS.menu, 'function');
  assert.equal(typeof ADMIN_PAGE_MOUNTERS.masalar, 'function');
  assert.equal(typeof ADMIN_PAGE_MOUNTERS.mutfak, 'function');
  assert.equal(typeof ADMIN_PAGE_MOUNTERS.whatsapp, 'function');
  assert.equal(typeof ADMIN_PAGE_MOUNTERS.analitik, 'function');
  assert.equal(typeof ADMIN_PAGE_MOUNTERS.bildirimler, 'function');
  assert.equal(typeof ADMIN_PAGE_MOUNTERS.ayarlar, 'function');
});

test('dashboard metrics include production KPI cards', async () => {
  const metrics = await loadDashboardMetrics({
    mode: 'demo',
    restaurantId: 'a0000000-0000-4000-8000-00000000cafe',
    slug: 'demo-cafe',
    restaurantName: 'Demo Cafe',
    role: 'owner'
  });

  const labels = metrics.map((card) => card.label);
  assert.ok(labels.includes('Bugünkü Siparişler'));
  assert.ok(labels.includes('Bekleyen Siparişler'));
  assert.ok(labels.includes('Hazırlanan Siparişler'));
  assert.ok(labels.includes('Aktif Rezervasyonlar'));
  assert.ok(labels.includes('Bugünkü Ciro'));
  assert.ok(labels.includes('Ortalama Sepet Tutarı'));
  assert.ok(labels.includes('En Çok Satan Ürünler'));
  assert.ok(labels.includes('Yoğun Saatler'));
  assert.ok(labels.includes('Mutfak Durumu'));
  assert.ok(labels.includes('WhatsApp Durumu'));
  assert.ok(labels.includes('AI Durumu'));
});

test('orders table row mapper preserves Turkish labels', () => {
  const row = mapOrderToTableRow({
    id: 'o-1',
    restaurantId: 'a0000000-0000-4000-8000-00000000cafe',
    orderNo: 'PO-501',
    items: [{ name: 'Izgara levrek', quantity: 2 }],
    total: 940,
    totalLabel: '940 TL',
    kitchenStatus: 'preparing',
    kitchenStatusLabel: 'Hazırlanıyor',
    kitchenHref: '/garson/mutfak/?businessId=demo-cafe',
    raw: {}
  });

  assert.equal(row.orderNo, 'PO-501');
  assert.match(String(row.items), /Izgara levrek/);
  assert.equal(row.status, 'Hazırlanıyor');
});

test('shared table and card renderers output enterprise markup', () => {
  const table = renderDataTable({
    id: 'test-table',
    columns: [{ key: 'name', label: 'Ürün' }],
    rows: [{ id: '1', name: 'Çorba' }]
  });
  assert.match(table, /gai-admin-table/);
  assert.match(table, /Ürün/);

  const cards = renderMetricGrid([
    { id: 'x', label: 'Bugünkü Ciro', value: '₺1.200' }
  ]);
  assert.match(cards, /gai-admin-metric/);
  assert.match(cards, /Bugünkü Ciro/);
});
