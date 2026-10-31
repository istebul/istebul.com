import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');

const businessPages = [
  'business/index.html',
  'business/analizler/index.html',
  'business/raporlar/index.html',
  'business/danisman/index.html',
  'business/bildirimler/index.html',
  'business/ayarlar/index.html',
  'business/veri-merkezi/index.html'
];

test('Business uygulama sayfalarının tamamı noindex olmalı', () => {
  for (const file of businessPages) {
    assert.match(read(file), /<meta name="robots" content="noindex,nofollow">/, file);
  }
});

test('Business ve WarehouseIQ tanıtım sayfaları indekslenebilir ve canonical olmalı', () => {
  const cases = [
    ['business-platform/index.html', 'https://www.istebul.com/business-platform/', '/business/'],
    ['warehouseiq/index.html', 'https://www.istebul.com/warehouseiq/', '/warehouse/']
  ];

  for (const [file, canonical, appPath] of cases) {
    const html = read(file);
    assert.match(html, /<meta name="robots" content="index,follow,max-image-preview:large">/, file);
    assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`), file);
    assert.ok(html.includes(`href="${appPath}"`), `${file}: uygulama bağlantısı eksik`);
    assert.match(html, /<h1\b/, file);
    assert.match(html, /application\/ld\+json/, file);
  }
});

test('Ürün URL sözleşmesi tanıtım sayfalarını hedeflemeli', () => {
  const urls = read('src/platform/constants/platform-url-map.ts');
  assert.match(urls, /business: Object\.freeze\(\{\s*current: '\/business\/',\s*target: '\/business-platform\//);
  assert.match(urls, /warehouseiq: Object\.freeze\(\{\s*current: '\/warehouse\/',\s*target: '\/warehouseiq\//);
});

test('Sitemap yalnızca herkese açık yeni ürün sayfalarını içermeli', () => {
  const site = JSON.parse(read('data/seo/site.json'));
  const urls = site.staticUrls.map((entry) => entry.loc);

  assert.ok(urls.includes('/business-platform/'));
  assert.ok(urls.includes('/warehouseiq/'));
  assert.ok(!urls.includes('/business/'));
  assert.ok(!urls.includes('/warehouse/'));
});

test('Ana sayfa ürün bağlantıları tanıtım sayfalarına gitmeli', () => {
  const html = read('index.html');
  assert.match(html, /href="\/business-platform\//);
  assert.match(html, /href="\/warehouseiq\//);
});

test('Üretim build yeni sayfaları ve CSS dosyasını kopyalamalı', () => {
  const build = read('scripts/production-build.cjs');
  for (const file of [
    'business-platform/index.html',
    'warehouseiq/index.html',
    'css/platform-product-landing.css'
  ]) {
    assert.ok(build.includes(`'${file}'`), `Build listesinde eksik: ${file}`);
  }
});
