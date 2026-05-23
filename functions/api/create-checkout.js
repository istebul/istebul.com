const getSiteUrl = (context) => (context.env.SITE_URL || 'https://istebul.com').replace(/\/$/, '');

const allowedOrigins = [
  'https://istebul.com',
  'https://www.istebul.com',
  'https://istebul-com.pages.dev'
];

const corsHeaders = (origin = null) => ({
  'Access-Control-Allow-Origin': allowedOrigins.includes(origin || '')
    ? origin
    : 'https://istebul.com',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
});

const json = (body, status = 200, origin = null) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });

const getBearerToken = (request) => {
  const authHeader = request.headers.get('Authorization') || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
};

const getAuthenticatedUser = async (context, token) => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = context.env;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase auth is not configured');
  }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY
    }
  });

  if (!res.ok) return null;

  return res.json();
};

export async function onRequestPost(context) {
  const origin = context.request.headers.get('Origin');

  if (origin && !allowedOrigins.includes(origin)) {
    return json({ error: 'Forbidden' }, 403, origin);
  }

  try {
    const STRIPE_SECRET_KEY = context.env.STRIPE_SECRET_KEY;
    const STRIPE_PRICE_ID = context.env.STRIPE_PRICE_ID;

    if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID) {
      return json({ error: 'Stripe not configured' }, 500, origin);
    }

    const token = getBearerToken(context.request);

    if (!token) {
      return json({ error: 'Authorization required' }, 401, origin);
    }

    const user = await getAuthenticatedUser(context, token);

    if (!user?.id || !user?.email) {
      return json({ error: 'Invalid token' }, 401, origin);
    }

    const { SUPABASE_SERVICE_ROLE_KEY } = context.env;

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: 'Subscription validation unavailable' }, 500, origin);
    }

    const subRes = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${user.id}&status=in.(active,trialing,past_due)&select=id`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    if (subRes.ok) {
      const existing = await subRes.json();
      if (Array.isArray(existing) && existing.length) {
        return json({ error: 'Active subscription already exists' }, 409, origin);
      }
    }

    const params = new URLSearchParams({
      'payment_method_types[]': 'card',
      'line_items[0][price]': STRIPE_PRICE_ID,
      'line_items[0][quantity]': '1',
      mode: 'subscription',
      success_url: `${getSiteUrl(context)}/profil?subscribed=true`,
      cancel_url: `${getSiteUrl(context)}/profil?cancelled=true`,
      customer_email: user.email,
      'metadata[userId]': user.id,
      'subscription_data[metadata][userId]': user.id
    });

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': `checkout-${user.id}-${crypto.randomUUID()}`
      },
      body: params.toString()
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Stripe error:', data);
      return json({ error: 'Checkout could not be created' }, 502, origin);
    }

    return json({ url: data.url }, 200, origin);
  } catch (err) {
    console.error('create-checkout error:', err);
    return json({ error: 'Internal server error' }, 500, origin);
  }
}

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(context.request.headers.get('Origin'))
  });
}