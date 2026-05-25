import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { recordOpsEvent } from './_shared/record-ops-event.js';
import {
  enrollRevenueLifecycleFlow,
  resolveUserContact
} from './_shared/revenue-ops-enroll.js';

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

const processReferralSubscriptionConversion = async (env, details = {}) => {
  const referralCode = details.referralCode;
  if (!referralCode || !env.SUPABASE_URL) return;

  const secret = env.REFERRAL_WEBHOOK_SECRET || env.LIFECYCLE_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('Referral conversion skipped: REFERRAL_WEBHOOK_SECRET or LIFECYCLE_WEBHOOK_SECRET required');
    return;
  }

  try {
    await fetch(`${env.SUPABASE_URL}/functions/v1/referral-hub`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
        'x-referral-secret': secret
      },
      body: JSON.stringify({
        action: 'process_conversion',
        referral_code: referralCode,
        conversion_type: 'subscription',
        referee_user_id: details.userId || null,
        referee_email: details.email || null
      })
    });
  } catch (error) {
    console.error('Referral conversion hook failed:', error.message);
  }
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
    try {
      const supabase = getSupabaseAdmin(context.env);
      await recordOpsEvent(supabase, {
        category: 'webhook',
        event_name: 'webhook_stripe_signature_invalid',
        severity: 'critical',
        source: 'stripe_webhook',
        properties: { message: error.message }
      });
    } catch {
      /* ignore */
    }
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

        const revenueCents = Number(session.amount_total || 0);
        const stripeAttribution = {
          utm_source: session.metadata?.utm_source || null,
          utm_medium: session.metadata?.utm_medium || null,
          utm_campaign: session.metadata?.utm_campaign || null,
          growth_channel: session.metadata?.growth_channel || null,
          referral_code: session.metadata?.referral_code || null
        };
        const stripeProps = {
          stripe_session_id: session.id,
          billing_interval: session.metadata?.billingInterval || null
        };
        const userId = session.metadata?.userId || null;

        await recordSubscriptionAnalytics(supabase, 'checkout_completed', {
          userId,
          revenueCents,
          idempotencyKey: `stripe:${event.id}:checkout_completed`,
          properties: stripeProps,
          attribution: stripeAttribution
        });

        await recordSubscriptionAnalytics(supabase, 'checkout_complete', {
          userId,
          revenueCents,
          idempotencyKey: `stripe:${event.id}:checkout_complete`,
          properties: stripeProps,
          attribution: stripeAttribution
        });

        await recordSubscriptionAnalytics(supabase, 'paid_conversion', {
          userId,
          revenueCents,
          idempotencyKey: `stripe:${event.id}:paid_conversion`,
          properties: { ...stripeProps, conversion_type: 'subscription' },
          attribution: stripeAttribution
        });

        if (subscription.trial_end && subscription.trial_end > Math.floor(Date.now() / 1000)) {
          await recordSubscriptionAnalytics(supabase, 'trial_started', {
            userId: session.metadata?.userId || null,
            idempotencyKey: `stripe:${event.id}:trial_started`,
            properties: { stripe_subscription_id: subscription.id }
          });
        }

        const referralCode =
          session.metadata?.referral_code || subscription.metadata?.referral_code;
        if (referralCode) {
          await processReferralSubscriptionConversion(context.env, {
            referralCode,
            userId: session.metadata?.userId || null,
            email: session.customer_email || null
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

        const userId = subscription.metadata?.userId || null;

        await recordSubscriptionAnalytics(supabase, eventName, {
          userId,
          idempotencyKey: `stripe:${event.id}:${eventName}`,
          properties: {
            status: subscription.status,
            stripe_subscription_id: subscription.id,
            cancel_at_period_end: subscription.cancel_at_period_end
          }
        });

        if (userId) {
          const contact = await resolveUserContact(supabase, userId);
          if (event.type === 'customer.subscription.deleted') {
            await enrollRevenueLifecycleFlow(context.env, {
              flow_id: 'churn_rescue',
              user_id: userId,
              email: contact?.email,
              display_name: contact?.displayName,
              context: { status: 'canceled', stripe_subscription_id: subscription.id },
              trigger_source: 'stripe_subscription_deleted',
              restart: true
            });
          } else if (
            event.type === 'customer.subscription.updated' &&
            subscription.cancel_at_period_end
          ) {
            await enrollRevenueLifecycleFlow(context.env, {
              flow_id: 'churn_rescue',
              user_id: userId,
              email: contact?.email,
              display_name: contact?.displayName,
              context: {
                cancel_at_period_end: true,
                status: subscription.status
              },
              trigger_source: 'stripe_cancel_scheduled',
              restart: true
            });
            await enrollRevenueLifecycleFlow(context.env, {
              flow_id: 'downgrade_save',
              user_id: userId,
              email: contact?.email,
              display_name: contact?.displayName,
              context: { reason: 'cancel_scheduled' },
              trigger_source: 'stripe_downgrade_save'
            });
          } else if (
            event.type === 'customer.subscription.updated' &&
            subscription.status === 'past_due'
          ) {
            await enrollRevenueLifecycleFlow(context.env, {
              flow_id: 'dunning_past_due',
              user_id: userId,
              email: contact?.email,
              display_name: contact?.displayName,
              trigger_source: 'stripe_past_due',
              restart: true
            });
          }
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId || null;
        const contact = userId ? await resolveUserContact(supabase, userId) : null;
        if (userId) {
          await enrollRevenueLifecycleFlow(context.env, {
            flow_id: 'trial_ending_upgrade',
            user_id: userId,
            email: contact?.email,
            display_name: contact?.displayName,
            trigger_source: 'stripe_trial_will_end',
            restart: true
          });
        }
        await recordSubscriptionAnalytics(supabase, 'trial_ending_soon', {
          userId,
          idempotencyKey: `stripe:${event.id}:trial_ending`,
          properties: { stripe_subscription_id: subscription.id }
        });
        break;
      }

      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id;

        let subscriptionRecord = null;
        if (subscriptionId) {
          subscriptionRecord = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertSubscription(supabase, subscriptionRecord);
        }

        if (event.type === 'invoice.payment_failed') {
          await recordOpsEvent(supabase, {
            category: 'payment',
            event_name: 'payment_invoice_failed',
            severity: 'error',
            source: 'stripe_webhook',
            idempotency_key: `stripe:ops:${event.id}:invoice_failed`,
            properties: {
              stripe_event: event.type,
              invoice_id: invoice.id
            }
          });

          const failedUserId =
            invoice.metadata?.userId || subscriptionRecord?.metadata?.userId || null;
          const failedContact = failedUserId
            ? await resolveUserContact(supabase, failedUserId)
            : null;
          const failedStatus = subscriptionRecord?.status || null;

          if (failedUserId) {
            const flowId =
              failedStatus === 'past_due' ? 'dunning_past_due' : 'failed_payment_recovery';
            await enrollRevenueLifecycleFlow(context.env, {
              flow_id: flowId,
              user_id: failedUserId,
              email: failedContact?.email,
              display_name: failedContact?.displayName,
              context: {
                invoice_id: invoice.id,
                subscription_status: failedStatus
              },
              trigger_source: 'stripe_invoice_failed',
              restart: true
            });
          }
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
    try {
      await recordOpsEvent(supabase, {
        category: 'payment',
        event_name: 'webhook_stripe_processing_failed',
        severity: 'critical',
        source: 'stripe_webhook',
        properties: {
          message: error.message || 'handler_failed'
        }
      });
    } catch {
      /* ignore */
    }
    return json({ error: 'Webhook handler failed' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 405 });
}
