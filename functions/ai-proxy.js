export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.GROQ_API_KEY) {
      return json({ error: 'GROQ_API_KEY missing' }, 500);
    }

    const body = await request.json().catch(() => ({}));
    const prompt = body.prompt || body.message || body.input;

    if (!prompt) {
      return json({ error: 'Prompt required' }, 400);
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
            content: 'Sen isteBul.com için Türkçe konuşan, net, pratik ve tarafsız bir karar asistanısın. Kullanıcıya kısa, uygulanabilir ve karşılaştırmalı öneriler ver.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 700
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return json({
        error: 'Groq request failed',
        status: response.status,
        message: data?.error?.message || 'Unknown Groq error',
        details: data
      }, response.status);
    }

    const result = data?.choices?.[0]?.message?.content || '';

    return json({ result });
  } catch (error) {
    return json({
      error: 'AI proxy error',
      message: error.message
    }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders()
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}
