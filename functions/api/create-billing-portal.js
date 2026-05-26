const getSiteUrl = (context) => (context.env.SITE_URL || 'https://istebul.com').replace(/\/$/, '');

import { isAllowedOrigin, resolveCorsOrigin } from '../_shared/cors-origins.js';

const corsHeaders = (origin = null) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(origin, 'https://istebul.com'),
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
});

import { recordOpsEvent } from './_shared/record-ops-event.js';
import { fetchStripeCustomerIdForUser } from './_shared/stripe-customer.js';
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

export async function onRequestPost(context) {
  const origin = context.request.headers.get('Origin');

  if (origin && !isAllowedOrigin(origin)) {
    return json({ error: 'Forbidden' }, 403, origin);
  }

  try {
    const STRIPE_SECRET_KEY = context.env.STRIPE_SECRET_KEY;

    if (!STRIPE_SECRET_KEY) {
      return json({ error: 'Stripe not configured' }, 500, origin);
    }

    const token = getBearerToken(context.request);

    if (!token) {
      return json({ error: 'Authorization required' }, 401, origin);
    }

    const user = await getAuthenticatedUser(context, token);

    if (!user?.id) {
      return json({ error: 'Invalid token' }, 401, origin);
    }

    const customerId = await fetchStripeCustomerIdForUser(user.id, context.env);

    if (!customerId) {
      return json({
        error: 'no_billing_customer',
        message: 'Aktif abonelik veya ödeme geçmişi bulunamadı. Önce Pro planına abone olun.'
      }, 404, origin);
    }

    const returnUrl = `${getSiteUrl(context)}/profil?billing=managed`;
    const params = new URLSearchParams({
      customer: customerId,
      return_url: returnUrl
    });

    const configurationId = context.env.STRIPE_PORTAL_CONFIGURATION_ID;
    if (configurationId) {
      params.set('configuration', configurationId);
    }

    const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': `portal-${user.id}-${crypto.randomUUID()}`
      },
      body: params.toString()
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Stripe portal error:', data);
      const supabase = getSupabaseAdmin(context.env);
      await recordOpsEvent(supabase, {
        category: 'payment',
        event_name: 'billing_portal_failed',
        severity: 'error',
        source: 'create_billing_portal',
        http_status: res.status,
        properties: {
          stripe_error: data?.error?.type || 'stripe_error'
        }
      });
      return json({ error: 'Billing portal could not be created' }, 502, origin);
    }

    return json({ url: data.url }, 200, origin);
  } catch (err) {
    console.error('create-billing-portal error:', err);
    const supabase = getSupabaseAdmin(context.env);
    await recordOpsEvent(supabase, {
      category: 'payment',
      event_name: 'billing_portal_failed',
      severity: 'critical',
      source: 'create_billing_portal',
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
