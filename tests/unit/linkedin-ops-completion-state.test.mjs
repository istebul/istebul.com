import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  LINKEDIN_OPS_COMPLETION_STORAGE_KEY,
  LINKEDIN_OPS_COMPLETION_STATE_VERSION,
  buildLinkedInOpsTaskId,
  createEmptyLinkedInOpsCompletionState,
  readLinkedInOpsCompletionState,
  writeLinkedInOpsCompletionState,
  markLinkedInOpsTaskCompleted,
  isLinkedInOpsTaskCompleted,
  clearLinkedInOpsCompletionState,
  pruneLinkedInOpsCompletionEntries
} from '../../js/features/ops/linkedin-ops-completion-state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '../..');

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

describe('linkedin-ops-completion-state', () => {
  it('storage key is stable and in expected namespace', () => {
    assert.equal(LINKEDIN_OPS_COMPLETION_STORAGE_KEY, 'istebul:admin:linkedin-ops:completion:v1');
    assert.match(LINKEDIN_OPS_COMPLETION_STORAGE_KEY, /^istebul:admin:linkedin-ops:/);
  });

  it('createEmptyLinkedInOpsCompletionState returns default state', () => {
    const state = createEmptyLinkedInOpsCompletionState();
    assert.equal(state.v, LINKEDIN_OPS_COMPLETION_STATE_VERSION);
    assert.equal(state.planVersion, 'p16.0');
    assert.equal(state.timezone, 'Europe/Istanbul');
    assert.deepEqual(state.entries, {});
  });

  it('buildLinkedInOpsTaskId produces deterministic id', () => {
    const taskId = buildLinkedInOpsTaskId('slot-tuesday-company-methodology', '2026-06-17');
    assert.equal(taskId, 'slot-tuesday-company-methodology:2026-06-17');
    assert.equal(buildLinkedInOpsTaskId('slot-tuesday-company-methodology', '2026-06-17'), taskId);
  });

  it('buildLinkedInOpsTaskId returns null for empty slotId', () => {
    assert.equal(buildLinkedInOpsTaskId('', '2026-06-17'), null);
    assert.equal(buildLinkedInOpsTaskId(null, '2026-06-17'), null);
    assert.equal(buildLinkedInOpsTaskId('   ', '2026-06-17'), null);
  });

  it('buildLinkedInOpsTaskId rejects non-YYYY-MM-DD isoDate', () => {
    assert.equal(buildLinkedInOpsTaskId('slot-a', '2026-6-17'), null);
    assert.equal(buildLinkedInOpsTaskId('slot-a', '06-17-2026'), null);
    assert.equal(buildLinkedInOpsTaskId('slot-a', '2026/06/17'), null);
    assert.equal(buildLinkedInOpsTaskId('slot-a', ''), null);
  });

  it('readLinkedInOpsCompletionState returns empty state when storage is empty', () => {
    const storage = createMemoryStorage();
    const state = readLinkedInOpsCompletionState(storage);
    assert.equal(state.v, LINKEDIN_OPS_COMPLETION_STATE_VERSION);
    assert.equal(state.planVersion, 'p16.0');
    assert.deepEqual(state.entries, {});
  });

  it('readLinkedInOpsCompletionState reads valid JSON state', () => {
    const storage = createMemoryStorage();
    const stored = {
      v: LINKEDIN_OPS_COMPLETION_STATE_VERSION,
      planVersion: 'p16.0',
      timezone: 'Europe/Istanbul',
      entries: {
        'slot-tuesday-company-methodology:2026-06-17': {
          completedAt: '2026-06-17T07:30:00.000Z',
          slotId: 'slot-tuesday-company-methodology'
        }
      }
    };
    storage.setItem(LINKEDIN_OPS_COMPLETION_STORAGE_KEY, JSON.stringify(stored));

    const state = readLinkedInOpsCompletionState(storage);
    assert.equal(state.planVersion, 'p16.0');
    assert.equal(state.timezone, 'Europe/Istanbul');
    assert.deepEqual(state.entries, stored.entries);
  });

  it('readLinkedInOpsCompletionState returns empty state for corrupted JSON', () => {
    const storage = createMemoryStorage();
    storage.setItem(LINKEDIN_OPS_COMPLETION_STORAGE_KEY, '{not-json');

    const state = readLinkedInOpsCompletionState(storage);
    assert.equal(state.v, LINKEDIN_OPS_COMPLETION_STATE_VERSION);
    assert.deepEqual(state.entries, {});
  });

  it('readLinkedInOpsCompletionState returns empty state for version mismatch', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      LINKEDIN_OPS_COMPLETION_STORAGE_KEY,
      JSON.stringify({
        v: 99,
        planVersion: 'p16.0',
        timezone: 'Europe/Istanbul',
        entries: { 'slot-a:2026-06-17': { completedAt: '2026-06-17T07:30:00.000Z', slotId: 'slot-a' } }
      })
    );

    const state = readLinkedInOpsCompletionState(storage);
    assert.deepEqual(state.entries, {});
  });

  it('readLinkedInOpsCompletionState returns empty state for planVersion mismatch', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      LINKEDIN_OPS_COMPLETION_STORAGE_KEY,
      JSON.stringify({
        v: LINKEDIN_OPS_COMPLETION_STATE_VERSION,
        planVersion: 'p15.0',
        timezone: 'Europe/Istanbul',
        entries: { 'slot-a:2026-06-17': { completedAt: '2026-06-17T07:30:00.000Z', slotId: 'slot-a' } }
      })
    );

    const state = readLinkedInOpsCompletionState(storage, { planVersion: 'p16.0' });
    assert.deepEqual(state.entries, {});
  });

  it('markLinkedInOpsTaskCompleted writes completedAt and slotId into entries', () => {
    const storage = createMemoryStorage();
    const completedAt = '2026-06-17T07:30:00.000Z';

    const state = markLinkedInOpsTaskCompleted(
      storage,
      { slotId: 'slot-tuesday-company-methodology', isoDate: '2026-06-17' },
      { completedAt }
    );

    const taskId = 'slot-tuesday-company-methodology:2026-06-17';
    assert.deepEqual(state.entries[taskId], {
      completedAt,
      slotId: 'slot-tuesday-company-methodology'
    });

    const persisted = readLinkedInOpsCompletionState(storage);
    assert.deepEqual(persisted.entries[taskId], state.entries[taskId]);
  });

  it('isLinkedInOpsTaskCompleted returns true/false correctly', () => {
    const state = createEmptyLinkedInOpsCompletionState();
    const taskId = 'slot-tuesday-company-methodology:2026-06-17';

    assert.equal(isLinkedInOpsTaskCompleted(state, taskId), false);

    state.entries[taskId] = {
      completedAt: '2026-06-17T07:30:00.000Z',
      slotId: 'slot-tuesday-company-methodology'
    };

    assert.equal(isLinkedInOpsTaskCompleted(state, taskId), true);
    assert.equal(isLinkedInOpsTaskCompleted(state, 'missing:2026-06-17'), false);
  });

  it('clearLinkedInOpsCompletionState removes storage key', () => {
    const storage = createMemoryStorage();
    writeLinkedInOpsCompletionState(storage, createEmptyLinkedInOpsCompletionState());
    assert.ok(storage.getItem(LINKEDIN_OPS_COMPLETION_STORAGE_KEY));

    clearLinkedInOpsCompletionState(storage);
    assert.equal(storage.getItem(LINKEDIN_OPS_COMPLETION_STORAGE_KEY), null);
  });

  it('pruneLinkedInOpsCompletionEntries keeps only allowedTaskIds', () => {
    const state = {
      v: LINKEDIN_OPS_COMPLETION_STATE_VERSION,
      planVersion: 'p16.0',
      timezone: 'Europe/Istanbul',
      entries: {
        'slot-a:2026-06-17': { completedAt: '2026-06-17T07:30:00.000Z', slotId: 'slot-a' },
        'slot-b:2026-06-18': { completedAt: '2026-06-18T07:30:00.000Z', slotId: 'slot-b' },
        'slot-c:2026-06-19': { completedAt: '2026-06-19T07:30:00.000Z', slotId: 'slot-c' }
      }
    };

    const pruned = pruneLinkedInOpsCompletionEntries(state, {
      allowedTaskIds: ['slot-a:2026-06-17', 'slot-c:2026-06-19']
    });

    assert.deepEqual(Object.keys(pruned.entries).sort(), ['slot-a:2026-06-17', 'slot-c:2026-06-19']);
    assert.ok(!pruned.entries['slot-b:2026-06-18']);
    assert.deepEqual(state.entries['slot-b:2026-06-18'], {
      completedAt: '2026-06-18T07:30:00.000Z',
      slotId: 'slot-b'
    });
  });

  it('utility source has no forbidden runtime patterns', () => {
    const source = readFileSync(
      join(rootDir, 'js/features/ops/linkedin-ops-completion-state.js'),
      'utf8'
    );
    const forbidden = [
      'fetch(',
      'localStorage',
      'fetchOpsJson',
      'postAiProxy',
      'openai',
      'groq',
      'supabase',
      'linkedin.com',
      'navigator.clipboard',
      'document.',
      'window.'
    ];
    for (const pattern of forbidden) {
      assert.ok(!source.includes(pattern), `forbidden pattern found: ${pattern}`);
    }
  });
});
