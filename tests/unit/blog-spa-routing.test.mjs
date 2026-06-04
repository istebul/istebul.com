import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

test('buildSeoPages skips dynamic content hubs (blog, duyurular, kampanyalar)', () => {
  const seo = fs.readFileSync(path.join(root, 'scripts/lib/seo.cjs'), 'utf8');
  assert.match(seo, /DYNAMIC_CONTENT_SPA_HUBS/);
  assert.match(seo, /blog', 'duyurular', 'kampanyalar/);
});

test('production build emits SPA shells for dynamic content list routes', () => {
  const build = fs.readFileSync(path.join(root, 'scripts/production-build.cjs'), 'utf8');
  assert.match(build, /dynamicContentSpaRoutes = \['blog', 'duyurular', 'kampanyalar'\]/);
  assert.match(build, /patchSpaShellHtml\(shellHtml, route, routeDocumentMeta\)/);
});

test('_redirects does not force all blog paths to static seo-page index', () => {
  const redirects = fs.readFileSync(path.join(root, '_redirects'), 'utf8');
  assert.doesNotMatch(redirects, /^\/blog\/\* /m);
});

test('router SPA-navigates /blog from data-native-route links', () => {
  const router = fs.readFileSync(path.join(root, 'js/core/router.js'), 'utf8');
  assert.match(router, /path === '\/blog'/);
});
