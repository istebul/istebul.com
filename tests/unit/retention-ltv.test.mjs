import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const { handleRetentionDecisionSaved } = await import('../../js/features/growth/retention-ltv.js');
const { saveDecisionSnapshot, listSavedDecisions } = await import(
  '../../js/features/growth/retention-saved-decisions.js'
);
const { getEngagementScore } = await import('../../js/features/growth/retention-habits.js');
const {
  pickLifecycleFlowForRetention,
  lifecyclePriorityForLtv
} = await import('../../js/features/growth/retention-lifecycle-optimizer.js');
const { parseReactivationContext } = await import('../../js/features/growth/retention-reactivation.js');

const SAVED_KEY = 'istebul_saved_decisions';
const HABIT_KEY = 'istebul_retention_habit';
const SAVED_DECISION_WEIGHT = 3;

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

function sampleDecisionDetail(overrides = {}) {
  return {
    id: 'dec_habit_test',
    categoryId: 'auto',
    topVehicle: 'Toyota Corolla 1.6',
    score: 80,
    summary: 'Test summary',
    revisitPath: '/auto/#analiz',
    source: 'auto_results',
    ...overrides
  };
}

describe('P5.4 retention LTV', () => {
  it('pickLifecycleFlowForRetention prioritizes reactivation', () => {
    assert.equal(pickLifecycleFlowForRetention({ level: 'reactivation' }), 'reactivation_ltv');
  });

  it('pickLifecycleFlowForRetention uses saved decisions', () => {
    assert.equal(
      pickLifecycleFlowForRetention({ level: 'hard', savedCount: 2 }),
      'saved_decision_revisit'
    );
  });

  it('lifecyclePriorityForLtv ranks churn and inactivity', () => {
    const ranked = lifecyclePriorityForLtv({
      churnRisk: true,
      inactiveDays: 20,
      savedDecisions: 1,
      habitStreak: 3
    });
    assert.equal(ranked[0].id, 'retention_campaigns');
    assert.ok(ranked.some((f) => f.id === 'reactivation_ltv'));
  });

  it('parseReactivationContext detects winback UTMs', () => {
    const params = new URLSearchParams('utm_campaign=reactivation_ltv&utm_medium=email');
    const ctx = parseReactivationContext(params);
    assert.ok(ctx);
    assert.equal(ctx.campaign, 'reactivation_ltv');
  });

  it('retention-framework.json is p5.4', () => {
    const raw = fs.readFileSync(
      path.join(process.cwd(), 'data/growth/retention-framework.json'),
      'utf8'
    );
    const data = JSON.parse(raw);
    assert.equal(data.version, 'p5.4');
    assert.ok(data.revisitTriggers.inactiveDaysHard >= data.revisitTriggers.inactiveDaysSoft);
  });
});

describe('retention:decision-saved passive metadata split', () => {
  it('does not record saved_decision habit when passive is true', () => {
    const storage = createMemoryStorage();
    storage.setItem(HABIT_KEY, JSON.stringify({ score: 0 }));

    withLocalStorage(storage, () => {
      const before = getEngagementScore();
      handleRetentionDecisionSaved(
        sampleDecisionDetail({
          passive: true,
          tracked: false,
          intent: 'auto_results_view',
          source: 'auto_results_passive'
        })
      );
      const after = getEngagementScore();

      assert.equal(after, before);
      assert.equal(listSavedDecisions().length, 1);
      assert.equal(listSavedDecisions()[0].passive, true);
    });
  });

  it('records saved_decision habit for legacy non-passive events', () => {
    const storage = createMemoryStorage();
    storage.setItem(HABIT_KEY, JSON.stringify({ score: 0 }));

    withLocalStorage(storage, () => {
      const before = getEngagementScore();
      handleRetentionDecisionSaved(sampleDecisionDetail());
      const after = getEngagementScore();

      assert.equal(after - before, SAVED_DECISION_WEIGHT);
      assert.equal(listSavedDecisions().length, 1);
      assert.equal(listSavedDecisions()[0].passive, undefined);
    });
  });

  it('records saved_decision habit for tracked explicit save events', () => {
    const storage = createMemoryStorage();
    storage.setItem(HABIT_KEY, JSON.stringify({ score: 0 }));

    withLocalStorage(storage, () => {
      const before = getEngagementScore();
      handleRetentionDecisionSaved(
        sampleDecisionDetail({
          passive: false,
          tracked: true,
          intent: 'karar_nabzi_track',
          source: 'auto_results_v2'
        })
      );
      const after = getEngagementScore();

      assert.equal(after - before, SAVED_DECISION_WEIGHT);
      assert.equal(listSavedDecisions()[0].tracked, true);
    });
  });

  it('still calls saveDecisionSnapshot for passive events', () => {
    const storage = createMemoryStorage();

    withLocalStorage(storage, () => {
      const entry = saveDecisionSnapshot(
        sampleDecisionDetail({
          passive: true,
          tracked: false,
          intent: 'auto_results_view',
          source: 'auto_results_passive'
        })
      );

      assert.ok(entry);
      assert.equal(storage.getItem(SAVED_KEY) != null, true);
      assert.equal(listSavedDecisions()[0].id, 'dec_habit_test');
    });
  });
});
