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

import { recordOpsEvent } from './_shared/record-ops-event.js';
import { createClient } from '@supabase/supabase-js';

const json = (body, status = 200, origin = null) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });

const getSupabaseAdmin = (env) => {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
};

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

const userHasSubscriptionHistory = async (context, userId) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = context.env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return false;
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&select=id&limit=1`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );

  if (!res.ok) return false;

  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0;
};

export async function onRequestPost(context) {
  const origin = context.request.headers.get('Origin');

  if (origin && !allowedOrigins.includes(origin)) {
    return json({ error: 'Forbidden' }, 403, origin);
  }

  try {
    const STRIPE_SECRET_KEY = context.env.STRIPE_SECRET_KEY;
    const STRIPE_PRICE_ID = context.env.STRIPE_PRICE_ID;
    const STRIPE_PRICE_ID_ANNUAL = context.env.STRIPE_PRICE_ID_ANNUAL;
    const TRIAL_DAYS = Math.max(0, parseInt(context.env.STRIPE_TRIAL_DAYS || '7', 10) || 0);

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

    let payload = {};

    try {
      payload = await context.request.json();
    } catch {
      payload = {};
    }

    const billingInterval = payload.billingInterval === 'annual' ? 'annual' : 'monthly';
    const requestedTrial = payload.useTrial !== false;
    const priceId = billingInterval === 'annual'
      ? (STRIPE_PRICE_ID_ANNUAL || STRIPE_PRICE_ID)
      : STRIPE_PRICE_ID;

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

    const attribution = payload.attribution && typeof payload.attribution === 'object'
      ? payload.attribution
      : {};

    const hadSubscriptionBefore = await userHasSubscriptionHistory(context, user.id);
    const trialDays = requestedTrial && TRIAL_DAYS > 0 && !hadSubscriptionBefore ? TRIAL_DAYS : 0;

    const successParams = new URLSearchParams({ subscribed: 'true' });
    if (trialDays > 0) {
      successParams.set('trial', '1');
    }
    if (billingInterval === 'annual') {
      successParams.set('plan', 'annual');
    }

    const params = new URLSearchParams({
      'payment_method_types[]': 'card',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      mode: 'subscription',
      success_url: `${getSiteUrl(context)}/profil?${successParams.toString()}`,
      cancel_url: `${getSiteUrl(context)}/profil?cancelled=true`,
      customer_email: user.email,
      'metadata[userId]': user.id,
      'metadata[billingInterval]': billingInterval,
      'subscription_data[metadata][userId]': user.id,
      'subscription_data[metadata][billingInterval]': billingInterval
    });

    if (trialDays > 0) {
      params.set('subscription_data[trial_period_days]', String(trialDays));
    }

    if (attribution.utm_source) {
      params.set('metadata[utm_source]', String(attribution.utm_source).slice(0, 120));
      params.set('subscription_data[metadata][utm_source]', String(attribution.utm_source).slice(0, 120));
    }
    if (attribution.utm_medium) {
      params.set('metadata[utm_medium]', String(attribution.utm_medium).slice(0, 120));
    }
    if (attribution.utm_campaign) {
      params.set('metadata[utm_campaign]', String(attribution.utm_campaign).slice(0, 120));
      params.set('subscription_data[metadata][utm_campaign]', String(attribution.utm_campaign).slice(0, 120));
    }

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': `checkout-${user.id}-${billingInterval}-${trialDays > 0 ? 'trial' : 'paid'}-${crypto.randomUUID()}`
      },
      body: params.toString()
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Stripe error:', data);
      const supabase = getSupabaseAdmin(context.env);
      await recordOpsEvent(supabase, {
        category: 'payment',
        event_name: 'payment_checkout_failed',
        severity: 'error',
        source: 'create_checkout',
        http_status: res.status,
        properties: {
          stripe_error: data?.error?.type || 'stripe_error',
          billing_interval: billingInterval
        }
      });
      return json({ error: 'Checkout could not be created' }, 502, origin);
    }

    return json({
      url: data.url,
      trialApplied: trialDays > 0,
      billingInterval
    }, 200, origin);
  } catch (err) {
    console.error('create-checkout error:', err);
    const supabase = getSupabaseAdmin(context.env);
    await recordOpsEvent(supabase, {
      category: 'payment',
      event_name: 'payment_checkout_failed',
      severity: 'critical',
      source: 'create_checkout',
      properties: { message: err.message || 'internal_error' }
    });
    return json({ error: 'Internal server error' }, 500, origin);
  }
}

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(context.request.headers.get('Origin'))
  });
}
