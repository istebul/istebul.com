/** Default Groq model for /ai-proxy chat completions. */
export const DEFAULT_GROQ_MODEL = 'llama-3.1-8b-instant';

/** Default AI provider when AI_PROVIDER is unset or empty. */
export const DEFAULT_AI_PROVIDER = 'groq';

/** Providers registered for /ai-proxy (server-side only). */
export const SUPPORTED_AI_PROVIDERS = Object.freeze(['groq', 'openai']);

/** Groq OpenAI-compatible chat completions endpoint. */
export const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';

/** Default OpenAI model for /ai-proxy chat completions (adapter-only; not wired in AI-D1). */
export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

/** OpenAI chat completions endpoint. */
export const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * /ai-proxy HTTP success contract — narration text only; scores remain rule-based.
 * @typedef {{ result: string }} AiProxySuccessBody
 */

/** Documented field name for successful /ai-proxy responses. */
export const AI_RESULT_CONTRACT = Object.freeze({
  successField: 'result',
  description: 'Successful /ai-proxy POST returns JSON { result: string }.'
});
