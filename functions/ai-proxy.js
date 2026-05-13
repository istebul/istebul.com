export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.OPENAI_API_KEY) {
      return json({ error: 'OPENAI_API_KEY missing' }, 500);
    }

    const body = await request.json().catch(() => ({}));
    const prompt = body.prompt || body.message || body.input;

    if (!prompt) {
      return json({ error: 'Prompt required' }, 400);
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: prompt,
        temperature: 0.4
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return json({
        error: 'OpenAI request failed',
        details: data
      }, response.status);
    }

    const result =
      data.output_text ||
      data.output?.flatMap(item => item.content || [])
        ?.map(content => content.text || '')
        ?.join('')
        ?.trim() ||
      '';

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
    'Access-Control-Allow-Origin': 'https://istebul.com',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}
