import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HOME_DECISION_CATEGORIES,
  isHomeCategoryActive
} from '../../js/platform/home-category-config.js';

test('home categories: auto and tatil active', () => {
  const active = HOME_DECISION_CATEGORIES.filter((c) => isHomeCategoryActive(c));
  assert.equal(active.length, 2);
  assert.deepEqual(
    active.map((c) => c.id).sort(),
    ['otomobil', 'tatil']
  );
});

test('home categories: konut finans sigorta coming soon without href', () => {
  const soon = HOME_DECISION_CATEGORIES.filter((c) => c.status === 'coming_soon');
  assert.equal(soon.length, 3);
  soon.forEach((c) => {
    assert.equal(c.href, null);
    assert.equal(isHomeCategoryActive(c), false);
  });
});
