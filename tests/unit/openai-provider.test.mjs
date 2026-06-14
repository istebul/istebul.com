import test from 'node:test';
import assert from 'node:assert/strict';

import { callOpenAiChatCompletion } from '../../functions/_shared/ai/openai-provider.js';
import {
  DEFAULT_OPENAI_MODEL,
  OPENAI_CHAT_COMPLETIONS_URL
} from '../../functions/_shared/ai/types.js';

test('callOpenAiChatCompletion returns missing key error without calling fetch', async () => {
  const result = await callOpenAiChatCompletion({
    env: {},
    payload: { messages: [] },
    fetchImpl: async () => {
      throw new Error('fetch should not be called');
    }
  });

  assert.deepEqual(result, { ok: false, status: 500, error: 'OPENAI_API_KEY missing' });
});

test('callOpenAiChatCompletion returns content on success', async () => {
  const payload = { messages: [{ role: 'user', content: 'Merhaba' }] };
  const fetchImpl = async (url, init) => {
    assert.equal(url, OPENAI_CHAT_COMPLETIONS_URL);
    assert.equal(init.method, 'POST');
    assert.match(init.headers.Authorization, /^Bearer test-openai-key$/);
    assert.equal(init.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(init.body), {
      ...payload,
      model: 'gpt-4.1-mini'
    });

    return new Response(JSON.stringify({
      choices: [{ message: { content: 'OpenAI yanıtı' } }]
    }), { status: 200 });
  };

  const result = await callOpenAiChatCompletion({
    env: { OPENAI_API_KEY: 'test-openai-key', OPENAI_MODEL: 'gpt-4.1-mini' },
    payload,
    fetchImpl
  });

  assert.deepEqual(result, { ok: true, content: 'OpenAI yanıtı' });
});

test('callOpenAiChatCompletion uses DEFAULT_OPENAI_MODEL when OPENAI_MODEL is unset', async () => {
  const payload = { messages: [] };
  const fetchImpl = async (_url, init) => {
    assert.deepEqual(JSON.parse(init.body), {
      ...payload,
      model: DEFAULT_OPENAI_MODEL
    });

    return new Response(JSON.stringify({
      choices: [{ message: { content: 'default model' } }]
    }), { status: 200 });
  };

  const result = await callOpenAiChatCompletion({
    env: { OPENAI_API_KEY: 'test-openai-key' },
    payload,
    fetchImpl
  });

  assert.deepEqual(result, { ok: true, content: 'default model' });
});

test('callOpenAiChatCompletion propagates non-ok provider status', async () => {
  const result = await callOpenAiChatCompletion({
    env: { OPENAI_API_KEY: 'test-openai-key' },
    payload: { messages: [] },
    fetchImpl: async () =>
      new Response(JSON.stringify({ error: { message: 'rate_limit' } }), { status: 429 })
  });

  assert.deepEqual(result, { ok: false, status: 429, error: 'OpenAI request failed' });
});

test('callOpenAiChatCompletion returns empty content when choices are missing', async () => {
  const result = await callOpenAiChatCompletion({
    env: { OPENAI_API_KEY: 'test-openai-key' },
    payload: { messages: [] },
    fetchImpl: async () => new Response(JSON.stringify({ choices: [] }), { status: 200 })
  });

  assert.deepEqual(result, { ok: true, content: '' });
});

test('callOpenAiChatCompletion does not leak secrets in error responses', async () => {
  const secretKey = 'super-secret-openai-key';
  const upstreamBody = 'upstream failure with sensitive details';

  const result = await callOpenAiChatCompletion({
    env: { OPENAI_API_KEY: secretKey },
    payload: { messages: [] },
    fetchImpl: async () => new Response(upstreamBody, { status: 502 })
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, 'OpenAI request failed');
  assert.doesNotMatch(JSON.stringify(result), /super-secret-openai-key/);
  assert.doesNotMatch(JSON.stringify(result), /upstream failure with sensitive details/);
});

test('callOpenAiChatCompletion returns generic failure on network error', async () => {
  const result = await callOpenAiChatCompletion({
    env: { OPENAI_API_KEY: 'test-openai-key' },
    payload: { messages: [] },
    fetchImpl: async () => {
      throw new Error('network offline');
    }
  });

  assert.deepEqual(result, { ok: false, status: 500, error: 'OpenAI request failed' });
  assert.doesNotMatch(JSON.stringify(result), /network offline/);
});
