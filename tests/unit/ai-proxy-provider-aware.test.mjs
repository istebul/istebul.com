import test from 'node:test';
import assert from 'node:assert/strict';

import { onRequestPost } from '../../functions/ai-proxy.js';
import {
  DEFAULT_GROQ_MODEL,
  GROQ_CHAT_COMPLETIONS_URL,
  OPENAI_CHAT_COMPLETIONS_URL
} from '../../functions/_shared/ai/types.js';

const ORIGIN = 'https://istebul.com';
const PROMPT = 'test prompt';

function clearAiProxyGlobals() {
  globalThis.__aiProxyPromptCache?.clear();
  globalThis.__aiProxyRateLimit?.clear();
}

function makePostRequest(body = { prompt: PROMPT }, origin = ORIGIN) {
  return new Request('https://www.istebul.com/ai-proxy', {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}

function stubFetch(handler) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  return () => {
    globalThis.fetch = original;
  };
}

test.beforeEach(() => {
  clearAiProxyGlobals();
});

test('AI_PROVIDER unset with GROQ_API_KEY calls Groq and returns result', async () => {
  const restore = stubFetch(async (url, init) => {
    assert.equal(url, GROQ_CHAT_COMPLETIONS_URL);
    assert.match(init.headers.Authorization, /^Bearer groq-key$/);
    const body = JSON.parse(init.body);
    assert.equal(body.model, DEFAULT_GROQ_MODEL);
    return new Response(JSON.stringify({
      choices: [{ message: { content: 'groq result' } }]
    }), { status: 200 });
  });

  try {
    const response = await onRequestPost({
      request: makePostRequest(),
      env: { GROQ_API_KEY: 'groq-key' }
    });
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(data, { result: 'groq result' });
  } finally {
    restore();
  }
});

test('AI_PROVIDER unset without GROQ_API_KEY returns provider missing key error', async () => {
  const restore = stubFetch(async () => {
    throw new Error('fetch should not be called');
  });

  try {
    const response = await onRequestPost({
      request: makePostRequest({ prompt: 'missing groq key prompt' }),
      env: {}
    });
    const data = await response.json();

    assert.equal(response.status, 500);
    assert.equal(data.error, 'GROQ_API_KEY missing');
  } finally {
    restore();
  }
});

test('AI_PROVIDER openai with OPENAI_API_KEY calls OpenAI and returns result', async () => {
  const restore = stubFetch(async (url, init) => {
    assert.equal(url, OPENAI_CHAT_COMPLETIONS_URL);
    assert.match(init.headers.Authorization, /^Bearer openai-key$/);
    return new Response(JSON.stringify({
      choices: [{ message: { content: 'openai result' } }]
    }), { status: 200 });
  });

  try {
    const response = await onRequestPost({
      request: makePostRequest({ prompt: 'openai success prompt' }),
      env: { AI_PROVIDER: 'openai', OPENAI_API_KEY: 'openai-key' }
    });
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(data, { result: 'openai result' });
  } finally {
    restore();
  }
});

test('AI_PROVIDER openai without OPENAI_API_KEY returns provider missing key error', async () => {
  const restore = stubFetch(async () => {
    throw new Error('fetch should not be called');
  });

  try {
    const response = await onRequestPost({
      request: makePostRequest({ prompt: 'missing openai key prompt' }),
      env: { AI_PROVIDER: 'openai', GROQ_API_KEY: 'groq-key' }
    });
    const data = await response.json();

    assert.equal(response.status, 500);
    assert.equal(data.error, 'OPENAI_API_KEY missing');
  } finally {
    restore();
  }
});

test('unsupported AI_PROVIDER preserves unsupported provider contract', async () => {
  const restore = stubFetch(async () => {
    throw new Error('fetch should not be called');
  });

  try {
    const response = await onRequestPost({
      request: makePostRequest({ prompt: 'unsupported provider prompt' }),
      env: { AI_PROVIDER: 'unknown' }
    });
    const data = await response.json();

    assert.equal(response.status, 500);
    assert.equal(data.error, 'Unsupported AI_PROVIDER: unknown');
  } finally {
    restore();
  }
});

test('same prompt uses separate cache entries per provider', async () => {
  const urls = [];
  const restore = stubFetch(async (url) => {
    urls.push(url);
    const content = url === GROQ_CHAT_COMPLETIONS_URL ? 'groq result' : 'openai result';
    return new Response(JSON.stringify({
      choices: [{ message: { content } }]
    }), { status: 200 });
  });

  try {
    const prompt = 'shared cache prompt';

    const groqResponse = await onRequestPost({
      request: makePostRequest({ prompt }),
      env: { GROQ_API_KEY: 'groq-key' }
    });
    assert.equal(groqResponse.status, 200);
    assert.deepEqual(await groqResponse.json(), { result: 'groq result' });

    const openaiResponse = await onRequestPost({
      request: makePostRequest({ prompt }),
      env: { AI_PROVIDER: 'openai', OPENAI_API_KEY: 'openai-key', GROQ_API_KEY: 'groq-key' }
    });
    assert.equal(openaiResponse.status, 200);
    assert.deepEqual(await openaiResponse.json(), { result: 'openai result' });

    assert.equal(urls.length, 2);
    assert.equal(urls[0], GROQ_CHAT_COMPLETIONS_URL);
    assert.equal(urls[1], OPENAI_CHAT_COMPLETIONS_URL);
  } finally {
    restore();
  }
});

test('success response shape is only { result: string }', async () => {
  const restore = stubFetch(async () => new Response(JSON.stringify({
    choices: [{ message: { content: 'shape check' } }]
  }), { status: 200 }));

  try {
    const response = await onRequestPost({
      request: makePostRequest({ prompt: 'response shape prompt' }),
      env: { GROQ_API_KEY: 'groq-key' }
    });
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(Object.keys(data).sort(), ['result']);
    assert.equal(typeof data.result, 'string');
  } finally {
    restore();
  }
});

test('forbidden POST without valid origin or token returns 403', async () => {
  const restore = stubFetch(async () => {
    throw new Error('fetch should not be called');
  });

  try {
    const response = await onRequestPost({
      request: makePostRequest({ prompt: 'forbidden prompt' }, 'https://evil.example'),
      env: { GROQ_API_KEY: 'groq-key' }
    });
    const data = await response.json();

    assert.equal(response.status, 403);
    assert.equal(data.error, 'Forbidden');
  } finally {
    restore();
  }
});
