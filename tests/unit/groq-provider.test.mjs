import test from 'node:test';
import assert from 'node:assert/strict';

import { callGroqChatCompletion } from '../../functions/_shared/ai/groq-provider.js';
import { GROQ_CHAT_COMPLETIONS_URL } from '../../functions/_shared/ai/types.js';

test('callGroqChatCompletion returns content on success', async () => {
  const payload = { model: 'llama-3.1-8b-instant', messages: [] };
  const fetchImpl = async (url, init) => {
    assert.equal(url, GROQ_CHAT_COMPLETIONS_URL);
    assert.equal(init.method, 'POST');
    assert.match(init.headers.Authorization, /^Bearer test-key$/);
    assert.equal(init.body, JSON.stringify(payload));

    return new Response(JSON.stringify({
      choices: [{ message: { content: 'Merhaba' } }]
    }), { status: 200 });
  };

  const result = await callGroqChatCompletion({
    env: { GROQ_API_KEY: 'test-key' },
    payload,
    fetchImpl
  });

  assert.deepEqual(result, { ok: true, content: 'Merhaba' });
});

test('callGroqChatCompletion returns missing key error', async () => {
  const result = await callGroqChatCompletion({
    env: {},
    payload: { model: 'llama-3.1-8b-instant', messages: [] },
    fetchImpl: async () => {
      throw new Error('fetch should not be called');
    }
  });

  assert.deepEqual(result, { ok: false, status: 500, error: 'GROQ_API_KEY missing' });
});

test('callGroqChatCompletion propagates non-ok provider status', async () => {
  const result = await callGroqChatCompletion({
    env: { GROQ_API_KEY: 'test-key' },
    payload: { model: 'llama-3.1-8b-instant', messages: [] },
    fetchImpl: async () => new Response(JSON.stringify({ error: 'rate_limit' }), { status: 429 })
  });

  assert.deepEqual(result, { ok: false, status: 429, error: 'Groq request failed' });
});
