import test from 'node:test';
import assert from 'node:assert/strict';

const {
  buildAutoTrackedSnapshot,
  buildAutoTrackedSnapshotId,
  TRACKED_DECISION_SCHEMA_VERSION
} = await import('../../js/features/karar-nabzi/karar-nabzi-snapshot.js');

const {
  saveTrackedDecision,
  listTrackedDecisions,
  isTrackedDecision,
  removeTrackedDecision,
  KARAR_NABZI_STORAGE_KEY,
  MAX_TRACKED_DECISIONS
} = await import('../../js/features/karar-nabzi/karar-nabzi-store.js');

const { isKararNabziEnabled } = await import('../../js/features/karar-nabzi/karar-nabzi-flags.js');

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

function sampleAutoModel(overrides = {}) {
  return {
    decisionScore: 82,
    confidenceScore: 76,
    riskLevel: 'Orta',
    recommendationLevel: 'proceed_with_caution',
    recommendationLabel: 'Dikkatli ilerle',
    totalCostLabel: '₺420.000',
    costHint: 'Bütçe ₺500.000 · 12 ay TCO',
    usage: 'city',
    scoreFactors: [{ label: 'Bütçe uyumu', impact: '+8' }],
    riskAnalysis: [{ title: 'TCO baskısı', level: 'orta' }],
    recommendation: {
      decisionScore: 82,
      confidenceScore: 76,
      recommendationLabel: 'Dikkatli ilerle',
      vehicle: { name: 'Toyota Corolla 1.6' }
    },
    ...overrides
  };
}

function sampleFormData() {
  return { budget: 500_000, usage: 'city', km: 15000 };
}

function sampleTopResult() {
  return {
    name: 'Toyota Corolla 1.6',
    costs: { ownership: { totals: { months12: 420_000 } } }
  };
}

test('buildAutoTrackedSnapshot produces canonical auto snapshot', () => {
  const snapshot = buildAutoTrackedSnapshot(
    sampleAutoModel(),
    sampleFormData(),
    sampleTopResult(),
    { id: 'kn_auto_test', trackedAt: '2026-06-22T10:00:00.000Z' }
  );

  assert.equal(snapshot.schemaVersion, TRACKED_DECISION_SCHEMA_VERSION);
  assert.equal(snapshot.tracked, true);
  assert.equal(snapshot.categoryId, 'auto');
  assert.equal(snapshot.source, 'auto_results_v2');
  assert.equal(snapshot.trackedAt, '2026-06-22T10:00:00.000Z');
  assert.equal(snapshot.title, 'Toyota Corolla 1.6');
  assert.equal(snapshot.decisionScore, 82);
  assert.equal(snapshot.confidenceScore, 76);
  assert.equal(snapshot.overallRisk, 'Orta');
  assert.equal(snapshot.recommendationLabel, 'Dikkatli ilerle');
  assert.deepEqual(snapshot.rawInputs, sampleFormData());
  assert.equal(snapshot.primaryEntityId, 'Toyota Corolla 1.6');
  assert.equal(snapshot.primaryMetric.formatted, '₺420.000');
  assert.equal(snapshot.signalDigest.scoreFactors.length, 1);
  assert.equal(snapshot.revisitPath, '/auto/#analiz');
  assert.equal(snapshot.executiveSummary, undefined);
  assert.equal(snapshot.insight, undefined);
});

test('buildAutoTrackedSnapshot falls back when fields are missing', () => {
  const snapshot = buildAutoTrackedSnapshot({}, {}, null, { id: 'kn_auto_min' });

  assert.equal(snapshot.categoryId, 'auto');
  assert.equal(snapshot.title, 'Araç önerisi');
  assert.equal(snapshot.decisionScore, 0);
  assert.equal(snapshot.confidenceScore, 0);
  assert.equal(snapshot.overallRisk, 'Orta');
  assert.equal(snapshot.subtitle, 'Auto karar analizi özeti');
  assert.equal(snapshot.primaryMetric.formatted, '—');
  assert.deepEqual(snapshot.rawInputs, {});
  assert.deepEqual(snapshot.signalDigest.scoreFactors, []);
  assert.deepEqual(snapshot.signalDigest.riskItems, []);
});

test('saveTrackedDecision and listTrackedDecisions roundtrip', () => {
  const storage = createMemoryStorage();
  const snapshot = buildAutoTrackedSnapshot(
    sampleAutoModel(),
    sampleFormData(),
    sampleTopResult(),
    { id: 'kn_auto_roundtrip' }
  );

  const saved = saveTrackedDecision(snapshot, storage);
  assert.ok(saved);
  assert.equal(saved.id, 'kn_auto_roundtrip');

  const list = listTrackedDecisions(storage);
  assert.equal(list.length, 1);
  assert.equal(list[0].title, 'Toyota Corolla 1.6');
});

test('isTrackedDecision returns correct state', () => {
  const storage = createMemoryStorage();
  const snapshot = buildAutoTrackedSnapshot(
    sampleAutoModel(),
    sampleFormData(),
    sampleTopResult(),
    { id: 'kn_auto_tracked' }
  );

  assert.equal(isTrackedDecision('kn_auto_tracked', storage), false);
  saveTrackedDecision(snapshot, storage);
  assert.equal(isTrackedDecision('kn_auto_tracked', storage), true);
  assert.equal(isTrackedDecision('kn_auto_missing', storage), false);
});

test('corrupt localStorage JSON returns empty list safely', () => {
  const storage = createMemoryStorage();
  storage.setItem(KARAR_NABZI_STORAGE_KEY, '{not-json');

  assert.deepEqual(listTrackedDecisions(storage), []);
  assert.equal(isTrackedDecision('any', storage), false);
});

test('tracked decision limit is 24 records', () => {
  const storage = createMemoryStorage();

  for (let i = 0; i < 26; i += 1) {
    saveTrackedDecision(
      buildAutoTrackedSnapshot(
        sampleAutoModel({ recommendation: { vehicle: { name: `Araç ${i}` } } }),
        { budget: i },
        { name: `Araç ${i}` },
        { id: `kn_auto_${i}` }
      ),
      storage
    );
  }

  const list = listTrackedDecisions(storage);
  assert.equal(list.length, MAX_TRACKED_DECISIONS);
  assert.equal(list[0].id, 'kn_auto_25');
  assert.equal(list[MAX_TRACKED_DECISIONS - 1].id, 'kn_auto_2');
});

test('removeTrackedDecision removes entry', () => {
  const storage = createMemoryStorage();
  const snapshot = buildAutoTrackedSnapshot(
    sampleAutoModel(),
    sampleFormData(),
    sampleTopResult(),
    { id: 'kn_auto_remove' }
  );
  saveTrackedDecision(snapshot, storage);
  assert.equal(isTrackedDecision('kn_auto_remove', storage), true);

  assert.equal(removeTrackedDecision('kn_auto_remove', storage), true);
  assert.equal(isTrackedDecision('kn_auto_remove', storage), false);
  assert.deepEqual(listTrackedDecisions(storage), []);
});

test('buildAutoTrackedSnapshotId is stable for same inputs', () => {
  const idA = buildAutoTrackedSnapshotId(sampleTopResult(), sampleFormData());
  const idB = buildAutoTrackedSnapshotId(sampleTopResult(), sampleFormData());
  assert.equal(idA, idB);
  assert.match(idA, /^kn_auto_/);
});

test('isKararNabziEnabled respects URL param and defaults off', () => {
  const paramsOn = new URLSearchParams('karar_nabzi=1');
  const paramsOff = new URLSearchParams('karar_nabzi=0');
  const empty = new URLSearchParams();

  assert.equal(isKararNabziEnabled(paramsOn), true);
  assert.equal(isKararNabziEnabled(paramsOff), false);
  assert.equal(isKararNabziEnabled(empty), false);
});
