import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

const {
  GARSON_DEMO_KITCHEN_PATH,
  GARSON_DEMO_RESTAURANT_PATH,
  GARSON_KITCHEN_PATH,
  GARSON_KITCHEN_SCRIPT_PATH,
  GARSON_LANDING_PATH,
  handleGarsonBasvuruSubmit
} = await import('../../js/restoran/garson-launch.js');

const { parseKitchenBusinessId } = await import('../../js/restoran/kds-admin.js');

const {
  getKitchenQueue,
  updateKitchenOrderStatus,
  normalizeKitchenQueue
} = await import('../../js/restoran/restoran-api.js');

function readPage(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('garson landing page exists with hero copy', () => {
  assert.equal(fs.existsSync(path.join(root, 'garson/index.html')), true);
  const html = readPage('garson/index.html');
  assert.match(html, /Restoranınızın yapay zekâ destekli dijital garsonu/);
  assert.match(html, /Demo iste/);
  assert.match(html, /Restoranımı başlat/);
  assert.match(html, /Online rezervasyon/);
  assert.match(html, /Mutfak ekranı/);
  assert.match(html, /WhatsApp entegrasyon hazır altyapısı/);
  assert.match(html, /Müşteri rezervasyon yapar/);
  assert.match(html, /Fiyatlandırma önizlemesi/);
  assert.match(html, /Sık sorulan sorular/);
  assert.match(html, /"@type":"Product"/);
  assert.match(html, /property="og:image"/);
  assert.match(html, /twitter:card/);
  assert.doesNotMatch(html, /kds-admin\.js/);
});

test('homepage keeps GarsonAI nav link without teaser section', () => {
  const html = readPage('index.html');
  assert.match(html, /href="\/garson\/"/);
  assert.match(html, /nav-dropdown-link[^>]*>GarsonAI</);
  assert.doesNotMatch(html, /id="home-garsonai"/);
  assert.doesNotMatch(html, /GarsonAI'yi Keşfet/);
  assert.doesNotMatch(html, /ib-home-garsonai/);
  assert.doesNotMatch(html, /garson\/demo/);
  assert.doesNotMatch(html, /\/restoran\//);
});

test('garson mutfak route exists and keeps KDS script', () => {
  assert.equal(fs.existsSync(path.join(root, 'garson/mutfak/index.html')), true);
  const html = readPage('garson/mutfak/index.html');
  assert.match(html, /GarsonAI Mutfak/);
  assert.match(html, new RegExp(GARSON_KITCHEN_SCRIPT_PATH.replace(/\//g, '\\/')));
  assert.match(html, /kds-admin-board/);
});

test('demo page exposes restaurant and kitchen demo links', () => {
  assert.equal(fs.existsSync(path.join(root, 'garson/demo/index.html')), true);
  const html = readPage('garson/demo/index.html');
  assert.match(html, new RegExp(`href="${GARSON_DEMO_RESTAURANT_PATH}"`));
  assert.match(html, new RegExp(`href="${GARSON_DEMO_KITCHEN_PATH.replace(/[?&]/g, '\\$&')}"`));
});

test('basvuru page includes static application fields', () => {
  assert.equal(fs.existsSync(path.join(root, 'garson/basvuru/index.html')), true);
  const html = readPage('garson/basvuru/index.html');
  assert.match(html, /restoran adı/i);
  assert.match(html, /yetkili kişi/i);
  assert.match(html, /telefon/i);
  assert.match(html, /e-posta/i);
  assert.match(html, /şehir/i);
  assert.match(html, /not/i);
  assert.match(html, /garson-launch\.js/);
});

test('launch constants match expected GarsonAI routes', () => {
  assert.equal(GARSON_LANDING_PATH, '/garson/');
  assert.equal(GARSON_KITCHEN_PATH, '/garson/mutfak/');
  assert.equal(GARSON_DEMO_RESTAURANT_PATH, '/r/demo-cafe');
  assert.equal(GARSON_DEMO_KITCHEN_PATH, '/garson/mutfak/?businessId=demo-cafe');
});

test('parseKitchenBusinessId still reads businessId query for mutfak route', () => {
  assert.equal(parseKitchenBusinessId('?businessId=demo-cafe'), 'demo-cafe');
  assert.equal(parseKitchenBusinessId('?id=demo-cafe'), 'demo-cafe');
});

test('KDS API helpers remain exported after route move', () => {
  assert.equal(typeof getKitchenQueue, 'function');
  assert.equal(typeof updateKitchenOrderStatus, 'function');
  assert.equal(typeof normalizeKitchenQueue, 'function');
});

test('handleGarsonBasvuruSubmit shows success without network', () => {
  const form = {
    reportValidity: () => true,
    reset: () => {}
  };

  let hidden = true;
  let text = '';
  const originalGetElementById = globalThis.document?.getElementById;
  globalThis.document = {
    getElementById: () => ({
      get hidden() {
        return hidden;
      },
      set hidden(value) {
        hidden = value;
      },
      get textContent() {
        return text;
      },
      set textContent(value) {
        text = value;
      }
    })
  };

  try {
    handleGarsonBasvuruSubmit(/** @type {HTMLFormElement} */ (form));
    assert.equal(hidden, false);
    assert.match(text, /Başvurunuz alındı/);
  } finally {
    if (originalGetElementById) {
      globalThis.document = { getElementById: originalGetElementById };
    } else {
      delete globalThis.document;
    }
  }
});
