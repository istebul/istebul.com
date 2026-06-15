import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { UIManager } from '../../js/ui/ui.js';
import { ListingsUI } from '../../js/ui/listings-ui.js';
import {
  formatPublicSourceLabel,
  buildListingTrustStripHtml,
  getListingTrustBadges,
  hasPublicSourceUrl
} from '../../js/ui/listing-trust-ui.js';

const repoRoot = process.cwd();

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function createListingsUiStub() {
  const ui = Object.create(UIManager.prototype);
  Object.assign(ui, ListingsUI.prototype);
  ui.escapeHtml = (value) => String(value ?? '');
  ui.safeImageUrl = () => '/assets/images/placeholder.svg';
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
