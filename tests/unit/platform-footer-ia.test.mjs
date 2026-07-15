/**
 * PR-562 — Platform footer bilgi mimarisi sözleşmesi.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/istebul-premium-final-v7.css'), 'utf8');

function footerBlock() {
  const start = html.indexOf('<footer');
  const end = html.indexOf('</footer>', start);
  assert.ok(start >= 0, 'footer missing');
  assert.ok(end > start, 'footer close missing');
  return html.slice(start, end + '</footer>'.length);
}

test('footer IA exposes five columns: products, company, resources, support, legal', () => {
  const footer = footerBlock();
  assert.match(footer, /data-footer-ia="platform-v1"/);
  for (const col of ['products', 'company', 'resources', 'support', 'legal']) {
    assert.match(footer, new RegExp(`data-footer-col="${col}"`));
  }
});

test('Ürünler column lists platform products with preserved URLs', () => {
  const footer = footerBlock();
  const productsStart = footer.indexOf('data-footer-col="products"');
  const companyStart = footer.indexOf('data-footer-col="company"');
  assert.ok(productsStart >= 0);
  assert.ok(companyStart > productsStart);
  const products = footer.slice(productsStart, companyStart);

  assert.match(products, /href="\/#home"/);
  assert.match(products, /href="\/garson\/"/);
  assert.match(products, /href="\/business\/"/);
  assert.match(products, /href="\/planlar"/);
  assert.match(products, /İSTEBUL AI|ISTEBUL AI/);
  assert.match(products, /GarsonAI/);
  assert.match(products, /İSTEBUL Business|ISTEBUL Business/);
  assert.match(products, /İSTEBUL AI Planları/);

  // Categories remain nested under products (existing vertical URLs)
  assert.match(products, /href="\/auto\/"/);
  assert.match(products, /href="\/konut\/"/);
  assert.match(products, /href="\/tatil\/"/);
  assert.match(products, /href="\/finans\/"/);
  assert.match(products, /href="\/sigorta\/"/);
  assert.match(products, /href="\/kasko\/"/);
});

test('Destek column holds yardım + SSS; Kaynaklar keeps guides', () => {
  const footer = footerBlock();
  const supportStart = footer.indexOf('data-footer-col="support"');
  const legalStart = footer.indexOf('data-footer-col="legal"');
  const resourcesStart = footer.indexOf('data-footer-col="resources"');
  const support = footer.slice(supportStart, legalStart);
  const resources = footer.slice(resourcesStart, supportStart);

  assert.match(support, /href="\/yardim\.html"/);
  assert.match(support, /href="\/#landing-faq"/);
  assert.doesNotMatch(resources, /href="\/yardim\.html"/);
  assert.doesNotMatch(resources, /href="\/#landing-faq"/);

  assert.match(resources, /href="\/#home-guides-strip"/);
  assert.match(resources, /href="\/rehber\/"/);
  assert.match(resources, /href="\/rehber\/suv-mi-sedan-mi\/"/);
  assert.match(resources, /href="\/metodoloji\/"/);
});

test('footer hash anchors resolve on homepage', () => {
  for (const id of ['home', 'landing-faq', 'home-guides-strip']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test('SEO contracts untouched: H1, meta description, home schema', () => {
  assert.match(html, /id="hero-v4-title"/);
  assert.match(
    html,
    /Büyük kararları verirken <span class="ib-hero-gradient-text">yalnız değilsiniz\.<\/span>/
  );
  assert.match(
    html,
    /name="description"[^>]*content="Araba, konut, tatil, finansman ve sigorta kararlarında/
  );
  assert.match(html, /src="\/data\/schema\/home-graph\.json"/);
});

test('footer CSS progresses to five columns at wide breakpoints', () => {
  assert.match(css, /PR-562/);
  assert.match(
    css,
    /@media \(min-width: 1100px\)[\s\S]*?ib-footer-v7__cols\.footer-content[\s\S]*?repeat\(5,/
  );
});

test('footerNav i18n exposes support and product IA keys', async () => {
  const { marketingCopy } = await import('../../js/features/i18n/marketing-copy.js');
  const locales = ['tr', 'en', 'de', 'ar', 'it', 'fr', 'es', 'ja', 'zh'];
  for (const localeId of locales) {
    const nav = marketingCopy[localeId].footerNav;
    assert.equal(typeof nav.products, 'string');
    assert.equal(typeof nav.support, 'string');
    assert.equal(typeof nav.helpCenter, 'string');
    assert.equal(typeof nav.categoriesSubhead, 'string');
    assert.ok(nav.plans.length > 0);
    assert.match(nav.brandDesc, /GarsonAI/);
  }
  assert.equal(marketingCopy.tr.footerNav.products, 'Ürünler');
  assert.equal(marketingCopy.tr.footerNav.support, 'Destek');
  assert.equal(marketingCopy.tr.footerNav.plans, 'İSTEBUL AI Planları');
});
