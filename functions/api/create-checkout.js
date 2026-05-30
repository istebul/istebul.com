const getSiteUrl = (context) => (context.env.SITE_URL || 'https://istebul.com').replace(/\/$/, '');

import { isAllowedOrigin } from '../_shared/cors-origins.js';
import { API_ERROR_CODES } from '../_shared/api-response.js';
import { buildCorsJsonHeaders, corsJson, corsJsonError } from '../_shared/cors-json.js';

import { recordOpsEvent } from './_shared/record-ops-event.js';
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

  if (origin && !isAllowedOrigin(origin)) {
    return corsJsonError(403, API_ERROR_CODES.FORBIDDEN, 'Forbidden', origin);
  }

  try {
    const STRIPE_SECRET_KEY = context.env.STRIPE_SECRET_KEY;
    const STRIPE_PRICE_ID = context.env.STRIPE_PRICE_ID;
    const STRIPE_PRICE_ID_ANNUAL = context.env.STRIPE_PRICE_ID_ANNUAL;
    const TRIAL_DAYS = Math.max(0, parseInt(context.env.STRIPE_TRIAL_DAYS || '7', 10) || 0);

    if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID) {
      return corsJson(
        {
          ok: false,
          code: 'STRIPE_PASSIVE',
          status: 'global_provider_passive',
          message:
            'Stripe checkout pasif. Türkiye ödemeleri için iyzico / PayTR kullanın.'
        },
        503,
        origin
      );
    }

    const token = getBearerToken(context.request);

    if (!token) {
      return corsJsonError(401, API_ERROR_CODES.UNAUTHORIZED, 'Authorization required', origin);
    }

    const user = await getAuthenticatedUser(context, token);

    if (!user?.id || !user?.email) {
      return corsJsonError(401, API_ERROR_CODES.UNAUTHORIZED, 'Invalid token', origin);
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
      return corsJsonError(
        500,
        API_ERROR_CODES.SERVER_MISCONFIGURED,
        'Subscription validation unavailable',
        origin
      );
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
        return corsJsonError(
          409,
          API_ERROR_CODES.CONFLICT,
          'Active subscription already exists',
          origin
        );
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
    if (attribution.utm_content) {
      params.set('metadata[utm_content]', String(attribution.utm_content).slice(0, 120));
    }
    if (attribution.ref) {
      params.set('metadata[referral_code]', String(attribution.ref).slice(0, 32));
      params.set('subscription_data[metadata][referral_code]', String(attribution.ref).slice(0, 32));
    }
    if (attribution.growth_channel) {
      params.set('metadata[growth_channel]', String(attribution.growth_channel).slice(0, 40));
      params.set('subscription_data[metadata][growth_channel]', String(attribution.growth_channel).slice(0, 40));
    }
    if (attribution.growth_campaign) {
      params.set('metadata[growth_campaign]', String(attribution.growth_campaign).slice(0, 120));
    }
    if (attribution.gclid) {
      params.set('metadata[gclid]', String(attribution.gclid).slice(0, 120));
    }
    if (attribution.fbclid) {
      params.set('metadata[fbclid]', String(attribution.fbclid).slice(0, 120));
    }
    if (attribution.msclkid) {
      params.set('metadata[msclkid]', String(attribution.msclkid).slice(0, 120));
    }
    if (attribution.ttclid) {
      params.set('metadata[ttclid]', String(attribution.ttclid).slice(0, 120));
    }
    if (attribution.paid_platform) {
      params.set('metadata[paid_platform]', String(attribution.paid_platform).slice(0, 40));
    }
    if (attribution.gbraid) {
      params.set('metadata[gbraid]', String(attribution.gbraid).slice(0, 120));
    }
    if (attribution.wbraid) {
      params.set('metadata[wbraid]', String(attribution.wbraid).slice(0, 120));
    }
    if (attribution.ref) {
      params.set('metadata[referral_code]', String(attribution.ref).slice(0, 32));
      params.set('subscription_data[metadata][referral_code]', String(attribution.ref).slice(0, 32));
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
      return corsJsonError(
        502,
        API_ERROR_CODES.UPSTREAM_ERROR,
        'Checkout could not be created',
        origin
      );
    }

    return corsJson(
      {
        ok: true,
        url: data.url,
        trialApplied: trialDays > 0,
        billingInterval
      },
      200,
      origin
    );
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
    return corsJsonError(500, API_ERROR_CODES.INTERNAL_ERROR, 'Internal server error', origin);
  }
}

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: buildCorsJsonHeaders(context.request.headers.get('Origin'))
  });
}
