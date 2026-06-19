import { GROQ_CHAT_COMPLETIONS_URL } from './types.js';

/**
 * Call Groq chat completions with a pre-built OpenAI-compatible payload.
 *
 * @param {{
 *   env: { GROQ_API_KEY?: string },
 *   payload: Record<string, unknown>,
 *   fetchImpl?: typeof fetch
 * }} params
 * @returns {Promise<
 *   | { ok: true, content: string }
 *   | { ok: false, status: number, error: string }
 * >}
 */
export async function callGroqChatCompletion({ env, payload, fetchImpl = fetch }) {
  if (!env?.GROQ_API_KEY) {
    return { ok: false, status: 500, error: 'GROQ_API_KEY missing' };
  }

  const response = await fetchImpl(GROQ_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return { ok: false, status: response.status, error: 'Groq request failed' };
  }

  return {
    ok: true,
    content: data?.choices?.[0]?.message?.content || ''
  };
}
