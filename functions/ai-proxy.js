const ALLOWED_ORIGIN = 'https://istebul-com.pages.dev';

export async function onRequestOptions({ request }) {
  const origin = request.headers.get('Origin');

  if (origin !== ALLOWED_ORIGIN) {
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

    if (origin !== ALLOWED_ORIGIN) {
      return json({ error: 'Forbidden origin' }, 403, origin);
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
        max_tokens: 700,
        response_format: { type: 'json_object' }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return json({
        error: 'Groq request failed',
        status: response.status,
        details: data
      }, response.status, origin);
    }

    return json({
      result: data?.choices?.[0]?.message?.content || ''
    }, 200, origin);

  } catch {
    return json({ error: 'AI proxy error' }, 500);
  }
}

function json(data, status = 200, origin = ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(origin)
  });
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}
