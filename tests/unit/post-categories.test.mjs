import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  normalizePostCategory,
  postCategoryFilterValues,
  getGuideCategory,
  GUIDE_CATEGORIES,
  blogListHref,
  blogCategoryFromSearch
} = await import('../../js/features/content/public-content.js');

const root = path.resolve(import.meta.dirname, '../..');

test('normalizePostCategory maps Turkish and legacy slugs to canonical DB values', () => {
  assert.equal(normalizePostCategory('araç'), 'auto');
  assert.equal(normalizePostCategory('auto'), 'auto');
  assert.equal(normalizePostCategory('konut'), 'housing');
  assert.equal(normalizePostCategory('housing'), 'housing');
  assert.equal(normalizePostCategory('finansman'), 'finance');
  assert.equal(normalizePostCategory('finans'), 'finance');
  assert.equal(normalizePostCategory('sigorta'), 'insurance');
  assert.equal(normalizePostCategory('tatil'), 'travel');
});

test('postCategoryFilterValues includes legacy DB slugs for REST queries', () => {
  assert.deepEqual(postCategoryFilterValues('housing'), ['housing', 'konut']);
  assert.deepEqual(postCategoryFilterValues('finance'), ['finance', 'finans']);
  assert.deepEqual(postCategoryFilterValues('auto'), ['auto']);
});

test('getGuideCategory resolves legacy query params', () => {
  assert.equal(getGuideCategory('konut')?.id, 'housing');
  assert.equal(getGuideCategory('finans')?.label, 'Finansman');
  assert.equal(getGuideCategory('') , null);
  assert.equal(GUIDE_CATEGORIES.map((c) => c.id).join(','), 'auto,housing,travel,finance,insurance');
});

test('blogListHref emits canonical category query URLs', () => {
  assert.equal(blogListHref(), '/blog/');
  assert.equal(blogListHref('auto'), '/blog/?category=auto');
  assert.equal(blogListHref('housing'), '/blog/?category=housing');
  assert.equal(blogListHref('travel'), '/blog/?category=travel');
  assert.equal(blogListHref('finance'), '/blog/?category=finance');
  assert.equal(blogListHref('insurance'), '/blog/?category=insurance');
  assert.equal(blogListHref('konut'), '/blog/?category=housing');
});

test('blogCategoryFromSearch reads category and legacy kategori params', () => {
  assert.equal(blogCategoryFromSearch(''), '');
  assert.equal(blogCategoryFromSearch('?category=housing'), 'housing');
  assert.equal(blogCategoryFromSearch('?category=finance'), 'finance');
  assert.equal(blogCategoryFromSearch('?category=insurance'), 'insurance');
  assert.equal(blogCategoryFromSearch('?kategori=konut'), 'housing');
  assert.equal(blogCategoryFromSearch('?kategori=finansman'), 'finance');
});

test('posts-admin always includes category in save payload', () => {
  const mod = fs.readFileSync(path.join(root, 'js/admin/posts-admin.js'), 'utf8');
  assert.match(mod, /normalizePostCategory/);
  assert.match(mod, /category\s*\n\s*\};/s);
  assert.doesNotMatch(mod, /if \(hasPostsCategoryColumn\) values\.category = category/);
});

test('posts-admin defaults hasPostsCategoryColumn to true', () => {
  const mod = fs.readFileSync(path.join(root, 'js/admin/posts-admin.js'), 'utf8');
  assert.match(mod, /let hasPostsCategoryColumn = true/);
});

test('admin blog category select uses canonical values', () => {
  const html = fs.readFileSync(path.join(root, 'admin-panel.html'), 'utf8');
  const blogBlock = html.slice(html.indexOf('id="blog-post-category"'), html.indexOf('id="blog-post-cover-external"'));
  assert.match(blogBlock, /value="housing"/);
  assert.match(blogBlock, /value="finance"/);
  assert.doesNotMatch(blogBlock, /value="konut"/);
});
