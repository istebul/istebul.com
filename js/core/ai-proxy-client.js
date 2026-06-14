const DEFAULT_AI_PROXY_ENDPOINT = '/ai-proxy';

/**
 * Transport-only POST to same-origin /ai-proxy. Does not parse narration text.
 *
 * @param {{
 *   prompt: string,
 *   format?: string,
 *   context?: Record<string, unknown>,
 *   signal?: AbortSignal,
 *   timeoutMs?: number,
 *   headers?: Record<string, string>,
 *   endpoint?: string,
 *   fetchImpl?: typeof fetch
 * }} [options]
 * @returns {Promise<
 *   | { ok: true, status: number, data: Record<string, unknown> }
 *   | { ok: false, status: number, error: string, data?: Record<string, unknown> }
 * >}
 */
export async function postAiProxy(options = {}) {
  const {
    prompt,
    format,
    context,
    signal: externalSignal,
    timeoutMs,
    headers = {},
    endpoint = DEFAULT_AI_PROXY_ENDPOINT,
    fetchImpl = fetch
  } = options;

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return { ok: false, status: 0, error: 'prompt_required' };
  }

  const body = { prompt };
  if (format) body.format = format;
  if (context) body.context = context;

  let signal = externalSignal;
  let timeoutId = null;
  let timeoutController = null;

  if (timeoutMs && !externalSignal) {
    timeoutController = new AbortController();
    signal = timeoutController.signal;
    timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
  }

  try {
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(body),
      signal
    });

    if (timeoutId) clearTimeout(timeoutId);

    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: typeof data?.error === 'string' ? data.error : `http_${res.status}`,
        data
      };
    }

    return { ok: true, status: res.status, data };
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    const isAbort = err?.name === 'AbortError';
    return {
      ok: false,
      status: 0,
      error: isAbort ? 'aborted' : (err instanceof Error ? err.message : 'network_error')
    };
  }
}
