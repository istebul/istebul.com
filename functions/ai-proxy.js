const ALLOWED_ORIGINS = new Set([
  'https://istebul.com',
  'https://www.istebul.com',
  'https://istebul-com.pages.dev'
]);

const rateLimitStore = globalThis.__aiProxyRateLimit || (globalThis.__aiProxyRateLimit = new Map());
const promptCache = globalThis.__aiProxyPromptCache || (globalThis.__aiProxyPromptCache = new Map());

const AI_RATE_LIMIT_PER_MIN = 20;
const AI_MAX_OUTPUT_TOKENS = 400;
const PROMPT_CACHE_TTL_MS = 600_000;
const PROMPT_CACHE_MAX_ENTRIES = 48;

function getClientIp(request) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

const RATE_LIMIT_MAX_KEYS = 5000;

function pruneRateLimitStore(now) {
  if (rateLimitStore.size <= RATE_LIMIT_MAX_KEYS) return;
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
    if (rateLimitStore.size <= RATE_LIMIT_MAX_KEYS * 0.8) break;
  }
}

function promptCacheKey(prompt) {
  let hash = 0;
  for (let i = 0; i < prompt.length; i += 1) {
    hash = (hash * 31 + prompt.charCodeAt(i)) | 0;
  }
  return `${hash}:${prompt.length}`;
}

function readPromptCache(prompt) {
  const entry = promptCache.get(promptCacheKey(prompt));
  if (!entry || Date.now() > entry.expiresAt) {
    if (entry) promptCache.delete(promptCacheKey(prompt));
    return null;
  }
  return entry.result;
}

function writePromptCache(prompt, result) {
  if (!result) return;
  if (promptCache.size >= PROMPT_CACHE_MAX_ENTRIES) {
    const oldest = promptCache.keys().next().value;
    if (oldest) promptCache.delete(oldest);
  }
  promptCache.set(promptCacheKey(prompt), {
    result,
    expiresAt: Date.now() + PROMPT_CACHE_TTL_MS
  });
}

function checkRateLimit(key, limit = AI_RATE_LIMIT_PER_MIN, windowMs = 60_000) {
  const now = Date.now();
  pruneRateLimitStore(now);
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}

function isAllowedOrigin(origin) {
  return origin && ALLOWED_ORIGINS.has(origin);
}

function corsHeaders(origin) {
  const allowedOrigin = isAllowedOrigin(origin) ? origin : 'https://istebul.com';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-ai-proxy-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}

export async function onRequestOptions({ request, env }) {
  const origin = request.headers.get('Origin');

  if (!isAllowedOrigin(origin)) {
    return new Response(null, { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin)
  });
}

export async function onRequestPost({ request, env }) {
  try {
    const origin = request.headers.get('Origin');
    const proxyToken = request.headers.get('x-ai-proxy-token');
    const hasValidOrigin = isAllowedOrigin(origin);
    const hasValidToken = Boolean(env.AI_PROXY_TOKEN && proxyToken === env.AI_PROXY_TOKEN);

    if (!hasValidOrigin && !hasValidToken) {
      return json({ error: 'Forbidden' }, 403, origin);
    }

    const clientIp = getClientIp(request);
    if (!checkRateLimit(clientIp, AI_RATE_LIMIT_PER_MIN, 60_000)) {
      return json({ error: 'Too many requests' }, 429, origin);
    }

    if (!env.GROQ_API_KEY) {
      return json({ error: 'GROQ_API_KEY missing' }, 500, origin);
    }

    const body = await request.json().catch(() => ({}));
    const prompt = body.prompt || body.message || body.input;

    if (!prompt) {
      return json({ error: 'Prompt required' }, 400, origin);
    }

    if (typeof prompt !== 'string' || prompt.length > 3000) {
      return json({ error: 'Invalid prompt' }, 400, origin);
    }

    const cached = readPromptCache(prompt);
    if (cached) {
      return json({ result: cached, cached: true }, 200, origin);
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'Sen isteBul.com için Türkçe konuşan, net, pratik ve tarafsız bir karar asistanısın.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: AI_MAX_OUTPUT_TOKENS
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return json({ error: 'Groq request failed' }, response.status, origin);
    }

    const result = data?.choices?.[0]?.message?.content || '';
    writePromptCache(prompt, result);

    return json({ result }, 200, origin);
  } catch {
    return json({ error: 'AI proxy error' }, 500);
  }
}

function json(data, status = 200, origin = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(origin)
  });
}
