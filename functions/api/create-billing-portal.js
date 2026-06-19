const getSiteUrl = (context) => (context.env.SITE_URL || 'https://istebul.com').replace(/\/$/, '');

import { isAllowedOrigin } from '../_shared/cors-origins.js';
import { API_ERROR_CODES } from '../_shared/api-response.js';
import { buildCorsJsonHeaders, corsJson, corsJsonError } from '../_shared/cors-json.js';

import { recordOpsEvent } from './_shared/record-ops-event.js';
import { fetchStripeCustomerIdForUser } from './_shared/stripe-customer.js';
import { createClient } from '@supabase/supabase-js';

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
    return corsJsonError(403, API_ERROR_CODES.FORBIDDEN, 'Forbidden', origin);
  }

  try {
    const STRIPE_SECRET_KEY = context.env.STRIPE_SECRET_KEY;

    if (!STRIPE_SECRET_KEY) {
      return corsJsonError(500, API_ERROR_CODES.SERVER_MISCONFIGURED, 'Stripe not configured', origin);
    }

    const token = getBearerToken(context.request);

    if (!token) {
      return corsJsonError(401, API_ERROR_CODES.UNAUTHORIZED, 'Authorization required', origin);
    }

    const user = await getAuthenticatedUser(context, token);

    if (!user?.id) {
      return corsJsonError(401, API_ERROR_CODES.UNAUTHORIZED, 'Invalid token', origin);
    }

    const customerId = await fetchStripeCustomerIdForUser(user.id, context.env);

    if (!customerId) {
      return corsJsonError(
        404,
        API_ERROR_CODES.NOT_FOUND,
        'Aktif abonelik veya ödeme geçmişi bulunamadı. Önce Pro planına abone olun.',
        origin,
        { code: 'no_billing_customer' }
      );
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
      return corsJsonError(
        502,
        API_ERROR_CODES.UPSTREAM_ERROR,
        'Billing portal could not be created',
        origin
      );
    }

    return corsJson({ ok: true, url: data.url }, 200, origin);
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
    return corsJsonError(500, API_ERROR_CODES.INTERNAL_ERROR, 'Internal server error', origin);
  }
}

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: buildCorsJsonHeaders(context.request.headers.get('Origin'))
  });
}
