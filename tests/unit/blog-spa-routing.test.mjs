import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

test('buildSeoPages skips dynamic content hubs (blog, duyurular, kampanyalar, decision surfaces)', () => {
  const seo = fs.readFileSync(path.join(root, 'scripts/lib/seo.cjs'), 'utf8');
  assert.match(seo, /DYNAMIC_CONTENT_SPA_HUBS/);
  assert.match(seo, /blog', 'duyurular', 'kampanyalar', 'karar-asistani', 'secenekler', 'karsilastir/);
});

test('production build emits SPA shells for dynamic content list routes', () => {
  const build = fs.readFileSync(path.join(root, 'scripts/production-build.cjs'), 'utf8');
  assert.match(build, /dynamicContentSpaRoutes = \[/);
  assert.match(build, /'karar-asistani'/);
  assert.match(build, /'secenekler'/);
  assert.match(build, /'karsilastir'/);
  assert.match(build, /patchSpaShellHtml\(shellHtml, route, routeDocumentMeta\)/);
});

test('SPA shell route map covers decision hub surfaces', () => {
  const meta = fs.readFileSync(path.join(root, 'scripts/lib/spa-shell-meta.cjs'), 'utf8');
  assert.match(meta, /'karar-asistani': 'page-karar-analizi'/);
  assert.match(meta, /secenekler: 'ilanlar'/);
  assert.match(meta, /karsilastir: 'compare'/);
});

test('_redirects serves blog list hub from SPA shell without wildcard override', () => {
  const redirects = fs.readFileSync(path.join(root, '_redirects'), 'utf8');
  assert.match(redirects, /^\/blog \/blog\/index\.html 200/m);
  assert.match(redirects, /^\/blog\/ \/blog\/index\.html 200/m);
  assert.doesNotMatch(redirects, /^\/blog\/\* /m);
});

test('router SPA-navigates /blog from data-native-route links', () => {
  const router = fs.readFileSync(path.join(root, 'js/core/router.js'), 'utf8');
  assert.match(router, /path === '\/blog'/);
  assert.match(router, /clearSectionDisplayOverride/);
});

test('index route CSS hides marketing hero on premium content pages', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /html\[data-ib-route\^="page-"\] #home/);
});

test('router navigate preserves query string for blog category filters', () => {
  const router = fs.readFileSync(path.join(root, 'js/core/router.js'), 'utf8');
  assert.match(router, /searchPart/);
  assert.match(router, /queryChanged/);
});

test('blog filter tabs use canonical category hrefs', () => {
  const ui = fs.readFileSync(path.join(root, 'js/features/content/content-hub-ui.js'), 'utf8');
  assert.match(ui, /blogListHref\(cat\.id\)/);
  assert.match(ui, /blogCategoryFromSearch/);
  assert.doesNotMatch(ui, /kategori=\$\{/);
});

test('init-public-content imports blogSlugFromPath for blog post hydration', () => {
  const mod = fs.readFileSync(path.join(root, 'js/runtime/init-public-content.js'), 'utf8');
  assert.match(mod, /import\s*\{[^}]*blogSlugFromPath[^}]*\}\s*from\s*'\.\/route-surface\.js'/);
  assert.match(mod, /renderBlogPostPage\(document,\s*blogSlugFromPath/);
});
