import { DEFAULT_OPENAI_MODEL, OPENAI_CHAT_COMPLETIONS_URL } from './types.js';

/**
 * Call OpenAI chat completions with a pre-built OpenAI-compatible payload.
 *
 * @param {{
 *   env: { OPENAI_API_KEY?: string, OPENAI_MODEL?: string },
 *   payload: Record<string, unknown>,
 *   fetchImpl?: typeof fetch
 * }} params
 * @returns {Promise<
 *   | { ok: true, content: string }
 *   | { ok: false, status: number, error: string }
 * >}
 */
export async function callOpenAiChatCompletion({ env, payload, fetchImpl = fetch }) {
  if (!env?.OPENAI_API_KEY) {
    return { ok: false, status: 500, error: 'OPENAI_API_KEY missing' };
  }

  const requestBody = {
    ...payload,
    model: env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL
  };

  try {
    const response = await fetchImpl(OPENAI_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { ok: false, status: response.status, error: 'OpenAI request failed' };
    }

    return {
      ok: true,
      content: data?.choices?.[0]?.message?.content || ''
    };
  } catch {
    return { ok: false, status: 500, error: 'OpenAI request failed' };
  }
}
