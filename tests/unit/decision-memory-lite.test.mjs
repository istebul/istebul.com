import test from 'node:test';
import assert from 'node:assert/strict';

const {
  normalizeDecisionHistory,
  calculateDecisionProfile,
  generateDecisionTrend,
  generateMemoryInsights,
  saveDecisionSnapshot,
  loadDecisionHistory,
  buildDecisionMemoryLite,
  HISTORY_STORAGE_KEY,
  MAX_HISTORY_ENTRIES
} = await import('../../js/decision/decision-memory-lite.js');

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

function sampleSnapshot(overrides = {}) {
  return {
    createdAt: new Date().toISOString(),
    vertical: 'auto',
    decisionScore: 72,
    confidenceScore: 68,
    riskScore: 38,
    decisionQualityScore: 70,
    totalCost: 850_000,
    badges: ['budget-fit'],
    ...overrides
  };
}

test('empty history returns unknown trend', () => {
  const trend = generateDecisionTrend([]);
  assert.equal(trend.direction, 'unknown');
  assert.match(trend.explanation, /yeterli analiz geçmişi yok/i);
});

test('last 20 record limit is preserved', () => {
  const storage = createMemoryStorage();

  for (let i = 0; i < 25; i += 1) {
    saveDecisionSnapshot(
      sampleSnapshot({
        createdAt: new Date(Date.now() - i * 1000).toISOString(),
        decisionScore: 50 + (i % 10)
      }),
      storage
    );
  }

  const history = loadDecisionHistory(storage);
  assert.equal(history.length, MAX_HISTORY_ENTRIES);
});

test('profile scores stay within 0-100 range', () => {
  const history = normalizeDecisionHistory([
    sampleSnapshot({ decisionScore: 120, confidenceScore: -5, riskScore: 999 }),
    sampleSnapshot({ vertical: 'finansman', decisionScore: 0, confidenceScore: 0, riskScore: 0 })
  ]);

  const profile = calculateDecisionProfile(history);
  for (const value of Object.values(profile)) {
    assert.ok(value >= 0 && value <= 100, `Expected 0-100, got ${value}`);
  }
});

test('high risk history increases riskPreference', () => {
  const lowRiskHistory = normalizeDecisionHistory([
    sampleSnapshot({ riskScore: 20, decisionScore: 80 }),
    sampleSnapshot({ riskScore: 25, decisionScore: 78 })
  ]);
  const highRiskHistory = normalizeDecisionHistory([
    sampleSnapshot({ riskScore: 85, decisionScore: 55 }),
    sampleSnapshot({ riskScore: 90, decisionScore: 52 })
  ]);

  const lowProfile = calculateDecisionProfile(lowRiskHistory);
  const highProfile = calculateDecisionProfile(highRiskHistory);
  assert.ok(highProfile.riskPreference > lowProfile.riskPreference);
});

test('finance-heavy history increases financeSensitivity', () => {
  const mixedHistory = normalizeDecisionHistory([
    sampleSnapshot({ vertical: 'auto', riskScore: 40 }),
    sampleSnapshot({ vertical: 'konut', riskScore: 42 })
  ]);
  const financeHistory = normalizeDecisionHistory([
    sampleSnapshot({ vertical: 'finansman', riskScore: 72, decisionQualityScore: 68 }),
    sampleSnapshot({ vertical: 'finansman', riskScore: 78, decisionQualityScore: 70 }),
    sampleSnapshot({ vertical: 'finansman', riskScore: 75, decisionQualityScore: 69 })
  ]);

  const mixedProfile = calculateDecisionProfile(mixedHistory);
  const financeProfile = calculateDecisionProfile(financeHistory);
  assert.ok(financeProfile.financeSensitivity > mixedProfile.financeSensitivity);
});

test('buildDecisionMemoryLite returns expected schema', () => {
  const storage = createMemoryStorage();
  const memory = buildDecisionMemoryLite(sampleSnapshot({ vertical: 'konut' }), { storage });

  assert.equal(memory.version, 'memory-lite-v1');
  assert.ok(memory.profile);
  assert.equal(typeof memory.profile.riskPreference, 'number');
  assert.equal(typeof memory.profile.budgetDiscipline, 'number');
  assert.equal(typeof memory.profile.comfortPriority, 'number');
  assert.equal(typeof memory.profile.investmentFocus, 'number');
  assert.equal(typeof memory.profile.financeSensitivity, 'number');
  assert.ok(['improving', 'stable', 'declining', 'unknown'].includes(memory.trend.direction));
  assert.ok(Array.isArray(memory.insights));
  assert.ok(memory.insights.length >= 1);
  assert.equal(typeof memory.historyCount, 'number');
});

test('missing localStorage does not throw', () => {
  assert.doesNotThrow(() => {
    const history = loadDecisionHistory(null);
    assert.deepEqual(history, []);
    const memory = buildDecisionMemoryLite(sampleSnapshot(), { storage: null, persist: false });
    assert.equal(memory.version, 'memory-lite-v1');
  });
});

test('normalizeDecisionHistory sanitizes invalid entries', () => {
  const normalized = normalizeDecisionHistory([
    null,
    { vertical: 'finans', decisionScore: 66, confidenceScore: 60, riskScore: 44 },
    'broken'
  ]);

  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].vertical, 'finansman');
});

test('generateMemoryInsights returns short insight list', () => {
  const insights = generateMemoryInsights(
    normalizeDecisionHistory([
      sampleSnapshot({ vertical: 'finansman', riskScore: 80 }),
      sampleSnapshot({ vertical: 'finansman', riskScore: 82 })
    ])
  );

  assert.ok(insights.length >= 1);
  assert.ok(insights.length <= 3);
});

test('saveDecisionSnapshot writes to storage key', () => {
  const storage = createMemoryStorage();
  saveDecisionSnapshot(sampleSnapshot(), storage);
  assert.ok(storage.getItem(HISTORY_STORAGE_KEY));
});
