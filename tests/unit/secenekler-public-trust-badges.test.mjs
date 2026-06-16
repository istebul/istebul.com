import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { UIManager } from '../../js/ui/ui.js';
import { ListingsUI } from '../../js/ui/listings-ui.js';
import { bindListingVehicleImageFallbacks } from '../../js/ui/listing-gallery-ui.js';
import { escapeHtml } from '../../js/core/security.js';
import {
  formatPublicSourceLabel,
  buildListingTrustStripHtml,
  getListingTrustBadges,
  hasPublicSourceUrl,
  resolvePublicExternalUrl,
  mapListingToVehicleImageInput,
  resolveListingImageTrust,
  getListingImageTrustBadgeLabel,
  resolveListingTrustGatedImageUrl,
  isVehicleListingCategory
} from '../../js/ui/listing-trust-ui.js';

const repoRoot = process.cwd();

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function createListingsUiStub() {
  const ui = Object.create(UIManager.prototype);
  Object.assign(ui, ListingsUI.prototype);
  ui.escapeHtml = (value) => String(value ?? '');
  ui.safeImageUrl = (url) => String(url || '/assets/images/placeholder.svg');
  ui.safeExternalUrl = (url) => String(url || '');
  ui.getListingComparisonSignature = () => 'listing:test:1';
  ui.getCategoryLabel = () => 'Araç';
  ui.getListingLocationLabel = () => 'İstanbul';
  ui.getListingPrimaryActionLabel = () => 'Seçeneği İncele';
  ui.formatPrice = () => '₺0';
  ui.formatDate = () => '—';
  ui.getListingInsightsMarkup = () => '';
  ui.loadIcons = () => {};
  return ui;
}

function renderListingCard(listing) {
  const ui = createListingsUiStub();
  const container = { innerHTML: '' };
  const originalGetElementById = global.document?.getElementById;
  global.document = {
    getElementById: (id) => (id === 'listings-grid' ? container : null)
  };

  try {
    ui.renderListings([listing]);
    return container.innerHTML;
  } finally {
    if (originalGetElementById) {
      global.document.getElementById = originalGetElementById;
    } else {
      delete global.document;
    }
  }
}

async function renderListingDetailHtml(listing) {
  const ui = new UIManager();
  ui.loadIcons = () => {};
  const section = {
    innerHTML: '',
    querySelector: () => null,
    querySelectorAll: () => []
  };
  const originalGetElementById = global.document?.getElementById;

  global.document = {
    getElementById: (id) => (id === 'listing-detail-content' ? section : null)
  };

  try {
    await ui.renderListingDetail(listing, [], null, []);
    return section.innerHTML;
  } finally {
    if (originalGetElementById) {
      global.document.getElementById = originalGetElementById;
    } else {
      delete global.document;
    }
  }
}

test('formatPublicSourceLabel maps known source types to neutral public labels', () => {
  assert.equal(formatPublicSourceLabel('manual_seed'), 'Editoryal katalog');
  assert.equal(formatPublicSourceLabel('manual'), 'Editoryal katalog');
  assert.equal(formatPublicSourceLabel('user_listing'), 'Kullanıcı gönderimi');
  assert.equal(formatPublicSourceLabel('partner_feed'), 'Partner kaynağı');
  assert.equal(formatPublicSourceLabel('partner_api'), 'Partner kaynağı');
  assert.equal(formatPublicSourceLabel(''), 'Kaynak bilgisi sınırlı');
  assert.equal(formatPublicSourceLabel('unknown_source'), 'Kaynak bilgisi sınırlı');
});

test('buildListingTrustStripHtml includes minimum public trust badges', () => {
  const withUrl = buildListingTrustStripHtml({
    source_type: 'user_listing',
    source_url: 'https://example.com/listing/1'
  });
  assert.match(withUrl, /Yayınlanmış seçenek/);
  assert.match(withUrl, /Kaynak: Kullanıcı gönderimi/);
  assert.match(withUrl, /Kaynak bağlantısı var/);
  assert.match(withUrl, /Görsel temsili/);
  assert.doesNotMatch(withUrl, /Doğrulanmış görsel/);
  assert.doesNotMatch(withUrl, /Onaylandı/);

  const withoutUrl = buildListingTrustStripHtml({ source_type: 'csv' });
  assert.match(withoutUrl, /Kaynak: İçe aktarılan kaynak/);
  assert.match(withoutUrl, /Kaynak bağlantısı yok/);
});

test('getListingTrustBadges returns structured badge list', () => {
  const badges = getListingTrustBadges({ source_type: 'partner_feed', external_url: 'https://a.test/x' });
  assert.deepEqual(
    badges.map((badge) => badge.label),
    [
      'Yayınlanmış seçenek',
      'Kaynak: Partner kaynağı',
      'Kaynak bağlantısı var',
      'Görsel temsili'
    ]
  );
});

test('hasPublicSourceUrl accepts source_url or external_url and rejects empty values', () => {
  assert.equal(hasPublicSourceUrl({ source_url: 'https://example.com/x' }), true);
  assert.equal(hasPublicSourceUrl({ external_url: 'https://example.com/x' }), true);
  assert.equal(hasPublicSourceUrl({}), false);
  assert.equal(hasPublicSourceUrl({ source_url: 'not-a-url' }), false);
});

test('listing card renders trust strip and AI uyum disclaimer without external fallback CTA', () => {
  const htmlWithoutSource = renderListingCard({
    id: '1',
    title: 'Kaynaksız seçenek',
    price: 100,
    category: 'arac',
    score: 77,
    source_type: 'manual_seed'
  });

  assert.match(htmlWithoutSource, /listing-trust-strip/);
  assert.match(htmlWithoutSource, /Yayınlanmış seçenek/);
  assert.match(htmlWithoutSource, /Kaynak bağlantısı yok/);
  assert.match(htmlWithoutSource, /Görsel temsili/);
  assert.match(htmlWithoutSource, /AI uyum 77\/100/);
  assert.match(htmlWithoutSource, /veri güveni değil/);
  assert.doesNotMatch(htmlWithoutSource, /external-btn/);
  assert.doesNotMatch(htmlWithoutSource, /sahibinden\.com/);
  assert.doesNotMatch(htmlWithoutSource, /Doğrulanmış görsel/);
  assert.doesNotMatch(htmlWithoutSource, /Onaylandı/);

  const htmlWithSource = renderListingCard({
    id: '2',
    title: 'Kaynaklı seçenek',
    price: 200,
    category: 'arac',
    source_type: 'partner_api',
    source_url: 'https://partner.example/listing/2'
  });

  assert.match(htmlWithSource, /Kaynak bağlantısı var/);
  assert.match(htmlWithSource, /external-btn/);
  assert.match(htmlWithSource, /https:\/\/partner\.example\/listing\/2/);
});

test('listing detail renders trust strip without overclaiming visual trust language', async () => {
  const html = await renderListingDetailHtml({
    id: 'detail-1',
    title: 'Detay seçeneği',
    price: 300,
    category: 'arac',
    score: 65,
    source_type: 'collector',
    description: 'Test açıklama'
  });

  assert.match(html, /listing-trust-strip/);
  assert.match(html, /Kaynak: Toplanan kaynak/);
  assert.match(html, /Kaynak bağlantısı yok/);
  assert.match(html, /Görsel temsili/);
  assert.match(html, /veri güveni değil/);
  assert.doesNotMatch(html, /Doğrulanmış görsel/);
  assert.doesNotMatch(html, /Onaylandı/);
  assert.doesNotMatch(html, /sahibinden\.com/);
});

test('regression guard: trust patch files avoid forbidden public trust phrases', () => {
  const trustUi = readRepoFile('js/ui/listing-trust-ui.js');
  const listingsUi = readRepoFile('js/ui/listings-ui.js');
  const combined = `${trustUi}\n${listingsUi}`;

  assert.doesNotMatch(combined, /Doğrulanmış görsel/);
  assert.doesNotMatch(combined, /Onaylandı/);
  assert.match(combined, /Yayınlanmış seçenek/);
  assert.match(combined, /veri güveni değil/);
});

test('regression guard: listings-ui does not render external CTA without resolvable source URL', () => {
  const listingsUi = readRepoFile('js/ui/listings-ui.js');
  assert.match(listingsUi, /hasPublicSourceUrl\(listing\)/);
  assert.match(listingsUi, /\$\{hasExternalSource \?/);
});

test('resolvePublicExternalUrl resolves listing fields and validated channel URLs', () => {
  assert.equal(resolvePublicExternalUrl({ source_url: 'https://example.com/a' }), 'https://example.com/a');
  assert.equal(resolvePublicExternalUrl({ channels: [{ url: 'https://channel.example/b' }] }), 'https://channel.example/b');
  assert.equal(resolvePublicExternalUrl({ external_url: '' }), null);
  assert.equal(resolvePublicExternalUrl({ channels: [{ url: '' }] }), null);
});

function createUiManagerStub() {
  const ui = new UIManager();
  ui.escapeHtml = (value) => String(value ?? '');
  ui.formatPrice = (value) => `₺${value ?? 0}`;
  ui.safeExternalUrl = (url) => String(url || '');
  ui.loadIcons = () => {};
  ui.getCostBreakdownMarkup = () => '';
  ui.getComparisonGraphMarkup = () => '';
  ui.getListingDetailRowsMarkup = () => '';
  return ui;
}

test('favorites grid hides external CTA without source URL and avoids sahibinden fallback', () => {
  const ui = createUiManagerStub();
  const container = { innerHTML: '' };
  const originalGetElementById = global.document?.getElementById;
  global.document = {
    getElementById: (id) => (id === 'favorites-grid' ? container : null)
  };

  try {
    ui.renderFavorites([
      { id: 'f1', title: 'Kaynaksız favori', price: 100, external_url: '' }
    ]);
    assert.doesNotMatch(container.innerHTML, /sahibinden\.com/);
    assert.doesNotMatch(container.innerHTML, /Seçeneği İncele/);

    ui.renderFavorites([
      { id: 'f2', title: 'Kaynaklı favori', price: 200, source_url: 'https://partner.example/listing/2' }
    ]);
    assert.match(container.innerHTML, /Seçeneği İncele/);
    assert.match(container.innerHTML, /https:\/\/partner\.example\/listing\/2/);
    assert.doesNotMatch(container.innerHTML, /sahibinden\.com/);
  } finally {
    if (originalGetElementById) {
      global.document.getElementById = originalGetElementById;
    } else {
      delete global.document;
    }
  }
});

test('getListingDetailDecisionMarkup omits sahibinden fallback when listing has no source URL', () => {
  const ui = createUiManagerStub();
  const profile = {
    riskLevel: 'Test risk',
    comment: 'Test yorum',
    price: 100,
    periodicCost: 10,
    monthlyPayment: 5,
    totalPayment: 120,
    score: 80,
    categoryId: 'arac'
  };

  const withoutSource = ui.getListingDetailDecisionMarkup(profile, { category: 'arac' });
  assert.doesNotMatch(withoutSource, /sahibinden\.com/);
  assert.doesNotMatch(withoutSource, /Seçeneği doğrula/);
  assert.match(withoutSource, /Krediyi netleştir/);

  const withSource = ui.getListingDetailDecisionMarkup(profile, {
    category: 'arac',
    source_url: 'https://partner.example/listing/3'
  });
  assert.match(withSource, /Seçeneği doğrula/);
  assert.match(withSource, /partner\.example/);
  assert.doesNotMatch(withSource, /sahibinden\.com/);
});

test('getRecommendationActionPlanMarkup skips listing-source step without URL and keeps fixed partner steps', () => {
  const ui = createUiManagerStub();

  const withoutSource = ui.getRecommendationActionPlanMarkup('arac', {});
  assert.doesNotMatch(withoutSource, /sahibinden\.com/);
  assert.doesNotMatch(withoutSource, /Seçeneği doğrula/);
  assert.match(withoutSource, /Krediyi netleştir/);
  assert.match(withoutSource, /hangikredi\.com/);

  const withSource = ui.getRecommendationActionPlanMarkup('arac', {
    source_url: 'https://listing.example/item/4'
  });
  assert.match(withSource, /Seçeneği doğrula/);
  assert.match(withSource, /listing\.example/);
  assert.doesNotMatch(withSource, /sahibinden\.com/);
});

test('regression guard: Faz 2A surfaces avoid sahibinden fallback in CTA hygiene paths', () => {
  const uiJs = readRepoFile('js/ui/ui.js');
  const assistantUi = readRepoFile('js/ui/assistant-ui.js');

  assert.match(uiJs, /renderFavorites[\s\S]*hasPublicSourceUrl\(listing\)/);
  assert.doesNotMatch(uiJs, /listing\.external_url \|\| 'https:\/\/www\.sahibinden\.com\/'/);
  assert.match(assistantUi, /resolvePublicExternalUrl/);
  assert.match(assistantUi, /hasPublicSourceUrl/);
  assert.doesNotMatch(assistantUi, /'https:\/\/www\.sahibinden\.com\/'/);
});

const SAHIBINDEN_FALLBACK = 'https://www.sahibinden.com/';

function createAssistantUrlHygieneStub() {
  const ui = createUiManagerStub();
  ui.safeExternalUrl = (url) => {
    if (!url) return SAHIBINDEN_FALLBACK;
    try {
      const parsed = new URL(String(url));
      if (['http:', 'https:'].includes(parsed.protocol)) return parsed.href;
    } catch {
      return SAHIBINDEN_FALLBACK;
    }
    return SAHIBINDEN_FALLBACK;
  };
  return ui;
}

test('getChannelsMarkup omits sahibinden fallback when channel.url is empty', () => {
  const ui = createAssistantUrlHygieneStub();
  const html = ui.getChannelsMarkup([{ label: 'Sahibinden', url: '' }]);

  assert.doesNotMatch(html, /sahibinden\.com/);
  assert.doesNotMatch(html, /<a\b/);
  assert.match(html, /class="assistant-channel"/);
  assert.match(html, /Sahibinden/);
});

test('getChannelsMarkup omits external link when channel.url is invalid', () => {
  const ui = createAssistantUrlHygieneStub();
  const html = ui.getChannelsMarkup([{ label: 'Geçersiz kanal', url: 'not-a-url' }]);

  assert.doesNotMatch(html, /sahibinden\.com/);
  assert.doesNotMatch(html, /target="_blank"/);
  assert.doesNotMatch(html, /<a\b/);
  assert.match(html, /Geçersiz kanal/);
});

test('getChannelsMarkup renders escaped label and valid https href', () => {
  const ui = createAssistantUrlHygieneStub();
  ui.escapeHtml = escapeHtml;
  const html = ui.getChannelsMarkup([
    { label: '<script>alert(1)</script>', url: 'https://channel.example/listing/9' }
  ]);

  assert.match(html, /href="https:\/\/channel\.example\/listing\/9"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /sahibinden\.com/);
});

test('getSourcePillMarkup omits sahibinden fallback when source.url is invalid', () => {
  const ui = createAssistantUrlHygieneStub();
  const html = ui.getSourcePillMarkup({
    type: 'İlan',
    name: 'Test kaynağı',
    url: 'not-a-url',
    status: 'Aktif'
  });

  assert.doesNotMatch(html, /sahibinden\.com/);
  assert.doesNotMatch(html, /<a\b/);
  assert.match(html, /class="assistant-source-pill"/);
  assert.match(html, /Test kaynağı/);
});

test('getSourcePillMarkup keeps external link for valid source.url', () => {
  const ui = createAssistantUrlHygieneStub();
  const html = ui.getSourcePillMarkup({
    type: 'İlan',
    name: 'Partner kaynağı',
    url: 'https://partner.example/source/2',
    status: 'Aktif'
  });

  assert.match(html, /href="https:\/\/partner\.example\/source\/2"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /Partner kaynağı/);
  assert.doesNotMatch(html, /sahibinden\.com/);
});

test('Faz 2D regression: listing-source action plan and fixed partner links remain unchanged', () => {
  const ui = createAssistantUrlHygieneStub();

  const withoutSource = ui.getRecommendationActionPlanMarkup('arac', {});
  assert.doesNotMatch(withoutSource, /sahibinden\.com/);
  assert.doesNotMatch(withoutSource, /Seçeneği doğrula/);
  assert.match(withoutSource, /Krediyi netleştir/);
  assert.match(withoutSource, /hangikredi\.com/);

  const withSource = ui.getRecommendationActionPlanMarkup('arac', {
    source_url: 'https://listing.example/item/4'
  });
  assert.match(withSource, /Seçeneği doğrula/);
  assert.match(withSource, /listing\.example/);
  assert.doesNotMatch(withSource, /sahibinden\.com/);
});

test('mapListingToVehicleImageInput maps images[0] and listing attributes for araç rows', () => {
  const mapped = mapListingToVehicleImageInput({
    title: '2024 Citroen C4 Max',
    category: 'arac',
    images: ['https://cdn.example/citroen-c4-max.jpg'],
    vehicleBrand: 'Citroen',
    attributes: { model: 'C4', year: 2024, trim: 'Max' }
  });

  assert.equal(mapped.name, '2024 Citroen C4 Max');
  assert.equal(mapped.image_url, 'https://cdn.example/citroen-c4-max.jpg');
  assert.equal(mapped.brand, 'Citroen');
  assert.equal(mapped.model, 'C4');
  assert.equal(mapped.year, '2024');
  assert.equal(mapped.trim, 'Max');
});

test('resolveListingImageTrust returns null for non-vehicle categories', () => {
  assert.equal(resolveListingImageTrust({ category: 'ev', images: ['https://example.com/a.jpg'] }), null);
  assert.equal(isVehicleListingCategory('tatil'), false);
  assert.equal(isVehicleListingCategory('vehicle'), true);
});

test('araç listing with verified external image uses Kaynak görseli badge', () => {
  const listing = {
    category: 'arac',
    title: '2024 Citroen C4 Max',
    images: ['https://cdn.example/citroen-c4-max.jpg']
  };

  const trust = resolveListingImageTrust(listing);
  assert.equal(trust?.showRealImage, true);
  assert.equal(getListingImageTrustBadgeLabel(listing), 'Kaynak görseli');

  const html = buildListingTrustStripHtml(listing);
  assert.match(html, /Kaynak görseli/);
  assert.doesNotMatch(html, /Doğrulanmış görsel/);
  assert.doesNotMatch(html, /Onaylandı/);
});

test('araç listing with catalog SVG in images[] gates card and detail away from catalog SVG', async () => {
  const listing = {
    id: 'svg-1',
    category: 'arac',
    title: '2024 Citroen C4 Max',
    price: 100,
    images: ['/assets/images/auto/peugeot-suv.svg']
  };

  assert.equal(getListingImageTrustBadgeLabel(listing), 'Görsel doğrulanamadı');

  const cardHtml = renderListingCard(listing);
  assert.doesNotMatch(cardHtml, /peugeot-suv\.svg/);
  assert.match(cardHtml, /vehicle-premium-placeholder\.svg/);
  assert.match(cardHtml, /Görsel doğrulanamadı/);

  const detailHtml = await renderListingDetailHtml(listing);
  assert.doesNotMatch(detailHtml, /peugeot-suv\.svg/);
  assert.match(detailHtml, /placeholder\.svg/);
});

test('araç listing without images keeps Görsel temsili badge and placeholder image', () => {
  const listing = {
    id: 'no-img',
    category: 'arac',
    title: '2024 Peugeot 308 Allure',
    price: 100
  };

  assert.equal(getListingImageTrustBadgeLabel(listing), 'Görsel temsili');
  const cardHtml = renderListingCard(listing);
  assert.match(cardHtml, /Görsel temsili/);
  assert.match(cardHtml, /vehicle-premium-placeholder\.svg|placeholder\.svg/);
});

test('non-vehicle listing keeps static Görsel temsili badge and legacy image path', () => {
  const listing = {
    category: 'ev',
    title: 'Kadıköy daire',
    images: ['https://cdn.example/kadikoy.jpg']
  };

  assert.equal(resolveListingTrustGatedImageUrl(listing), null);
  assert.equal(getListingImageTrustBadgeLabel(listing), 'Görsel temsili');

  const html = buildListingTrustStripHtml(listing);
  assert.match(html, /Görsel temsili/);
  assert.doesNotMatch(html, /Kaynak görseli/);
  assert.doesNotMatch(html, /Görsel doğrulanamadı/);
});

function createMockListingImage(initial = {}) {
  const listeners = {};
  return {
    src: initial.src || '',
    alt: initial.alt || '',
    title: initial.title || '',
    dataset: { ...(initial.dataset || {}) },
    parentElement: initial.parentElement || null,
    addEventListener(type, fn) {
      listeners[type] = fn;
    },
    dispatchError() {
      listeners.error?.();
    }
  };
}

function createListingImageRoot(images = {}) {
  const nodes = {
    card: images.card ? createMockListingImage(images.card) : null,
    hero: images.hero ? createMockListingImage(images.hero) : null,
    thumb: images.thumb ? createMockListingImage(images.thumb) : null
  };

  return {
    querySelectorAll(selector) {
      const result = [];
      if (selector.includes('.listing-image') && nodes.card) result.push(nodes.card);
      if (selector.includes('.listing-gallery-hero') && nodes.hero) result.push(nodes.hero);
      if (selector.includes('.listing-gallery-thumb img') && nodes.thumb) result.push(nodes.thumb);
      return result;
    }
  };
}

function stripVersion(url) {
  return String(url || '').replace(/\?v=[^&]+$/, '');
}

test('bindListingVehicleImageFallbacks no-ops for non-vehicle listings', () => {
  const root = createListingImageRoot({
    card: { src: 'https://cdn.example/konut.jpg', alt: 'Konut' }
  });

  bindListingVehicleImageFallbacks(root, {
    category: 'ev',
    title: 'Kadıköy daire',
    images: ['https://cdn.example/konut.jpg']
  });

  assert.equal(root.querySelectorAll('.listing-image')[0]?.dataset.fallbackBound, undefined);
});

test('bindListingVehicleImageFallbacks binds verified external card image runtime error fallback', () => {
  const root = createListingImageRoot({
    card: {
      src: 'https://cdn.example/citroen-c4-max.jpg',
      alt: '2024 Citroen C4 Max',
      className: 'listing-image'
    }
  });

  bindListingVehicleImageFallbacks(root, {
    category: 'arac',
    title: '2024 Citroen C4 Max',
    images: ['https://cdn.example/citroen-c4-max.jpg']
  });

  const img = root.querySelectorAll('.listing-image')[0];
  assert.equal(img.dataset.fallbackBound, '1');
  assert.equal(img.dataset.imageTrust, 'verified_external');

  img.dispatchError();

  assert.match(stripVersion(img.src), /vehicle-premium-placeholder\.svg$/);
  assert.equal(img.alt, 'Görsel doğrulanamadı');
});

test('bindListingVehicleImageFallbacks binds gallery hero and thumb runtime error fallback', () => {
  const root = createListingImageRoot({
    hero: {
      src: 'https://cdn.example/toyota-corolla-cross-2023.jpg',
      alt: '2023 Toyota Corolla Cross Hybrid'
    },
    thumb: {
      src: 'https://cdn.example/toyota-corolla-cross-2023.jpg',
      alt: ''
    }
  });

  bindListingVehicleImageFallbacks(root, {
    category: 'vehicle',
    title: '2023 Toyota Corolla Cross Hybrid',
    images: ['https://cdn.example/toyota-corolla-cross-2023.jpg']
  });

  const hero = root.querySelectorAll('.listing-gallery-hero')[0];
  const thumb = root.querySelectorAll('.listing-gallery-thumb img')[0];

  assert.equal(hero.dataset.fallbackBound, '1');
  assert.equal(thumb.dataset.fallbackBound, '1');

  hero.dispatchError();
  thumb.dispatchError();

  assert.match(stripVersion(hero.src), /vehicle-premium-placeholder\.svg$/);
  assert.match(stripVersion(thumb.src), /vehicle-premium-placeholder\.svg$/);
  assert.equal(hero.alt, 'Görsel doğrulanamadı');
  assert.equal(thumb.alt, 'Görsel doğrulanamadı');
});

test('regression guard: listings-ui binds card runtime fallback after render', () => {
  const listingsUi = readRepoFile('js/ui/listings-ui.js');
  assert.match(listingsUi, /bindListingVehicleImageFallbacks\(card, listing\)/);
});

test('regression guard: ui.js binds gallery runtime fallback after detail render', () => {
  const uiJs = readRepoFile('js/ui/ui.js');
  assert.match(uiJs, /bindListingVehicleImageFallbacks\(section, listing\)/);
});

test('regression guard: Faz 2E-mini listing image surfaces avoid inline onerror', () => {
  const galleryUi = readRepoFile('js/ui/listing-gallery-ui.js');
  const listingsUi = readRepoFile('js/ui/listings-ui.js');
  const uiJs = readRepoFile('js/ui/ui.js');
  const combined = `${galleryUi}\n${listingsUi}\n${uiJs}`;

  assert.match(combined, /bindListingVehicleImageFallbacks/);
  assert.match(combined, /attachVehicleImageFallback/);
  assert.match(combined, /mapListingToVehicleImageInput/);
  assert.doesNotMatch(combined, /\bonerror\s*=/);
  assert.doesNotMatch(combined, /onerror=/);
});

test('regression guard: Faz 2E-mini defers to listing-trust-ui vehicle mapping without changing trust gate logic', () => {
  const galleryUi = readRepoFile('js/ui/listing-gallery-ui.js');
  const trustUi = readRepoFile('js/ui/listing-trust-ui.js');

  assert.match(galleryUi, /isVehicleListingCategory\(listing\.category\)/);
  assert.doesNotMatch(galleryUi, /resolveVehicleImageTrust/);
  assert.doesNotMatch(trustUi, /bindListingVehicleImageFallbacks/);
});

test('regression guard: Faz 2B public trust copy avoids forbidden visual trust phrases', () => {
  const trustUi = readRepoFile('js/ui/listing-trust-ui.js');
  const listingsUi = readRepoFile('js/ui/listings-ui.js');
  const galleryUi = readRepoFile('js/ui/listing-gallery-ui.js');
  const combined = `${trustUi}\n${listingsUi}\n${galleryUi}`;

  assert.doesNotMatch(combined, /Doğrulanmış görsel/);
  assert.doesNotMatch(combined, /Onaylandı/);
  assert.doesNotMatch(combined, /Resmi/);
  assert.doesNotMatch(combined, /Garantili/);
  assert.doesNotMatch(combined, /sahibinden\.com/);
});
