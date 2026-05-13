const ALLOWED_ORIGIN = 'https://istebul-com.pages.dev';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

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
  try {
    const STRIPE_SECRET_KEY = context.env.STRIPE_SECRET_KEY;
    const STRIPE_PRICE_ID = context.env.STRIPE_PRICE_ID;

    if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID) {
      return json({ error: 'Stripe not configured' }, 500);
    }

    const token = getBearerToken(context.request);

    if (!token) {
      return json({ error: 'Authorization required' }, 401);
    }

    const user = await getAuthenticatedUser(context, token);

    if (!user?.id || !user?.email) {
      return json({ error: 'Invalid token' }, 401);
    }

    const params = new URLSearchParams({
      'payment_method_types[]': 'card',
      'line_items[0][price]': STRIPE_PRICE_ID,
      'line_items[0][quantity]': '1',
      mode: 'subscription',
      success_url: 'https://istebul-com.pages.dev/profil?subscribed=true',
      cancel_url: 'https://istebul-com.pages.dev/profil?cancelled=true',
      customer_email: user.email,
      'metadata[userId]': user.id
    });

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Stripe error:', data);
      return json({ error: 'Checkout could not be created' }, 502);
    }

    return json({ url: data.url }, 200);
  } catch (err) {
    console.error('create-checkout error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}