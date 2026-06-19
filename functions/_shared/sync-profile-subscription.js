/**
 * Mirror Stripe subscription state onto profiles (service role only).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} subscription Stripe subscription object
 * @param {string} [fallbackUserId]
 */
export async function syncProfileFromSubscription(supabase, subscription, fallbackUserId = null) {
  const userId = subscription?.metadata?.userId || fallbackUserId;
  if (!userId || !subscription) return;

  const status = String(subscription.status || 'inactive');
  const isPro = status === 'active' || status === 'trialing' || status === 'past_due';
  const plan = isPro ? 'pro' : 'free';

  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;

  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  const { error } = await supabase
    .from('profiles')
    .update({
      plan,
      subscription_status: status,
      stripe_customer_id: customerId || null,
      stripe_subscription_id: subscription.id || null,
      subscription_current_period_end: periodEnd,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) {
    console.error('syncProfileFromSubscription failed:', error.message);
  }
}
