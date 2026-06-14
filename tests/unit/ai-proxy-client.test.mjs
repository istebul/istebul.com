import test from 'node:test';
import assert from 'node:assert/strict';

import { postAiProxy } from '../../js/core/ai-proxy-client.js';

test('postAiProxy returns ok payload on 200', async () => {
  const fetchImpl = async (url, init) => {
    assert.equal(url, '/ai-proxy');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(init.body), {
      prompt: 'Merhaba',
      context: { category: 'auto-v1' }
    });
    return new Response(JSON.stringify({ result: 'metin' }), { status: 200 });
  };

  const result = await postAiProxy({
    prompt: 'Merhaba',
    context: { category: 'auto-v1' },
    fetchImpl
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.equal(result.data.result, 'metin');
});

test('postAiProxy includes format when provided', async () => {
  const fetchImpl = async (_url, init) => {
    assert.deepEqual(JSON.parse(init.body), {
      prompt: 'json prompt',
      format: 'structured_commentary'
    });
    return new Response(JSON.stringify({ result: '{}' }), { status: 200 });
  };

  const result = await postAiProxy({
    prompt: 'json prompt',
    format: 'structured_commentary',
    fetchImpl
  });

  assert.equal(result.ok, true);
});

test('postAiProxy returns soft error on non-ok response', async () => {
  const result = await postAiProxy({
    prompt: 'rate limited',
    fetchImpl: async () => new Response(JSON.stringify({ error: 'rate limited' }), { status: 429 })
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 429);
  assert.equal(result.error, 'rate limited');
  assert.equal(result.data.error, 'rate limited');
});

test('postAiProxy handles JSON parse failure as empty data', async () => {
  const result = await postAiProxy({
    prompt: 'broken json',
    fetchImpl: async () => new Response('not-json', { status: 200 })
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.deepEqual(result.data, {});
});

test('postAiProxy returns network soft error on fetch failure', async () => {
  const result = await postAiProxy({
    prompt: 'network fail',
    fetchImpl: async () => {
      throw new Error('offline');
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 0);
  assert.equal(result.error, 'offline');
});

test('postAiProxy returns aborted soft error on timeout', async () => {
  const result = await postAiProxy({
    prompt: 'slow',
    timeoutMs: 20,
    fetchImpl: (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          const err = new Error('Aborted');
          err.name = 'AbortError';
          reject(err);
        });
      })
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, 'aborted');
});

test('postAiProxy rejects empty prompt without throwing', async () => {
  const result = await postAiProxy({
    prompt: '   ',
    fetchImpl: async () => {
      throw new Error('fetch should not be called');
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, 'prompt_required');
});

test('postAiProxy respects external signal', async () => {
  const controller = new AbortController();
  controller.abort();

  const result = await postAiProxy({
    prompt: 'abort me',
    signal: controller.signal,
    fetchImpl: async (_url, init) => {
      if (init.signal?.aborted) {
        const err = new Error('Aborted');
        err.name = 'AbortError';
        throw err;
      }
      return new Response(JSON.stringify({ result: 'ok' }), { status: 200 });
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, 'aborted');
});
