import { callGroqChatCompletion } from './groq-provider.js';
import { callOpenAiChatCompletion } from './openai-provider.js';
import { DEFAULT_AI_PROVIDER } from './types.js';

/**
 * @param {string} value
 */
export function createUnsupportedAiProviderError(value) {
  const error = new Error(`Unsupported AI_PROVIDER: ${value}`);
  error.code = 'UNSUPPORTED_AI_PROVIDER';
  error.provider = value;
  return error;
}

/**
 * Resolve server-side AI provider from Cloudflare env.
 *
 * @param {Record<string, string | undefined>} [env]
 * @returns {{ name: string, callChatCompletion: typeof callGroqChatCompletion }}
 */
export function resolveAiProvider(env = {}) {
  const raw = env.AI_PROVIDER;
  const normalized =
    raw == null || String(raw).trim() === ''
      ? DEFAULT_AI_PROVIDER
      : String(raw).trim().toLowerCase();

  if (normalized === 'groq') {
    return {
      name: 'groq',
      callChatCompletion: callGroqChatCompletion
    };
  }

  if (normalized === 'openai') {
    return {
      name: 'openai',
      callChatCompletion: callOpenAiChatCompletion
    };
  }

  throw createUnsupportedAiProviderError(normalized);
}
