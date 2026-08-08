import { isAllowedOrigin } from './_shared/cors-origins.js';
import { resolveAiProvider } from './_shared/ai/provider-registry.js';
import { DEFAULT_GROQ_MODEL, DEFAULT_OPENAI_MODEL } from './_shared/ai/types.js';

const rateLimitStore = globalThis.__aiProxyRateLimit || (globalThis.__aiProxyRateLimit = new Map());
const promptCache = globalThis.__aiProxyPromptCache || (globalThis.__aiProxyPromptCache = new Map());

const AI_RATE_LIMIT_PER_MIN = 20;
const AI_MAX_OUTPUT_TOKENS = 800;
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

function promptCacheKey(prompt, providerName) {
  let hash = 0;
  for (let i = 0; i < prompt.length; i += 1) {
    hash = (hash * 31 + prompt.charCodeAt(i)) | 0;
  }
  const prefix = prompt.slice(0, 64);
  return `${providerName}:${hash}:${prompt.length}:${prefix}`;
}

function readPromptCache(prompt, providerName) {
  const key = promptCacheKey(prompt, providerName);
  const entry = promptCache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    if (entry) promptCache.delete(key);
    return null;
  }
  return entry.result;
}

function writePromptCache(prompt, result, providerName) {
  if (!result) return;
  const key = promptCacheKey(prompt, providerName);
  if (promptCache.size >= PROMPT_CACHE_MAX_ENTRIES) {
    const oldest = promptCache.keys().next().value;
    if (oldest) promptCache.delete(oldest);
  }
  promptCache.set(key, {
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

    const body = await request.json().catch(() => ({}));
    const prompt = body.prompt || body.message || body.input;
    const structuredCommentary = body.format === 'structured_commentary';
    const warehouseCopilotNarration =
      body.format === 'warehouse_copilot_narration';
    const structured = structuredCommentary || warehouseCopilotNarration;

    if (!prompt) {
      return json({ error: 'Prompt required' }, 400, origin);
    }

    if (typeof prompt !== 'string' || prompt.length > (structured ? 6000 : 4000)) {
      return json({ error: 'Invalid prompt' }, 400, origin);
    }

    let provider;
    try {
      provider = resolveAiProvider(env);
    } catch (err) {
      if (err?.code === 'UNSUPPORTED_AI_PROVIDER') {
        return json({ error: err.message }, 500, origin);
      }
      throw err;
    }

    const cached = readPromptCache(prompt, provider.name);
    if (cached) {
      return json({ result: cached }, 200, origin);
    }

    const clientIp = getClientIp(request);
    if (!checkRateLimit(clientIp, AI_RATE_LIMIT_PER_MIN, 60_000)) {
      return json({ error: 'Too many requests' }, 429, origin);
    }

    const systemContent = warehouseCopilotNarration
      ? 'Sen WarehouseIQ depo operasyon karar anlatım asistanısın. Yalnızca geçerli JSON döndür. Kaynak veride olmayan sayı, KPI, risk, fırsat, aksiyon, neden veya sonuç uydurmazsın. Mevcut aksiyon kimliklerini değiştirmezsin. Türkçe, profesyonel, kısa ve temkinli dil kullanırsın.'
      : structuredCommentary
        ? 'Sen isteBul.com otomotiv karar analistisin. Yalnızca geçerli JSON döndür. Skor üretmezsin; fiyat, faiz, banka, sigorta teklifi veya kampanya uydurmazsın. Türkçe, profesyonel, temkinli dil.'
        : 'Sen isteBul.com için Türkçe konuşan, net, pratik ve tarafsız bir karar asistanısın.';

    const model =
      provider.name === 'openai'
        ? env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL
        : DEFAULT_GROQ_MODEL;

    const payload = {
      model,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: prompt }
      ],
      temperature: structured ? 0.25 : 0.4,
      max_tokens: structured ? 1200 : AI_MAX_OUTPUT_TOKENS
    };

    if (structured) {
      payload.response_format = { type: 'json_object' };
    }

    const completion = await provider.callChatCompletion({ env, payload });

    if (!completion.ok) {
      return json({ error: completion.error }, completion.status, origin);
    }

    writePromptCache(prompt, completion.content, provider.name);

    return json({ result: completion.content }, 200, origin);
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
