import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { UIManager } from '../../js/ui/ui.js';
import { ListingsUI } from '../../js/ui/listings-ui.js';

const repoRoot = process.cwd();

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('secenekler public surface avoids legacy İlan favori microcopy', () => {
  const appJs = readRepoFile('js/app.js');
  assert.doesNotMatch(appJs, /İlan favorilerinize/);
  assert.doesNotMatch(appJs, /İlan favorilerinizden/);
  assert.match(appJs, /Seçenek favorilerinize eklendi/);
  assert.match(appJs, /sourceType: 'Seçenek'/);
});

test('secenekler filter category has neutral default and supported non-auto options', () => {
  const html = readRepoFile('index.html');
  const selectMatch = html.match(/<select id="filter-category"[\s\S]*?<\/select>/);
  assert.ok(selectMatch, 'filter-category select must exist');
  const selectHtml = selectMatch[0];
  assert.match(selectHtml, /Tüm kategoriler/);
  assert.doesNotMatch(selectHtml, /Araç — tümü/);
  assert.match(selectHtml, /value="arac"/);
  assert.match(selectHtml, /value="ev"/);
  assert.match(selectHtml, /value="tatil"/);
  assert.doesNotMatch(selectHtml, /value="finansman"/);
  assert.doesNotMatch(selectHtml, /value="sigorta"/);
  assert.doesNotMatch(selectHtml, /value="kasko"/);
});

test('secenekler public surface uses decision-platform microcopy', () => {
  const html = readRepoFile('index.html');
  const listingsUi = readRepoFile('js/ui/listings-ui.js');
  const ilanlarSection = html.match(/<section id="ilanlar"[\s\S]*?<\/section>/);
  assert.ok(ilanlarSection, '#ilanlar section must exist');

  const sectionHtml = ilanlarSection[0];
  assert.match(sectionHtml, /Karar skoruna göre değerlendirilmiş seçenekler/);
  assert.match(sectionHtml, /Karar kriterlerinize göre seçenekler yükleniyor/);
  assert.doesNotMatch(sectionHtml, /AI uyum skoruna göre öne çıkan seçenekler/);
  assert.doesNotMatch(sectionHtml, /Size uygun seçenekler hazırlanıyor/);
  assert.doesNotMatch(sectionHtml, /Yapay Zeka Destekli Seçenekler/);
  assert.doesNotMatch(sectionHtml, /AI ilan/i);

  assert.match(listingsUi, /Değerlendirilebilir karar seçenekleri/);
  assert.match(listingsUi, /karar skoruna göre değerlendirilmiş seçenek keşfi/);
  assert.match(listingsUi, /Karar seçeneği analizi/);
  assert.doesNotMatch(listingsUi, /Yapay Zeka Destekli Seçenek Keşfi/);
  assert.doesNotMatch(listingsUi, /yapay zeka destekli seçenek keşfi/);
});

test('secenekler route guardrails remain canonical', () => {
  const routerJs = readRepoFile('js/core/router.js');
  const html = readRepoFile('index.html');

  assert.match(routerJs, /\{ path: '\/secenekler', component: 'ilanlar' \}/);
  assert.match(routerJs, /\{ path: '\/ilanlar', component: 'ilanlar' \}/);
  assert.match(html, /href="\/secenekler\/"/);
});

test('resolveListingQualityScoreDisplay hides null and invalid scores', () => {
  const ui = new UIManager();
  assert.equal(ui.resolveListingQualityScoreDisplay({}), null);
  assert.equal(ui.resolveListingQualityScoreDisplay({ score: 0 }), null);
  assert.equal(ui.resolveListingQualityScoreDisplay({}, null), null);
  assert.equal(ui.resolveListingQualityScoreDisplay({}, undefined), null);
  assert.equal(ui.resolveListingQualityScoreDisplay({ score: 82 }), 82);
  assert.equal(ui.resolveListingQualityScoreDisplay({ score: 150 }), 100);
});

test('listings card template does not render null/undefined score suffix', () => {
  const ui = Object.create(UIManager.prototype);
  Object.assign(ui, ListingsUI.prototype);
  ui.escapeHtml = (value) => String(value ?? '');
  ui.safeImageUrl = () => '/assets/images/placeholder.svg';
  ui.safeExternalUrl = () => '#';
  ui.getListingComparisonSignature = () => 'listing:test:1';
  ui.getCategoryLabel = () => 'Araç';
  ui.getListingLocationLabel = () => 'İstanbul';
  ui.getListingPrimaryActionLabel = () => 'Seçeneği İncele';
  ui.formatPrice = () => '₺0';
  ui.formatDate = () => '—';
  ui.getListingInsightsMarkup = () => '';
  ui.loadIcons = () => {};

  const container = { innerHTML: '' };
  const originalGetElementById = global.document?.getElementById;
  global.document = {
    getElementById: (id) => (id === 'listings-grid' ? container : null)
  };

  try {
    ui.renderListings([{ id: '1', title: 'Skorsuz seçenek', price: 0, category: 'arac' }]);
    assert.doesNotMatch(container.innerHTML, /null\/100/);
    assert.doesNotMatch(container.innerHTML, /undefined\/100/);
    assert.doesNotMatch(container.innerHTML, /AI uyum/);
    assert.match(container.innerHTML, /Değerlendirilebilir karar seçenekleri/);

    ui.renderListings([{ id: '2', title: 'Skorlu seçenek', price: 100, category: 'arac', score: 77 }]);
    assert.match(container.innerHTML, /Karar skoru 77\/100/);
    assert.doesNotMatch(container.innerHTML, /AI uyum/);
    assert.match(container.innerHTML, /Değerlendirilebilir karar seçenekleri/);

    container.innerHTML = '';
    ui.renderListings([], { category: 'arac' });
    assert.match(container.innerHTML, /karar skoruna göre değerlendirilmiş seçenek keşfi/);
    assert.doesNotMatch(container.innerHTML, /yapay zeka destekli seçenek keşfi/i);
  } finally {
    if (originalGetElementById) {
      global.document.getElementById = originalGetElementById;
    } else {
      delete global.document;
    }
  }
});

test('ai-listings README documents published gate instead of disabled public', () => {
  const readme = readRepoFile('docs/ai-listings/README.md');
  assert.doesNotMatch(readme, /Public publishing remains disabled/i);
  assert.doesNotMatch(readme, /\*\*Not integrated\*\*/i);
  assert.match(readme, /ai_listings_public_enabled/);
  assert.match(readme, /status = 'published'/);
  assert.match(readme, /approved alone is not public/i);
});

test('ADMIN_QA_WORKFLOW documents publish and unpublish transitions', () => {
  const doc = readRepoFile('docs/ai-listings/ADMIN_QA_WORKFLOW.md');
  assert.match(doc, /`published`/);
  assert.match(doc, /Publish/);
  assert.match(doc, /Unpublish/);
  assert.doesNotMatch(doc, /always returns `false`/i);
});
