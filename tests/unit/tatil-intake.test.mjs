import test from 'node:test';
import assert from 'node:assert/strict';

const { trackVacationEvent, callVacationIntake } = await import('../../js/tatil/tatil-intake.js');

test('trackVacationEvent is fire-and-forget and does not return a blocking promise', () => {
  const storage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  };
  try {
    const result = trackVacationEvent('vacation_step_completed', { step: 'goal' });
    assert.equal(result, undefined);
  } finally {
    if (storage === undefined) {
      delete globalThis.localStorage;
    } else {
      globalThis.localStorage = storage;
    }
  }
});

test('callVacationIntake returns offline when env is missing', async () => {
  const originalEnv = globalThis.window?.__env;
  if (typeof globalThis.window === 'undefined') {
    globalThis.window = {};
  }
  globalThis.window.__env = { SUPABASE_URL: '', SUPABASE_ANON_KEY: '' };

  const res = await callVacationIntake({ type: 'event', event_type: 'vacation_page_view' });
  assert.equal(res.ok, false);
  assert.equal(res.offline, true);

  if (originalEnv !== undefined) {
    globalThis.window.__env = originalEnv;
  }
});
