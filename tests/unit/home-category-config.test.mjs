import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HOME_CATEGORY_PILLARS,
  HOME_DECISION_CATEGORIES,
  getHomeCategoriesByStatus,
  isHomeCategoryActive
} from '../../js/platform/home-category-config.js';

test('home categories: araba, tatil, konut, finansman and sigorta active', () => {
  const active = HOME_DECISION_CATEGORIES.filter((c) => isHomeCategoryActive(c));
  assert.equal(active.length, 5);
  assert.deepEqual(
    active.map((c) => c.id).sort(),
    ['araba', 'finansman', 'konut', 'sigorta', 'tatil']
  );
  active.forEach((c) => {
    assert.ok(c.href);
    assert.equal(c.status, 'active');
  });
});

test('home categories: kasko is coming soon', () => {
  const soon = getHomeCategoriesByStatus('coming_soon');
  assert.equal(soon.length, 1);
  assert.deepEqual(
    soon.map((c) => c.id).sort(),
    ['kasko']
  );
  soon.forEach((c) => {
    assert.ok(c.href);
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
