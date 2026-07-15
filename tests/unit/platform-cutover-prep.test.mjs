/**
 * PR-567/568 — Platform URL map + cutover sözleşmesi.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

test('URL map active phase is target after PR-568 cutover', async () => {
  const {
    getPlatformProductUrl,
    getPlatformSurfaceUrl,
    PLATFORM_URL_ACTIVE_PHASE,
    listPlatformUrlCutoverDeltas
  } = await import('../../src/platform/constants/platform-url-map.ts');

  assert.equal(PLATFORM_URL_ACTIVE_PHASE, 'target');
  assert.equal(getPlatformProductUrl('istebul-ai'), '/ai/');
  assert.equal(getPlatformProductUrl('garsonai'), '/garson/');
  assert.equal(getPlatformProductUrl('business'), '/business/');
  assert.equal(getPlatformSurfaceUrl('platform-root'), '/');
  assert.equal(getPlatformSurfaceUrl('ai-landing'), '/ai/');

  assert.equal(getPlatformProductUrl('istebul-ai', 'current'), '/');
  const deltas = listPlatformUrlCutoverDeltas();
  assert.equal(deltas.length, 1);
  assert.equal(deltas[0].key, 'istebul-ai');
});

test('PLATFORM_PRODUCTS.url follows active target phase', async () => {
  const { getPlatformProductById } = await import(
    '../../src/platform/constants/platform-products.ts'
  );
  const { PLATFORM_IDENTITY, PLATFORM_CATALOG } = await import(
    '../../src/platform/config/platform-identity.ts'
  );

  assert.equal(getPlatformProductById('istebul-ai')?.url, '/ai/');
  assert.equal(getPlatformProductById('garsonai')?.url, '/garson/');
  assert.equal(PLATFORM_IDENTITY.url, '/');
  assert.equal(PLATFORM_CATALOG.cutoverActive, true);
  assert.equal(PLATFORM_CATALOG.internalLinkPhase, 'target');
  assert.equal(PLATFORM_CATALOG.version, 3);
});

test('nav/footer live HTML matches TARGET fasad', async () => {
  const {
    PLATFORM_NAV_PRODUCT_LINKS_TARGET,
    PLATFORM_FOOTER_PRODUCT_LINKS_TARGET
  } = await import('../../src/platform/constants/platform-nav-footer-ia.ts');

  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const navStart = html.indexOf('id="nav-platform-list"');
  const navEnd = html.indexOf('id="nav-product-menu"', navStart + 1);
  const nav = html.slice(navStart, navEnd);
  const footStart = html.indexOf('data-footer-ia="platform-v1"');
  const foot = html.slice(footStart, footStart + 2500);

  assert.deepEqual(
    PLATFORM_NAV_PRODUCT_LINKS_TARGET.map((l) => l.href),
    ['/ai/', '/garson/', '/business/']
  );
  assert.match(nav, /href="\/ai\/"/);
  assert.match(nav, /href="\/garson\/"/);
  assert.match(foot, /href="\/ai\/"/);
  assert.equal(PLATFORM_FOOTER_PRODUCT_LINKS_TARGET[0].href, '/ai/');
});

test('internal link contract phase is target', async () => {
  const { PLATFORM_INTERNAL_LINK_CONTRACT } = await import(
    '../../src/platform/constants/platform-internal-links.ts'
  );
  assert.equal(PLATFORM_INTERNAL_LINK_CONTRACT.phase, 'target');
  assert.equal(PLATFORM_INTERNAL_LINK_CONTRACT.version, 2);
});

test('/ai is indexable and listed in sitemap after cutover', () => {
  const aiHtml = fs.readFileSync(path.join(root, 'ai/index.html'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  assert.match(aiHtml, /name="robots"[^>]*content="index, follow/);
  assert.doesNotMatch(aiHtml, /noindex/);
  assert.match(sitemap, /https:\/\/www\.istebul\.com\/ai\//);
  assert.match(aiHtml, /ai-landing-graph\.json/);
});

test('root uses platform-graph and Platform Landing mount', () => {
  const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
  assert.match(indexHtml, /platform-graph\.json/);
  assert.match(indexHtml, /id="platform-landing"/);
  assert.match(indexHtml, /platform-landing-mount/);
  assert.match(appJs, /initPlatformLanding/);
  assert.doesNotMatch(indexHtml, /id="hero-v4-title"/);
});
