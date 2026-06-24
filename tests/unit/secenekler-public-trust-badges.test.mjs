import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { UIManager } from '../../js/ui/ui.js';
import { ListingsUI } from '../../js/ui/listings-ui.js';
import {
  bindListingGenericImageFallbacks,
  bindListingVehicleImageFallbacks
} from '../../js/ui/listing-gallery-ui.js';
import { buildVehicleImageUiPayload } from '../../js/auto/vehicle-image.js';
import { resolveListingImages } from '../../js/features/listings/listing-media.js';
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
  resolveListingComparisonImageItem,
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

test('listing card renders trust strip and karar skoru disclaimer without external fallback CTA', () => {
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
  assert.match(htmlWithoutSource, /Karar skoru 77\/100/);
  assert.match(htmlWithoutSource, /veri güveni değil/);
  assert.doesNotMatch(htmlWithoutSource, /AI uyum/);
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
  assert.match(combined, /Karar seçeneği kaynak ve görsel bilgisi/);
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

test('bindListingGenericImageFallbacks binds non-vehicle card image runtime error placeholder', () => {
  const root = createListingImageRoot({
    card: {
      src: 'https://cdn.example/kadikoy.jpg',
      alt: 'Kadıköy daire'
    }
  });

  bindListingGenericImageFallbacks(root, {
    category: 'ev',
    title: 'Kadıköy daire',
    images: ['https://cdn.example/kadikoy.jpg']
  });

  const img = root.querySelectorAll('.listing-image')[0];
  assert.equal(img.dataset.genericFallbackBound, '1');
  assert.equal(img.dataset.fallbackBound, undefined);

  img.dispatchError();

  assert.equal(img.src, '/assets/images/placeholder.svg');
  assert.equal(img.alt, 'Kadıköy daire');
});

test('bindListingGenericImageFallbacks binds non-vehicle gallery hero and thumb runtime error placeholder', () => {
  const root = createListingImageRoot({
    hero: {
      src: 'https://cdn.example/bodrum-villa.jpg',
      alt: 'Bodrum villa'
    },
    thumb: {
      src: 'https://cdn.example/bodrum-villa.jpg',
      alt: ''
    }
  });

  bindListingGenericImageFallbacks(root, {
    category: 'tatil',
    title: 'Bodrum villa',
    images: ['https://cdn.example/bodrum-villa.jpg']
  });

  const hero = root.querySelectorAll('.listing-gallery-hero')[0];
  const thumb = root.querySelectorAll('.listing-gallery-thumb img')[0];

  assert.equal(hero.dataset.genericFallbackBound, '1');
  assert.equal(thumb.dataset.genericFallbackBound, '1');

  hero.dispatchError();
  thumb.dispatchError();

  assert.equal(hero.src, '/assets/images/placeholder.svg');
  assert.equal(thumb.src, '/assets/images/placeholder.svg');
  assert.equal(hero.alt, 'Bodrum villa');
  assert.equal(thumb.alt, '');
});

test('bindListingGenericImageFallbacks no-ops for vehicle listings', () => {
  const root = createListingImageRoot({
    card: {
      src: 'https://cdn.example/citroen-c4-max.jpg',
      alt: '2024 Citroen C4 Max'
    }
  });

  bindListingGenericImageFallbacks(root, {
    category: 'arac',
    title: '2024 Citroen C4 Max',
    images: ['https://cdn.example/citroen-c4-max.jpg']
  });

  const img = root.querySelectorAll('.listing-image')[0];
  assert.equal(img.dataset.genericFallbackBound, undefined);
});

test('regression guard: listings-ui binds card runtime fallback after render', () => {
  const listingsUi = readRepoFile('js/ui/listings-ui.js');
  assert.match(listingsUi, /bindListingVehicleImageFallbacks\(card, listing\)/);
  assert.match(listingsUi, /bindListingGenericImageFallbacks\(card, listing\)/);
});

test('regression guard: ui.js binds gallery runtime fallback after detail render', () => {
  const uiJs = readRepoFile('js/ui/ui.js');
  assert.match(uiJs, /bindListingVehicleImageFallbacks\(section, listing\)/);
  assert.match(uiJs, /bindListingGenericImageFallbacks\(section, listing\)/);
});

test('regression guard: Faz 2E-mini listing image surfaces avoid inline onerror', () => {
  const galleryUi = readRepoFile('js/ui/listing-gallery-ui.js');
  const listingsUi = readRepoFile('js/ui/listings-ui.js');
  const uiJs = readRepoFile('js/ui/ui.js');
  const combined = `${galleryUi}\n${listingsUi}\n${uiJs}`;

  assert.match(combined, /bindListingVehicleImageFallbacks/);
  assert.match(combined, /bindListingGenericImageFallbacks/);
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

test('regression guard: Faz 2C trust catalog copy uses decision-platform language', () => {
  const trustUi = readRepoFile('js/ui/listing-trust-ui.js');
  const listingsUi = readRepoFile('js/ui/listings-ui.js');
  const combined = `${trustUi}\n${listingsUi}`;

  const FORBIDDEN_TRUST_CATALOG_COPY = [
    'AI uyum',
    'AI ilan',
    'Yapay Zeka Destekli',
    'yapay zeka destekli seçenek',
    'Doğrulanmış görsel',
    'Onaylandı',
    'Garantili',
    'https://www.sahibinden.com/'
  ];

  const REQUIRED_TRUST_CATALOG_COPY = [
    'Karar skoru',
    'Yayınlanmış seçenek',
    'Karar seçeneği kaynak ve görsel bilgisi',
    'metodolojik karar uyum skorudur',
    'Tam analiz ilgili kategori akışında hesaplanır'
  ];

  for (const phrase of FORBIDDEN_TRUST_CATALOG_COPY) {
    assert.equal(
      combined.includes(phrase),
      false,
      `trust catalog surfaces must not include: ${phrase}`
    );
  }

  for (const phrase of REQUIRED_TRUST_CATALOG_COPY) {
    assert.match(combined, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

function listingHasResolvablePublicSource(listing = {}) {
  return hasPublicSourceUrl(listing) || Boolean(resolvePublicExternalUrl(listing));
}

function buildListingComparisonSourceDetails(listing = {}) {
  return listingHasResolvablePublicSource(listing) ? 'Harici kaynak bağlantılı' : 'Platform içi kayıt';
}

function buildListingComparisonSourceTags(listing = {}) {
  const tags = [];
  if (listingHasResolvablePublicSource(listing)) tags.push('Kaynak bağlantılı');
  return tags;
}

function buildSecenekComparisonTrustFields(listing = {}) {
  const categoryId = listing.category || 'genel';
  const sourceUrl = resolvePublicExternalUrl(listing) || null;
  const isVehicle = isVehicleListingCategory(categoryId);
  let image = null;
  let imageTrust;

  if (isVehicle) {
    const vehicleInput = mapListingToVehicleImageInput({ ...listing, category: categoryId });
    const uiPayload = buildVehicleImageUiPayload(vehicleInput);
    image = resolveListingTrustGatedImageUrl({ ...listing, category: categoryId }) || uiPayload.imageUrl;
    imageTrust = uiPayload.imageTrust;
  } else {
    image = resolveListingImages(listing)[0] || '/assets/images/placeholder.svg';
  }

  return {
    sourceUrl,
    image,
    imageTrust,
    listingImageSeed: {
      category: categoryId,
      title: listing.title || 'Seçenek',
      images: listing.images,
      image_url: listing.image_url ?? listing.imageUrl ?? null,
      vehicleBrand: listing.vehicleBrand,
      attributes: listing.attributes,
      year: listing.year,
      model_year: listing.model_year
    }
  };
}

function createComparisonUiStub() {
  const comparisonUiSource = readRepoFile('js/ui/comparison-ui.js');
  assert.match(comparisonUiSource, /export class ComparisonUI/);

  return {
    escapeHtml: (value) => String(value ?? ''),
    formatPrice: (value) => `₺${value ?? 0}`,
    getCostBreakdownMarkup: () => '',
    getComparisonGraphMarkup: () => '',
    getComparisonScoreBreakdownMarkup: () => '',
    loadIcons: () => {},
    bindComparisonListingImageFallbacks(container, items = []) {
      if (!container?.querySelectorAll) return;

      for (const item of items) {
        if (item.sourceType !== 'Seçenek' || !item.listingImageSeed) continue;

        const card = Array.from(container.querySelectorAll('[data-comparison-item-id]')).find(
          (node) => node.dataset.comparisonItemId === String(item.id)
        );
        if (!card) continue;

        const seed = {
          ...item.listingImageSeed,
          category: item.categoryId || item.listingImageSeed.category
        };
        bindListingVehicleImageFallbacks(card, seed);
        bindListingGenericImageFallbacks(card, seed);
      }
    },
    getComparisonCardMarkup(item, maxValues, allItems = []) {
      const tags = Array.isArray(item.tags) ? item.tags : [];
      const maxScore = Math.max(...allItems.map((i) => Number(i.score || 0)), 0);
      const isLeader = item.score && Number(item.score) >= maxScore && maxScore > 0;
      const listingVisual =
        item.sourceType === 'Seçenek' ? resolveListingComparisonImageItem(item) : null;
      const visualHtml = listingVisual
        ? '<div class="comparison-vehicle-visual"><img src="' +
          this.escapeHtml(listingVisual.imageUrl) +
          '" alt="' +
          this.escapeHtml(listingVisual.imageAlt) +
          '" loading="lazy" decoding="async"></div>'
        : '';

      return (
        '<article class="comparison-card" data-comparison-item-id="' +
        this.escapeHtml(item.id) +
        '">' +
        visualHtml +
        (isLeader ? '<div class="comparison-leader-badge">leader</div>' : '') +
        '<h4>' +
        this.escapeHtml(item.title || 'Karşılaştırma seçeneği') +
        '</h4>' +
        (tags.length
          ? '<div class="comparison-tags">' +
            tags.map((tag) => '<span>' + this.escapeHtml(tag) + '</span>').join('') +
            '</div>'
          : '') +
        '</article>'
      );
    }
  };
}

test('P0-3C: araç listing comparison trust fields set image and imageTrust', () => {
  const listing = {
    id: 'cmp-vehicle-1',
    category: 'arac',
    title: '2024 Citroen C4 Max',
    images: ['https://cdn.example/citroen-c4-max.jpg']
  };

  const fields = buildSecenekComparisonTrustFields(listing);

  assert.ok(fields.image);
  assert.equal(fields.imageTrust?.showRealImage, true);
  assert.equal(fields.listingImageSeed.category, 'arac');
  assert.match(fields.image, /citroen-c4-max\.jpg|vehicle-premium-placeholder\.svg/);
});

test('P0-3C: source_url-only listing comparison source detail and tag are linked', () => {
  const listing = { source_url: 'https://example.com/listing/source-only' };

  assert.equal(buildListingComparisonSourceDetails(listing), 'Harici kaynak bağlantılı');
  assert.deepEqual(buildListingComparisonSourceTags(listing), ['Kaynak bağlantılı']);
});

test('P0-3C: channels[0].url-only listing comparison source detail and tag are linked', () => {
  const listing = { channels: [{ url: 'https://channel.example/listing/only' }] };

  assert.equal(buildListingComparisonSourceDetails(listing), 'Harici kaynak bağlantılı');
  assert.deepEqual(buildListingComparisonSourceTags(listing), ['Kaynak bağlantılı']);
});

test('P0-3C: invalid URL listing comparison source detail and tag are omitted', () => {
  const listing = { external_url: 'not-a-url', channels: [{ url: 'also-invalid' }] };

  assert.equal(buildListingComparisonSourceDetails(listing), 'Platform içi kayıt');
  assert.deepEqual(buildListingComparisonSourceTags(listing), []);
});

test('P0-3C: Seçenek comparison item gates catalog SVG and untrusted vehicle image', () => {
  const listing = {
    sourceType: 'Seçenek',
    categoryId: 'arac',
    title: '2024 Citroen C4 Max',
    listingImageSeed: {
      category: 'arac',
      title: '2024 Citroen C4 Max',
      images: ['/assets/images/auto/peugeot-suv.svg']
    },
    image: '/assets/images/auto/peugeot-suv.svg',
    imageTrust: {
      showRealImage: false,
      sourceTrust: 'catalog_svg'
    }
  };

  const visual = resolveListingComparisonImageItem(listing);
  assert.ok(visual);
  assert.doesNotMatch(visual.imageUrl, /peugeot-suv\.svg/);
  assert.match(visual.imageUrl, /vehicle-premium-placeholder\.svg/);
  assert.equal(visual.imageAlt, 'Görsel doğrulanamadı');
});

test('P0-3C: comparison-ui Seçenek path uses resolver instead of raw item.image', () => {
  const comparisonUi = readRepoFile('js/ui/comparison-ui.js');
  assert.match(comparisonUi, /resolveListingComparisonImageItem\(item\)/);
  assert.doesNotMatch(
    comparisonUi,
    /item\.sourceType === 'isteBul Auto'[\s\S]*item\.image \? '<div class="comparison-vehicle-visual">/
  );

  const ui = createComparisonUiStub();
  const item = {
    id: 'cmp-listing-1',
    sourceType: 'Seçenek',
    categoryId: 'arac',
    title: '2024 Citroen C4 Max',
    image: '/assets/images/auto/peugeot-suv.svg',
    imageTrust: { showRealImage: false, sourceTrust: 'catalog_svg' },
    listingImageSeed: {
      category: 'arac',
      title: '2024 Citroen C4 Max',
      images: ['/assets/images/auto/peugeot-suv.svg']
    },
    price: 100,
    periodicCost: 10,
    monthlyPayment: 5,
    score: 80,
    tags: []
  };

  const markup = ui.getComparisonCardMarkup(item, { price: 100, periodicCost: 10, monthlyPayment: 5 }, [item]);
  assert.doesNotMatch(markup, /peugeot-suv\.svg/);
  assert.match(markup, /vehicle-premium-placeholder\.svg/);
});

test('P0-3C: comparison Seçenek image runtime fallback binds on render', () => {
  const comparisonUi = readRepoFile('js/ui/comparison-ui.js');
  assert.match(comparisonUi, /bindComparisonListingImageFallbacks\(container, items\)/);
  assert.match(comparisonUi, /bindListingVehicleImageFallbacks\(card, seed\)/);
  assert.match(comparisonUi, /bindListingGenericImageFallbacks\(card, seed\)/);

  const ui = createComparisonUiStub();
  const container = {
    innerHTML: '',
    querySelectorAll(selector) {
      if (selector === '[data-comparison-item-id]') {
        return [this.card];
      }
      return [];
    },
    card: {
      dataset: { comparisonItemId: 'cmp-listing-2' },
      querySelectorAll(selector) {
        if (selector.includes('.comparison-vehicle-visual img')) {
          return [this.img];
        }
        return [];
      },
      img: createMockListingImage({
        src: 'https://cdn.example/citroen-c4-max.jpg',
        alt: '2024 Citroen C4 Max'
      })
    }
  };

  const item = {
    id: 'cmp-listing-2',
    sourceType: 'Seçenek',
    categoryId: 'arac',
    listingImageSeed: {
      category: 'arac',
      title: '2024 Citroen C4 Max',
      images: ['https://cdn.example/citroen-c4-max.jpg']
    }
  };

  ui.bindComparisonListingImageFallbacks(container, [item]);

  const img = container.card.img;
  assert.equal(img.dataset.fallbackBound, '1');
  img.dispatchError();
  assert.match(stripVersion(img.src), /vehicle-premium-placeholder\.svg$/);
});

test('P0-3C regression guard: app.js comparison source guards use P0-3B helpers', () => {
  const appJs = readRepoFile('js/app.js');
  assert.match(appJs, /listingHasResolvablePublicSource\(listing\)/);
  assert.match(appJs, /hasPublicSourceUrl\(listing\)/);
  assert.match(appJs, /resolvePublicExternalUrl\(listing\)/);
  assert.match(appJs, /resolveListingTrustGatedImageUrl/);
  assert.match(appJs, /listingImageSeed/);
  assert.doesNotMatch(appJs, /if \(listing\.external_url\) tags\.push\('Kaynak bağlantılı'\)/);
  assert.doesNotMatch(appJs, /listing\.external_url \? 'Harici kaynak bağlantılı'/);
});
