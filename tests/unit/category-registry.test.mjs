import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VERTICAL_REGISTRY,
  getVerticalByAssistantKey,
  getVerticalByHomeKey,
  getVerticalById,
  getVerticalBySlug,
  listVerticals,
  normalizeVerticalId
} from '../../js/platform/category-registry.js';

const CANONICAL_IDS = ['auto', 'konut', 'tatil', 'finans', 'sigorta', 'kasko'];

const HREF_BY_ID = Object.freeze({
  auto: '/auto/',
  konut: '/konut/',
  tatil: '/tatil/',
  finans: '/finans/',
  sigorta: '/sigorta/',
  kasko: '/kasko/'
});

test('registry contains six canonical verticals', () => {
  assert.equal(VERTICAL_REGISTRY.length, 6);
  assert.deepEqual(
    VERTICAL_REGISTRY.map((entry) => entry.id).sort(),
    [...CANONICAL_IDS].sort()
  );
});

test('registry ids are canonical and unique', () => {
  const ids = VERTICAL_REGISTRY.map((entry) => entry.id);
  assert.deepEqual(ids.sort(), [...CANONICAL_IDS].sort());
  assert.equal(new Set(ids).size, ids.length);
});

test('registry slug and href map matches live routes', () => {
  for (const entry of VERTICAL_REGISTRY) {
    assert.equal(entry.slug, entry.id);
    assert.equal(entry.href, HREF_BY_ID[entry.id]);
    assert.match(entry.href, /^\/[a-z]+\/$/);
  }
});

test('registry captures assistant/home alias drift', () => {
  const auto = getVerticalById('auto');
  assert.ok(auto.aliases.includes('araba'));
  assert.ok(auto.aliases.includes('arac'));
  assert.equal(auto.assistantKey, 'arac');
  assert.equal(auto.homeKey, 'araba');

  const konut = getVerticalById('konut');
  assert.ok(konut.aliases.includes('ev'));
  assert.equal(konut.assistantKey, 'ev');
  assert.equal(konut.homeKey, 'konut');

  const finans = getVerticalById('finans');
  assert.ok(finans.aliases.includes('finansman'));
  assert.equal(finans.assistantKey, 'finansman');
  assert.equal(finans.homeKey, 'finansman');
});

test('normalizeVerticalId resolves legacy tokens', () => {
  assert.equal(normalizeVerticalId('araba'), 'auto');
  assert.equal(normalizeVerticalId('arac'), 'auto');
  assert.equal(normalizeVerticalId('auto'), 'auto');
  assert.equal(normalizeVerticalId('ev'), 'konut');
  assert.equal(normalizeVerticalId('konut'), 'konut');
  assert.equal(normalizeVerticalId('finansman'), 'finans');
  assert.equal(normalizeVerticalId('finans'), 'finans');
});

test('normalizeVerticalId returns null for unknown input', () => {
  assert.equal(normalizeVerticalId(''), null);
  assert.equal(normalizeVerticalId(null), null);
  assert.equal(normalizeVerticalId(undefined), null);
  assert.equal(normalizeVerticalId('education'), null);
  assert.equal(normalizeVerticalId('unknown-vertical'), null);
});

test('each vertical exposes settingKey', () => {
  for (const entry of VERTICAL_REGISTRY) {
    assert.match(entry.settingKey, /^home_category_[a-z]+_enabled$/);
  }
});

test('each vertical exposes lead table or routeType', () => {
  for (const entry of VERTICAL_REGISTRY) {
    assert.ok(entry.lead.table || entry.lead.routeType);
    if (entry.id === 'auto') {
      assert.equal(entry.lead.table, 'auto_leads');
      assert.equal(entry.lead.routeType, null);
    }
  }
});

test('each vertical exposes surface booleans', () => {
  for (const entry of VERTICAL_REGISTRY) {
    assert.equal(typeof entry.surfaces.assistant, 'boolean');
    assert.equal(typeof entry.surfaces.dedicatedApp, 'boolean');
    assert.equal(typeof entry.surfaces.compare, 'boolean');
    assert.equal(entry.surfaces.assistant, true);
    assert.equal(entry.surfaces.dedicatedApp, true);
    assert.equal(entry.surfaces.compare, true);
  }
});

test('secenekler surface matches current listing browse gate', () => {
  const seceneklerById = Object.fromEntries(
    VERTICAL_REGISTRY.map((entry) => [entry.id, entry.surfaces.secenekler])
  );
  assert.deepEqual(seceneklerById, {
    auto: true,
    konut: true,
    tatil: true,
    finans: false,
    sigorta: false,
    kasko: false
  });
});

test('lookup helpers resolve canonical and alias keys', () => {
  assert.equal(getVerticalById('auto')?.id, 'auto');
  assert.equal(getVerticalBySlug('finans')?.id, 'finans');
  assert.equal(getVerticalByAssistantKey('arac')?.id, 'auto');
  assert.equal(getVerticalByAssistantKey('ev')?.id, 'konut');
  assert.equal(getVerticalByHomeKey('araba')?.id, 'auto');
  assert.equal(getVerticalByHomeKey('finansman')?.id, 'finans');
  assert.equal(getVerticalById('nope'), null);
});

test('listVerticals does not leak mutable registry reference', () => {
  const listed = listVerticals();
  assert.notEqual(listed, VERTICAL_REGISTRY);
  assert.deepEqual(
    listed.map((entry) => entry.id),
    VERTICAL_REGISTRY.map((entry) => entry.id)
  );
  assert.throws(() => {
    listed.push({});
  });
});

test('registry entries are deeply frozen', () => {
  const entry = getVerticalById('auto');
  assert.throws(() => {
    entry.displayName = 'changed';
  });
  assert.throws(() => {
    entry.surfaces.assistant = false;
  });
  assert.throws(() => {
    entry.aliases.push('hack');
  });
});
