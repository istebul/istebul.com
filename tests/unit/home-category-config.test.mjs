import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HOME_CATEGORY_PILLARS,
  HOME_DECISION_CATEGORIES,
  getHomeCategoriesByStatus,
  isHomeCategoryActive
} from '../../js/platform/home-category-config.js';

test('home categories: four live verticals', () => {
  const active = HOME_DECISION_CATEGORIES.filter((c) => isHomeCategoryActive(c));
  assert.equal(active.length, 4);
  assert.deepEqual(
    active.map((c) => c.id).sort(),
    ['finans', 'konut', 'otomobil', 'tatil']
  );
  active.forEach((c) => {
    assert.ok(c.href);
    assert.equal(c.status, 'active');
  });
});

test('home categories: sigorta and kasko coming soon without href', () => {
  const soon = getHomeCategoriesByStatus('coming_soon');
  assert.equal(soon.length, 2);
  assert.deepEqual(
    soon.map((c) => c.id).sort(),
    ['kasko', 'sigorta']
  );
  soon.forEach((c) => {
    assert.equal(c.href, null);
    assert.equal(isHomeCategoryActive(c), false);
  });
});

test('home category pillars are standardized', () => {
  assert.deepEqual(HOME_CATEGORY_PILLARS, [
    'Karar skoru',
    'Toplam maliyet',
    'Risk analizi',
    'Sonraki adım'
  ]);
});
