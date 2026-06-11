import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HOME_CATEGORY_PILLARS,
  HOME_DECISION_CATEGORIES,
  getHomeCategoriesByStatus,
  isHomeCategoryActive
} from '../../js/platform/home-category-config.js';

test('home categories: six active verticals including kasko', () => {
  const active = HOME_DECISION_CATEGORIES.filter((c) => isHomeCategoryActive(c));
  assert.equal(active.length, 6);
  assert.deepEqual(
    active.map((c) => c.id).sort(),
    ['araba', 'finansman', 'kasko', 'konut', 'sigorta', 'tatil']
  );
  active.forEach((c) => {
    assert.ok(c.href);
    assert.equal(c.status, 'active');
  });
});

test('home categories: canonical vertical href map', () => {
  const hrefById = Object.fromEntries(HOME_DECISION_CATEGORIES.map((c) => [c.id, c.href]));
  assert.deepEqual(hrefById, {
    araba: '/auto/',
    konut: '/konut/',
    tatil: '/tatil/',
    finansman: '/finans/',
    sigorta: '/sigorta/',
    kasko: '/kasko/'
  });
});

test('home categories: no coming_soon entries when all live', () => {
  const soon = getHomeCategoriesByStatus('coming_soon');
  assert.equal(soon.length, 0);
});

test('home category pillars are standardized', () => {
  assert.deepEqual(HOME_CATEGORY_PILLARS, [
    'Karar skoru',
    'Toplam maliyet',
    'Risk analizi',
    'Sonraki adım'
  ]);
});
