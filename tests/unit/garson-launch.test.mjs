import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

const {
  GARSON_BASVURU_SUCCESS_MESSAGE,
  GARSON_DEMO_KITCHEN_PATH,
  GARSON_DEMO_RESTAURANT_PATH,
  GARSON_KITCHEN_PATH,
  GARSON_KITCHEN_SCRIPT_PATH,
  GARSON_LANDING_PATH,
  handleGarsonBasvuruSubmit,
  validateGarsonBasvuruForm
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
  /* PR-552: GarsonAI platform Ürünler menüsünde; karar kategorilerinde değil */
  assert.match(html, /id="nav-platform-list"/);
  const platformStart = html.indexOf('id="nav-platform-list"');
  const categoriesStart = html.indexOf('id="nav-product-list"');
  assert.ok(platformStart > 0 && categoriesStart > platformStart);
  assert.match(html.slice(platformStart, categoriesStart), /GarsonAI/);
  assert.doesNotMatch(html.slice(categoriesStart, html.indexOf('id="nav-more-menu"')), /GarsonAI/);
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
  assert.match(html, /işletme adı/i);
  assert.match(html, /yetkili adı soyadı/i);
  assert.match(html, /telefon/i);
  assert.match(html, /şehir/i);
  assert.match(html, /e-posta/i);
  assert.match(html, /ek not/i);
  assert.match(html, /kvkk_consent/);
  assert.match(html, /href="\/kvkk\.html"/);
  assert.match(html, /otomatik bir sisteme kaydedilmez/i);
  assert.match(html, /[İi]steğe bağlı ek bilgiler/);
  assert.match(html, /garson-launch\.js/);
  // PR-554A: ikincil alanlar zorunlu değil
  assert.doesNotMatch(html, /name="email"[^>]*required/);
  assert.doesNotMatch(html, /name="business_type"[^>]*required/);
  assert.doesNotMatch(html, /name="table_count"[^>]*required/);
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

function makeInput(name, value = '', extras = {}) {
  const el = {
    name,
    value,
    checked: Boolean(extras.checked),
    validity: { valid: extras.valid !== false },
    custom: '',
    setCustomValidity(msg) {
      this.custom = msg || '';
    },
    checkValidity() {
      return this.validity.valid && !this.custom;
    },
    focus() {
      this.focused = true;
    }
  };
  return el;
}

test('validateGarsonBasvuruForm requires core fields and KVKK in Turkish', () => {
  const restaurant = makeInput('restaurant_name', '');
  const contact = makeInput('contact_name', 'Ayşe');
  const phone = makeInput('phone', '0555');
  const city = makeInput('city', 'İstanbul');
  const email = makeInput('email', '');
  const kvkk = makeInput('kvkk_consent', '1', { checked: false });
  const elements = {
    restaurant_name: restaurant,
    contact_name: contact,
    phone,
    city,
    email,
    kvkk_consent: kvkk,
    namedItem(name) {
      return this[name] || null;
    }
  };
  const form = {
    elements,
    querySelectorAll: () => [restaurant, contact, phone, city, email, kvkk],
    reportValidity() {
      return ![restaurant, contact, phone, city, email, kvkk].some((el) => el.custom);
    }
  };

  assert.equal(validateGarsonBasvuruForm(/** @type {HTMLFormElement} */ (form)), false);
  assert.match(restaurant.custom, /işletme/i);

  restaurant.value = 'Demo Cafe';
  assert.equal(validateGarsonBasvuruForm(/** @type {HTMLFormElement} */ (form)), false);
  assert.match(kvkk.custom, /KVKK/i);

  kvkk.checked = true;
  assert.equal(validateGarsonBasvuruForm(/** @type {HTMLFormElement} */ (form)), true);
});

test('handleGarsonBasvuruSubmit shows honest success without network or reset', () => {
  const restaurant = makeInput('restaurant_name', 'Demo Cafe');
  const contact = makeInput('contact_name', 'Ayşe Yılmaz');
  const phone = makeInput('phone', '05551234567');
  const city = makeInput('city', 'İstanbul');
  const email = makeInput('email', '');
  const kvkk = makeInput('kvkk_consent', '1', { checked: true });
  let resetCalled = false;
  const elements = {
    restaurant_name: restaurant,
    contact_name: contact,
    phone,
    city,
    email,
    kvkk_consent: kvkk,
    namedItem(name) {
      return this[name] || null;
    }
  };
  const form = {
    elements,
    querySelectorAll: () => [restaurant, contact, phone, city, email, kvkk],
    reportValidity() {
      return true;
    },
    reset() {
      resetCalled = true;
    }
  };

  let hidden = true;
  let text = '';
  const classList = new Set();
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
      },
      classList: {
        add(name) {
          classList.add(name);
        }
      },
      scrollIntoView() {}
    })
  };

  try {
    const ok = handleGarsonBasvuruSubmit(/** @type {HTMLFormElement} */ (form));
    assert.equal(ok, true);
    assert.equal(hidden, false);
    assert.equal(resetCalled, false);
    assert.match(text, /otomatik bir sisteme kaydedilmez/i);
    assert.match(GARSON_BASVURU_SUCCESS_MESSAGE, /otomatik bir sisteme kaydedilmez/i);
    assert.doesNotMatch(text, /Başvurunuz alındı\. En kısa sürede/);
    assert.ok(classList.has('is-visible'));
  } finally {
    if (originalGetElementById) {
      globalThis.document = { getElementById: originalGetElementById };
    } else {
      delete globalThis.document;
    }
  }
});
