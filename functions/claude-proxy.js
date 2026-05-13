const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Vary': 'Origin',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const allowedTypes = [
  'listing_description',
  'pricing_advice',
  'customer_support',
  'decision_vehicle'
];

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });

const getSystemMessage = (type) => {
  const messages = {
    listing_description:
      'You are helping create compelling listing descriptions for a Turkish marketplace. Make descriptions engaging, informative, and optimized for search. Keep them concise but detailed.',
    pricing_advice:
      'You are providing pricing advice for items on a Turkish marketplace. Consider market conditions, item condition, demand, and local economic factors.',
    customer_support:
      'You are a customer support AI for isteBul. Be helpful, polite, and respond in Turkish when appropriate.',
    decision_vehicle:
      'You are an AI vehicle decision advisor for isteBul, a Turkish AI decision platform. Recommend realistic vehicle options for Turkey, explain tradeoffs clearly, and respond in Turkish. Return valid JSON when requested.'
  };

  return messages[type] ||
    'You are a helpful AI assistant for isteBul, a Turkish AI decision platform. Respond in Turkish when appropriate.';
};

export async function onRequestOptions() {
  return new Response('', {
    status: 204,
    headers: corsHeaders
  });
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    let payload = {};
    try {
      payload = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const { prompt, context: aiContext = {} } = payload;
    const safeType = allowedTypes.includes(aiContext.type) ? aiContext.type : null;
    const cleanPrompt = typeof prompt === 'string' ? prompt.trim().slice(0, 4000) : '';

    if (!cleanPrompt) {
      return json({ error: 'Prompt is required' }, 400);
    }

    const apiKey = env.CLAUDE_API_KEY;

    if (!apiKey) {
      return json({ error: 'AI service not configured' }, 500);
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: getSystemMessage(safeType),
        messages: [{ role: 'user', content: cleanPrompt }],
        temperature: 0.4
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      return json({ error: 'AI service error' }, 502);
    }

    const data = await response.json();

    return json({
      success: true,
      response: data.content?.[0]?.text || 'Üzgünüm, yanıt oluşturulamadı.',
      usage: data.usage
    });
  } catch (error) {
    console.error('Claude proxy error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}
