/**
 * PR-567 — Platform Cutover hazırlık sözleşmesi.
 * Kullanıcı davranışı / SEO değişmez; merkezi URL + chrome fasadı kilitlenir.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

test('URL map CURRENT matches live product / surface entries', async () => {
  const {
    getPlatformProductUrl,
    getPlatformSurfaceUrl,
    PLATFORM_URL_ACTIVE_PHASE,
    listPlatformUrlCutoverDeltas
  } = await import('../../src/platform/constants/platform-url-map.ts');

  assert.equal(PLATFORM_URL_ACTIVE_PHASE, 'current');
  assert.equal(getPlatformProductUrl('istebul-ai', 'current'), '/');
  assert.equal(getPlatformProductUrl('garsonai', 'current'), '/garson/');
  assert.equal(getPlatformProductUrl('business', 'current'), '/business/');
  assert.equal(getPlatformSurfaceUrl('platform-root', 'current'), '/');
  assert.equal(getPlatformSurfaceUrl('ai-landing', 'current'), '/ai/');
  assert.equal(getPlatformSurfaceUrl('ai-funnel', 'current'), '/karar-asistani/');

  assert.equal(getPlatformProductUrl('istebul-ai', 'target'), '/ai/');
  assert.equal(getPlatformProductUrl('garsonai', 'target'), '/garson/');
  assert.equal(getPlatformProductUrl('business', 'target'), '/business/');

  const deltas = listPlatformUrlCutoverDeltas();
  assert.equal(deltas.length, 1);
  assert.equal(deltas[0].key, 'istebul-ai');
  assert.equal(deltas[0].current, '/');
  assert.equal(deltas[0].target, '/ai/');
});

test('PLATFORM_PRODUCTS.url stays on CURRENT (no silent cutover)', async () => {
  const { PLATFORM_PRODUCTS, getPlatformProductById } = await import(
    '../../src/platform/constants/platform-products.ts'
  );
  const { PLATFORM_IDENTITY, PLATFORM_CATALOG } = await import(
    '../../src/platform/config/platform-identity.ts'
  );

  assert.equal(getPlatformProductById('istebul-ai')?.url, '/');
  assert.equal(getPlatformProductById('garsonai')?.url, '/garson/');
  assert.equal(getPlatformProductById('business')?.url, '/business/');
  assert.equal(PLATFORM_IDENTITY.url, '/');
  assert.equal(PLATFORM_PRODUCTS.length, 3);
  assert.equal(PLATFORM_CATALOG.cutoverPrepared, true);
  assert.equal(PLATFORM_CATALOG.internalLinkPhase, 'current');
  assert.equal(PLATFORM_CATALOG.version, 2);
});

test('nav/footer IA fasadı CURRENT ile index.html canlı sözleşmesini hizalar', async () => {
  const {
    PLATFORM_NAV_PRODUCT_LINKS_CURRENT,
    PLATFORM_FOOTER_PRODUCT_LINKS_CURRENT,
    PLATFORM_NAV_CATEGORY_LINKS_CURRENT,
    PLATFORM_NAV_PRODUCT_LINKS_TARGET,
    PLATFORM_FOOTER_PRODUCT_LINKS_TARGET
  } = await import('../../src/platform/constants/platform-nav-footer-ia.ts');

  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const navStart = html.indexOf('id="nav-platform-list"');
  const navEnd = html.indexOf('id="nav-product-menu"', navStart + 1);
  const nav = html.slice(navStart, navEnd);
  const footStart = html.indexOf('data-footer-ia="platform-v1"');
  assert.ok(footStart >= 0);
  const foot = html.slice(footStart, footStart + 2500);

  assert.deepEqual(
    PLATFORM_NAV_PRODUCT_LINKS_CURRENT.map((l) => l.href),
    ['/', '/garson/', '/business/']
  );
  assert.match(nav, /href="\/"/);
  assert.match(nav, /href="\/garson\/"/);
  assert.match(nav, /href="\/business\/"/);

  assert.equal(PLATFORM_FOOTER_PRODUCT_LINKS_CURRENT[0].href, '/#home');
  assert.match(foot, /href="\/#home"/);
  assert.match(foot, /href="\/garson\/"/);
  assert.match(foot, /href="\/business\/"/);

  assert.ok(
    PLATFORM_NAV_CATEGORY_LINKS_CURRENT.every(
      (l) => !String(l.href).includes('/garson') && !String(l.href).includes('/business')
    )
  );

  assert.deepEqual(
    PLATFORM_NAV_PRODUCT_LINKS_TARGET.map((l) => l.href),
    ['/ai/', '/garson/', '/business/']
  );
  assert.equal(PLATFORM_FOOTER_PRODUCT_LINKS_TARGET[0].href, '/ai/');
});

test('internal link contract documents non-goals and prep phase', async () => {
  const { PLATFORM_INTERNAL_LINK_CONTRACT } = await import(
    '../../src/platform/constants/platform-internal-links.ts'
  );
  assert.equal(PLATFORM_INTERNAL_LINK_CONTRACT.phase, 'current');
  assert.ok(PLATFORM_INTERNAL_LINK_CONTRACT.bindings.length >= 5);
  assert.ok(
    PLATFORM_INTERNAL_LINK_CONTRACT.bindings.every((b) => b.userVisibleChangeInPrep === false)
  );
  assert.ok(PLATFORM_INTERNAL_LINK_CONTRACT.nonGoals.includes('index.html link rewrite'));
  assert.ok(PLATFORM_INTERNAL_LINK_CONTRACT.nonGoals.includes('/ai noindex kaldırma'));
});

test('cutover matrix doc exists and barrel exports URL helpers', async () => {
  const matrix = fs.readFileSync(
    path.join(root, 'docs/EPIC_002_CUTOVER_URL_MATRIX.md'),
    'utf8'
  );
  assert.match(matrix, /istebul-ai/);
  assert.match(matrix, /CURRENT/);
  assert.match(matrix, /TARGET/);
  assert.match(matrix, /noindex/);

  const barrel = await import('../../src/platform/index.ts');
  assert.equal(typeof barrel.getPlatformProductUrl, 'function');
  assert.equal(typeof barrel.listPlatformUrlCutoverDeltas, 'function');
  assert.ok(barrel.PLATFORM_NAV_PRODUCT_LINKS_CURRENT);
  assert.ok(barrel.PLATFORM_INTERNAL_LINK_CONTRACT);
});

test('prep does not alter SEO surfaces or /ai noindex', () => {
  const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const aiHtml = fs.readFileSync(path.join(root, 'ai/index.html'), 'utf8');
  const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');

  assert.match(indexHtml, /rel="canonical"[^>]*href="https:\/\/www\.istebul\.com\/"/);
  assert.match(indexHtml, /src="\/data\/schema\/home-graph\.json"/);
  assert.match(aiHtml, /name="robots"[^>]*content="noindex, nofollow"/);
  assert.doesNotMatch(sitemap, /istebul\.com\/ai\/?/);
  assert.doesNotMatch(robots, /\/ai/);
});

test('runtime shells do not import TARGET URL phase', () => {
  const home = fs.readFileSync(path.join(root, 'js/runtime/platform-shell-home.js'), 'utf8');
  const preview = fs.readFileSync(
    path.join(root, 'js/runtime/platform-shell-preview.js'),
    'utf8'
  );
  assert.doesNotMatch(home, /getPlatformProductUrl\([^)]*'target'/);
  assert.doesNotMatch(preview, /getPlatformProductUrl\([^)]*'target'/);
  assert.doesNotMatch(home, /PLATFORM_NAV_PRODUCT_LINKS_TARGET/);
  assert.doesNotMatch(preview, /PLATFORM_FOOTER_PRODUCT_LINKS_TARGET/);
});
