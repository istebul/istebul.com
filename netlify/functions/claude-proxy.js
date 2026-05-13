const { createClient } = require('@supabase/supabase-js');
const { checkRateLimit, withRateLimitHeaders } = require('./_rate-limit');

const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://istebul-com.pages.dev';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Vary': 'Origin',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const allowedTypes = [
  'listing_description',
  'pricing_advice',
  'customer_support'
];

const json = (statusCode, body) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body)
});

const getSupabaseAdmin = () => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase service is not configured');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
};

const getBearerToken = (headers = {}) => {
  const authHeader = headers.authorization || headers.Authorization || '';
  return authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;
};

const getSystemMessage = (type) => {
  const messages = {
    listing_description:
      'You are helping create compelling listing descriptions for a Turkish marketplace. Make descriptions engaging, informative, and optimized for search. Keep them concise but detailed.',
    pricing_advice:
      'You are providing pricing advice for items on a Turkish marketplace. Consider market conditions, item condition, demand, and local economic factors.',
    customer_support:
      'You are a customer support AI for isteBu marketplace. Be helpful, polite, and solve user problems efficiently. Respond in Turkish when appropriate.'
  };

  return messages[type] ||
    'You are a helpful AI assistant for a Turkish marketplace platform called "isteBu". Help users with questions about buying, selling, and marketplace activities. Respond in Turkish when appropriate.';
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const limit = checkRateLimit(event, {
    scope: 'claude-proxy',
    windowMs: 60 * 1000,
    max: Number(process.env.CLAUDE_RATE_LIMIT_PER_MINUTE || 10)
  });

  if (limit.limited) {
    return withRateLimitHeaders(
      json(429, { error: 'Too many requests' }),
      limit
    );
  }

  try {
    const token = getBearerToken(event.headers);

    if (!token) {
      return json(401, { error: 'Authorization required' });
    }

    const supabase = getSupabaseAdmin();

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return json(401, { error: 'Invalid token' });
    }

    let payload = {};

    try {
      payload = JSON.parse(event.body || '{}');
    } catch {
      return withRateLimitHeaders(
        json(400, { error: 'Invalid JSON body' }),
        limit
      );
    }

    const { prompt, context = {} } = payload;
    const safeType = allowedTypes.includes(context.type)
      ? context.type
      : null;

    const cleanPrompt = typeof prompt === 'string'
      ? prompt.trim().slice(0, 4000)
      : '';

    if (!cleanPrompt) {
      return json(400, { error: 'Prompt is required' });
    }

    const apiKey = process.env.CLAUDE_API_KEY;

    if (!apiKey) {
      return json(500, { error: 'AI service not configured' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let response;

    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          system: getSystemMessage(safeType),
          messages: [{ role: 'user', content: cleanPrompt }],
          temperature: 0.7
        })
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      return json(502, { error: 'AI service error' });
    }

    const data = await response.json();

    return withRateLimitHeaders(
      json(200, {
        success: true,
        response: data.content?.[0]?.text || 'Üzgünüm, yanıt oluşturulamadı.',
        usage: data.usage
      }),
      limit
    );
  } catch (error) {
    if (error.name === 'AbortError') {
      return json(504, { error: 'AI service timeout' });
    }

    console.error('Function error:', error);
    return json(500, { error: 'Internal server error' });
  }
};