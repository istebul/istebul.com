import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

const getSupabaseAdmin = (env) => {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase service is not configured');
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
};

const unixToIso = (value) =>
  value ? new Date(value * 1000).toISOString() : null;

const hasEventProcessed = async (supabase, event) => {
  const { data, error } = await supabase
    .from('stripe_webhook_events')
    .select('event_id')
    .eq('event_id', event.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
};

const recordEventProcessed = async (supabase, event) => {
  const { error } = await supabase
    .from('stripe_webhook_events')
    .insert({
      event_id: event.id,
      event_type: event.type
    });

  if (!error) {
    return;
  }

  if (error.code === '23505') {
    return;
  }

  throw error;
};

const recordSubscriptionAnalytics = async (supabase, eventName, details = {}) => {
  const { error } = await supabase.from('analytics_events').insert({
    event_name: eventName,
    event_category: 'subscription',
    user_id: details.userId || null,
    revenue_cents: details.revenueCents || 0,
    currency: 'TRY',
    properties: details.properties || {},
    attribution: details.attribution || {},
    source: 'stripe_webhook',
    idempotency_key: details.idempotencyKey || null
  });

  if (error && error.code !== '23505') {
    console.error('Analytics insert failed:', error.message);
  }
};

const upsertSubscription = async (supabase, subscription, fallbackUserId = null) => {
  const userId = subscription.metadata?.userId || fallbackUserId;

  if (!userId) {
    throw new Error('Missing userId metadata on subscription');
  }

  const { error } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id,
        stripe_subscription_id: subscription.id,
        stripe_price_id: subscription.items?.data?.[0]?.price?.id || null,
        status: subscription.status,
        current_period_start: unixToIso(subscription.current_period_start),
        current_period_end: unixToIso(subscription.current_period_end),
        cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
        updated_at: new Date().toISOString()
      },
      { onConflict: 'stripe_subscription_id' }
    );

  if (error) {
    throw error;
  }
};

export async function onRequestPost(context) {
  const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } = context.env;

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return json({ error: 'Stripe webhook is not configured' }, 500);
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const signature = context.request.headers.get('stripe-signature');

  if (!signature) {
    return json({ error: 'Missing Stripe signature' }, 400);
  }

  let event;

  try {
    const body = await context.request.text();
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error.message);
    return json({ error: 'Invalid signature' }, 400);
  }

  const supabase = getSupabaseAdmin(context.env);

  try {
    const { error: claimError } = await supabase.from('stripe_webhook_events').insert({
      event_id: event.id,
      event_type: event.type
    });

    if (claimError) {
      if (claimError.code === '23505') {
        return json({ received: true, duplicate: true });
      }
      throw claimError;
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        if (session.mode !== 'subscription' || !session.subscription) {
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await upsertSubscription(supabase, subscription, session.metadata?.userId);

        await recordSubscriptionAnalytics(supabase, 'checkout_completed', {
          userId: session.metadata?.userId || null,
          revenueCents: Number(session.amount_total || 0),
          idempotencyKey: `stripe:${event.id}:checkout_completed`,
          properties: {
            stripe_session_id: session.id,
            billing_interval: session.metadata?.billingInterval || null
          },
          attribution: {
            utm_source: session.metadata?.utm_source || null,
            utm_campaign: session.metadata?.utm_campaign || null
          }
        });

        if (subscription.trial_end && subscription.trial_end > Math.floor(Date.now() / 1000)) {
          await recordSubscriptionAnalytics(supabase, 'trial_started', {
            userId: session.metadata?.userId || null,
            idempotencyKey: `stripe:${event.id}:trial_started`,
            properties: { stripe_subscription_id: subscription.id }
          });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await upsertSubscription(supabase, subscription);

        const eventName = event.type === 'customer.subscription.deleted'
          ? 'subscription_canceled'
          : event.type === 'customer.subscription.created'
            ? 'subscription_created'
            : 'subscription_updated';

        await recordSubscriptionAnalytics(supabase, eventName, {
          userId: subscription.metadata?.userId || null,
          idempotencyKey: `stripe:${event.id}:${eventName}`,
          properties: {
            status: subscription.status,
            stripe_subscription_id: subscription.id
          }
        });
        break;
      }

      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertSubscription(supabase, subscription);
        }

        await recordSubscriptionAnalytics(
          supabase,
          event.type === 'invoice.payment_succeeded' ? 'invoice_paid' : 'invoice_failed',
          {
            userId: invoice.metadata?.userId || subscriptionId || null,
            revenueCents: Number(invoice.amount_paid || 0),
            idempotencyKey: `stripe:${event.id}:${event.type}`,
            properties: {
              invoice_id: invoice.id,
              subscription_id: subscriptionId || null
            }
          }
        );

        if (event.type === 'invoice.payment_succeeded') {
          await recordSubscriptionAnalytics(supabase, 'revenue_attributed', {
            userId: invoice.metadata?.userId || null,
            revenueCents: Number(invoice.amount_paid || 0),
            idempotencyKey: `stripe:${event.id}:revenue_attributed`,
            properties: {
              source: 'stripe_invoice',
              invoice_id: invoice.id
            },
            attribution: {
              utm_source: invoice.metadata?.utm_source || 'stripe',
              utm_medium: 'subscription'
            }
          });
        }

        break;
      }

      default:
        break;
    }

    return json({ received: true });
  } catch (error) {
    console.error('Stripe webhook handler failed:', error);
    return json({ error: 'Webhook handler failed' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 405 });
}
