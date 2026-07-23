import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HOME_CATEGORY_PILLARS,
  HOME_DECISION_CATEGORIES,
  getHomeCategoriesByStatus,
  isHomeCategoryActive
} from '../../js/platform/home-category-config.js';
import { listVerticals } from '../../js/platform/category-registry.js';

const EXPECTED_HREF_BY_ID = Object.freeze({
  araba: '/auto/',
  konut: '/konut/',
  tatil: '/tatil/',
  finansman: '/finans/',
  sigorta: '/sigorta/',
  kasko: '/kasko/'
});

const EXPECTED_SAMPLE_SCORES = Object.freeze({
  araba: 89,
  konut: 88,
  tatil: 91,
  finansman: 87,
  sigorta: 86,
  kasko: 85
});

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
  assert.deepEqual(hrefById, EXPECTED_HREF_BY_ID);
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

test('home categories: sampleScore overlay preserved', () => {
  const scoreById = Object.fromEntries(
    HOME_DECISION_CATEGORIES.map((category) => [category.id, category.sampleScore])
  );
  assert.deepEqual(scoreById, EXPECTED_SAMPLE_SCORES);
});

test('home categories: registry adapter uses homeKey ids not canonical ids', () => {
  const ids = HOME_DECISION_CATEGORIES.map((category) => category.id);
  assert.ok(ids.includes('araba'));
  assert.ok(ids.includes('finansman'));
  assert.equal(ids.includes('auto'), false);
  assert.equal(ids.includes('finans'), false);
});

test('home categories: registry parity for href and settingKey', () => {
  const registryByHomeKey = Object.fromEntries(
    listVerticals().map((entry) => [entry.homeKey, entry])
  );

  for (const category of HOME_DECISION_CATEGORIES) {
    const entry = registryByHomeKey[category.id];
    assert.ok(entry, `missing registry entry for homeKey ${category.id}`);
    assert.equal(category.href, entry.href);
    assert.equal(category.settingKey, entry.settingKey);
    assert.equal(category.id, entry.homeKey);
  }
});

test('home categories: display order matches legacy home config', () => {
  assert.deepEqual(HOME_DECISION_CATEGORIES.map((category) => category.id), [
    'araba',
    'konut',
    'tatil',
    'finansman',
    'sigorta',
    'kasko'
  ]);
});
