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
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        if (session.mode !== 'subscription' || !session.subscription) {
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await upsertSubscription(supabase, subscription, session.metadata?.userId);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await upsertSubscription(supabase, event.data.object);
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
