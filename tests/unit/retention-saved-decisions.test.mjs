import test from 'node:test';
import assert from 'node:assert/strict';

const { saveDecisionSnapshot, listSavedDecisions } = await import(
  '../../js/features/growth/retention-saved-decisions.js'
);
const { analytics } = await import('../../js/core/analytics.js');
const { STORAGE_KEYS } = await import('../../js/core/storage-keys.js');

const SAVED_KEY = 'istebul_saved_decisions';
const MAX_SAVED = 24;

function createMemoryStorage() {
  /** @type {Record<string, string>} */
  const store = {};
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    }
  };
}

function withLocalStorage(storage, fn) {
  const previous = globalThis.localStorage;
  globalThis.localStorage = storage;
  try {
    return fn();
  } finally {
    globalThis.localStorage = previous;
  }
}

function sampleSnapshot(overrides = {}) {
  return {
    id: 'dec_test_1',
    categoryId: 'auto',
    topVehicle: 'Toyota Corolla 1.6',
    score: 82,
    summary: 'Test summary',
    revisitPath: '/auto/#analiz',
    source: 'auto_results',
    ...overrides
  };
}

test('saveDecisionSnapshot persists passive metadata fields', () => {
  const storage = createMemoryStorage();

  withLocalStorage(storage, () => {
    const entry = saveDecisionSnapshot(
      sampleSnapshot({
        passive: true,
        tracked: false,
        intent: 'auto_results_view',
        source: 'auto_results_passive'
      })
    );

    assert.ok(entry);
    assert.equal(entry.passive, true);
    assert.equal(entry.tracked, false);
    assert.equal(entry.intent, 'auto_results_view');
    assert.equal(entry.source, 'auto_results_passive');

    const [stored] = listSavedDecisions();
    assert.equal(stored.passive, true);
    assert.equal(stored.tracked, false);
    assert.equal(stored.intent, 'auto_results_view');
  });
});

test('saveDecisionSnapshot remains backward compatible without passive metadata', () => {
  const storage = createMemoryStorage();

  withLocalStorage(storage, () => {
    const entry = saveDecisionSnapshot(sampleSnapshot());

    assert.ok(entry);
    assert.equal(entry.id, 'dec_test_1');
    assert.equal(entry.categoryId, 'auto');
    assert.equal(entry.topVehicle, 'Toyota Corolla 1.6');
    assert.equal(entry.passive, undefined);
    assert.equal(entry.tracked, undefined);
    assert.equal(entry.intent, undefined);
    assert.equal(entry.source, 'auto_results');
  });
});

test('saveDecisionSnapshot keeps retention_decision_saved analytics event name', () => {
  const storage = createMemoryStorage();
  storage.setItem(STORAGE_KEYS.COOKIE_CONSENT, 'accepted');
  const tracked = [];

  const originalTrack = analytics.track.bind(analytics);
  analytics.track = async (eventName, properties = {}, meta = {}) => {
    tracked.push({ eventName, properties, meta });
    return originalTrack(eventName, properties, meta);
  };

  try {
    withLocalStorage(storage, () => {
      saveDecisionSnapshot(
        sampleSnapshot({
          passive: true,
          tracked: false,
          intent: 'auto_results_view',
          source: 'auto_results_passive'
        })
      );
    });

    const savedEvent = tracked.find((entry) => entry.eventName === 'retention_decision_saved');
    assert.ok(savedEvent);
    assert.equal(savedEvent.eventName, 'retention_decision_saved');
    assert.equal(savedEvent.properties.is_passive, true);
    assert.equal(savedEvent.properties.decision_id, 'dec_test_1');
  } finally {
    analytics.track = originalTrack;
  }
});

test('saveDecisionSnapshot corrupt JSON returns empty list safely', () => {
  const storage = createMemoryStorage();
  storage.setItem(SAVED_KEY, '{not-json');

  withLocalStorage(storage, () => {
    assert.deepEqual(listSavedDecisions(), []);

    const entry = saveDecisionSnapshot(sampleSnapshot({ id: 'dec_after_corrupt' }));
    assert.ok(entry);
    assert.equal(listSavedDecisions().length, 1);
    assert.equal(listSavedDecisions()[0].id, 'dec_after_corrupt');
  });
});

test('saveDecisionSnapshot enforces 24 record limit', () => {
  const storage = createMemoryStorage();

  withLocalStorage(storage, () => {
    for (let i = 0; i < 26; i += 1) {
      saveDecisionSnapshot(
        sampleSnapshot({
          id: `dec_limit_${i}`,
          topVehicle: `Vehicle ${i}`
        })
      );
    }

    const list = listSavedDecisions();
    assert.equal(list.length, MAX_SAVED);
    assert.equal(list[0].id, 'dec_limit_25');
    assert.equal(list[MAX_SAVED - 1].id, 'dec_limit_2');
  });
});
