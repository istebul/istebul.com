/**
 * Enroll revenue lifecycle flows from Cloudflare (Stripe webhook) via Supabase edge.
 */

export async function enrollRevenueLifecycleFlow(env, payload = {}) {
  const url = env.SUPABASE_URL;
  const secret = env.LIFECYCLE_WEBHOOK_SECRET || env.REFERRAL_WEBHOOK_SECRET;
  if (!url || !secret) {
    console.warn('Revenue lifecycle enroll skipped: missing SUPABASE_URL or LIFECYCLE_WEBHOOK_SECRET');
    return { ok: false, skipped: true };
  }

  const flowId = payload.flow_id;
  if (!flowId) return { ok: false, error: 'flow_id_required' };

  try {
    const res = await fetch(`${url}/functions/v1/lifecycle-enroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
        'x-lifecycle-secret': secret
      },
      body: JSON.stringify({
        flow_id: flowId,
        email: payload.email || null,
        user_id: payload.user_id || null,
        display_name: payload.display_name || null,
        service_opt_in: true,
        context: payload.context || {},
        trigger_source: payload.trigger_source || 'stripe_webhook',
        restart: Boolean(payload.restart)
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn('Revenue lifecycle enroll failed:', flowId, data.error || res.status);
      return { ok: false, error: data.error || res.status };
    }
    return { ok: true, ...data };
  } catch (err) {
    console.error('Revenue lifecycle enroll error:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Resolve profile email for Stripe subscription metadata.
 */
export async function resolveUserContact(supabase, userId) {
  if (!userId) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .maybeSingle();
  if (!profile?.email) return null;
  return {
    userId,
    email: profile.email,
    displayName: profile.full_name
  };
}
