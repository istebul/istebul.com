import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createUnsupportedAiProviderError,
  resolveAiProvider
} from '../../functions/_shared/ai/provider-registry.js';
import { callGroqChatCompletion } from '../../functions/_shared/ai/groq-provider.js';
import { callOpenAiChatCompletion } from '../../functions/_shared/ai/openai-provider.js';
import {
  DEFAULT_AI_PROVIDER,
  SUPPORTED_AI_PROVIDERS
} from '../../functions/_shared/ai/types.js';

test('SUPPORTED_AI_PROVIDERS includes groq and openai', () => {
  assert.deepEqual(SUPPORTED_AI_PROVIDERS, ['groq', 'openai']);
});

test('DEFAULT_AI_PROVIDER remains groq', () => {
  assert.equal(DEFAULT_AI_PROVIDER, 'groq');
});

test('resolveAiProvider defaults to groq when AI_PROVIDER is unset', () => {
  const provider = resolveAiProvider({});
  assert.equal(provider.name, 'groq');
  assert.equal(provider.callChatCompletion, callGroqChatCompletion);
});

test('resolveAiProvider defaults to groq when AI_PROVIDER is empty', () => {
  const provider = resolveAiProvider({ AI_PROVIDER: '   ' });
  assert.equal(provider.name, 'groq');
  assert.equal(provider.callChatCompletion, callGroqChatCompletion);
});

test('resolveAiProvider normalizes GROQ casing', () => {
  const provider = resolveAiProvider({ AI_PROVIDER: 'GROQ' });
  assert.equal(provider.name, 'groq');
  assert.equal(provider.callChatCompletion, callGroqChatCompletion);
});

test('resolveAiProvider resolves openai provider', () => {
  const provider = resolveAiProvider({ AI_PROVIDER: 'openai' });
  assert.equal(provider.name, 'openai');
  assert.equal(provider.callChatCompletion, callOpenAiChatCompletion);
});

test('resolveAiProvider normalizes OpenAI casing and whitespace', () => {
  const provider = resolveAiProvider({ AI_PROVIDER: ' OpenAI ' });
  assert.equal(provider.name, 'openai');
  assert.equal(provider.callChatCompletion, callOpenAiChatCompletion);
});

test('resolveAiProvider throws UNSUPPORTED_AI_PROVIDER for unknown values', () => {
  assert.throws(
    () => resolveAiProvider({ AI_PROVIDER: 'unknown' }),
    (err) => {
      assert.equal(err.code, 'UNSUPPORTED_AI_PROVIDER');
      assert.equal(err.message, 'Unsupported AI_PROVIDER: unknown');
      assert.equal(err.provider, 'unknown');
      return true;
    }
  );
});

test('createUnsupportedAiProviderError sets code and provider', () => {
  const err = createUnsupportedAiProviderError('bad');
  assert.equal(err.code, 'UNSUPPORTED_AI_PROVIDER');
  assert.equal(err.provider, 'bad');
});
