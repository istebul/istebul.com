import test from 'node:test';
import assert from 'node:assert/strict';

import { supabase } from '../../js/core/supabase.js';

global.window = global.window || { __env: {} };
global.document = global.document || { addEventListener: () => {} };

const { API } = await import('../../js/core/api.js');

function withFetchMock(fetchImpl, fn) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  return Promise.resolve(fn()).finally(() => {
    globalThis.fetch = originalFetch;
  });
}

function withSession(session, fn) {
  const originalGetSession = supabase.auth.getSession;
  supabase.auth.getSession = async () => ({ data: { session }, error: null });
  return Promise.resolve(fn()).finally(() => {
    supabase.auth.getSession = originalGetSession;
  });
}

test('API.askAI returns raw JSON body on success', async () => {
  await withFetchMock(
    async (url, init) => {
      assert.equal(url, '/ai-proxy');
      assert.equal(init.method, 'POST');
      assert.deepEqual(JSON.parse(init.body), {
        prompt: 'Karar promptu',
        context: { type: 'decision_arac', category: 'arac' }
      });
      return new Response(JSON.stringify({ result: '{"summary":"AI özeti"}' }), { status: 200 });
    },
    async () => {
      const data = await API.askAI('Karar promptu', { type: 'decision_arac', category: 'arac' });
      assert.deepEqual(data, { result: '{"summary":"AI özeti"}' });
    }
  );
});

test('API.askAI passes Authorization header when session token exists', async () => {
  await withSession(
    { access_token: 'session-token-abc' },
    async () =>
      withFetchMock(async (_url, init) => {
        assert.equal(init.headers.Authorization, 'Bearer session-token-abc');
        assert.equal(init.headers['Content-Type'], 'application/json');
        return new Response(JSON.stringify({ result: 'ok' }), { status: 200 });
      }, async () => {
        const data = await API.askAI('Auth test', { category: 'arac' });
        assert.equal(data.result, 'ok');
      })
  );
});

test('API.askAI omits Authorization when session is absent', async () => {
  await withSession(null, async () =>
    withFetchMock(async (_url, init) => {
      assert.equal(init.headers.Authorization, undefined);
      return new Response(JSON.stringify({ result: 'guest' }), { status: 200 });
    }, async () => {
      const data = await API.askAI('Guest test', { category: 'ev' });
      assert.equal(data.result, 'guest');
    })
  );
});

test('API.askAI throws HTTP error contract on non-ok proxy response', async () => {
  await withFetchMock(
    async () => new Response(JSON.stringify({ error: 'rate limited' }), { status: 429 }),
    async () => {
      await assert.rejects(
        () => API.askAI('Rate limited', { category: 'arac' }),
        (err) => {
          assert.equal(err.message, 'HTTP error! status: 429');
          return true;
        }
      );
    }
  );
});

test('API.askAI does not pass timeoutMs to postAiProxy', async () => {
  await withFetchMock(
    async (_url, init) => {
      assert.equal(init.signal, undefined);
      return new Response(JSON.stringify({ result: 'no-timeout' }), { status: 200 });
    },
    async () => {
      const data = await API.askAI('No timeout', { category: 'tatil' });
      assert.equal(data.result, 'no-timeout');
    }
  );
});
