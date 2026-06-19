/**
 * P10 — Revenue ops automation (MRR leakage reduction).
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enrollInFlow } from "./lifecycle-engine.ts";

function normalizeEmail(value: unknown) {
  const email = String(value || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

async function profileForUser(sb: SupabaseClient, userId: string) {
  const { data } = await sb
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

async function hasActiveEnrollment(sb: SupabaseClient, flowId: string, userId: string) {
  const { data: contact } = await sb
    .from("lifecycle_contacts")
    .select("id")
    .eq("user_id", userId)
    .is("unsubscribed_at", null)
    .maybeSingle();

  if (!contact?.id) return false;

  const { data } = await sb
    .from("lifecycle_enrollments")
    .select("id")
    .eq("contact_id", contact.id)
    .eq("flow_id", flowId)
    .eq("status", "active")
    .limit(1);

  return Boolean(data?.length);
}

export async function enrollRevenueFlowForUser(
  sb: SupabaseClient,
  input: {
    flowId: string;
    userId: string;
    context?: Record<string, unknown>;
    triggerSource: string;
    restart?: boolean;
  }
) {
  const profile = await profileForUser(sb, input.userId);
  if (!profile?.email) return { ok: false, error: "no_email" };

  if (!input.restart && (await hasActiveEnrollment(sb, input.flowId, input.userId))) {
    return { ok: true, duplicate: true };
  }

  return enrollInFlow(sb, {
    flowId: input.flowId,
    email: profile.email,
    userId: input.userId,
    displayName: profile.full_name,
    service_opt_in: true,
    context: input.context || {},
    triggerSource: input.triggerSource,
    restart: input.restart ?? true,
  });
}

/** Stripe invoice.payment_failed */
export async function handleInvoicePaymentFailed(
  sb: SupabaseClient,
  input: {
    userId: string | null;
    subscriptionStatus?: string;
    invoiceId?: string;
  }
) {
  if (!input.userId) return { enrolled: 0 };

  const flowId =
    input.subscriptionStatus === "past_due"
      ? "dunning_past_due"
      : "failed_payment_recovery";

  const result = await enrollRevenueFlowForUser(sb, {
    flowId,
    userId: input.userId,
    context: {
      invoice_id: input.invoiceId,
      subscription_status: input.subscriptionStatus,
    },
    triggerSource: "stripe_invoice_failed",
    restart: true,
  });

  return { enrolled: result.ok && !("duplicate" in result && result.duplicate) ? 1 : 0, flowId };
}

/** subscription.updated — cancel_at_period_end */
export async function handleSubscriptionChurnSignal(
  sb: SupabaseClient,
  input: {
    userId: string | null;
    cancelAtPeriodEnd: boolean;
    status: string;
  }
) {
  if (!input.userId) return { enrolled: 0 };

  if (input.cancelAtPeriodEnd && ["active", "trialing"].includes(input.status)) {
    const churn = await enrollRevenueFlowForUser(sb, {
      flowId: "churn_rescue",
      userId: input.userId,
      context: { cancel_at_period_end: true, status: input.status },
      triggerSource: "stripe_cancel_scheduled",
      restart: true,
    });
    const save = await enrollRevenueFlowForUser(sb, {
      flowId: "downgrade_save",
      userId: input.userId,
      context: { reason: "cancel_scheduled" },
      triggerSource: "stripe_downgrade_save",
      restart: false,
    });
    return {
      churn_rescue: churn.ok ? 1 : 0,
      downgrade_save: save.ok && !save.duplicate ? 1 : 0,
    };
  }

  if (input.status === "past_due") {
    const dunning = await enrollRevenueFlowForUser(sb, {
      flowId: "dunning_past_due",
      userId: input.userId,
      triggerSource: "stripe_past_due",
      restart: true,
    });
    return { dunning_past_due: dunning.ok ? 1 : 0 };
  }

  return { enrolled: 0 };
}

/** customer.subscription.deleted */
export async function handleSubscriptionDeleted(
  sb: SupabaseClient,
  userId: string | null
) {
  if (!userId) return { enrolled: 0 };
  const result = await enrollRevenueFlowForUser(sb, {
    flowId: "churn_rescue",
    userId,
    context: { status: "canceled" },
    triggerSource: "stripe_subscription_deleted",
    restart: true,
  });
  return { enrolled: result.ok ? 1 : 0 };
}

/** customer.subscription.trial_will_end */
export async function handleTrialWillEnd(sb: SupabaseClient, userId: string | null) {
  if (!userId) return { enrolled: 0 };
  const result = await enrollRevenueFlowForUser(sb, {
    flowId: "trial_ending_upgrade",
    userId,
    triggerSource: "stripe_trial_will_end",
    restart: true,
  });
  return { enrolled: result.ok ? 1 : 0 };
}

function periodEndInWindow(endIso: string, minDays: number, maxDays: number) {
  const end = new Date(endIso).getTime();
  const now = Date.now();
  const min = now + minDays * 86400000;
  const max = now + maxDays * 86400000;
  return end >= min && end <= max;
}

/** Active subs renewing in ~14 days */
export async function enrollRenewalNudgesFromSubscriptions(
  sb: SupabaseClient,
  limit = 25
) {
  const { data: subs } = await sb
    .from("subscriptions")
    .select("user_id, current_period_end, status")
    .in("status", ["active", "trialing"])
    .not("current_period_end", "is", null)
    .limit(200);

  let enrolled = 0;
  for (const sub of subs || []) {
    if (!sub.user_id || !sub.current_period_end) continue;
    if (!periodEndInWindow(sub.current_period_end, 13, 15)) continue;
    if (enrolled >= limit) break;

    const result = await enrollRevenueFlowForUser(sb, {
      flowId: "renewal_nudge",
      userId: sub.user_id,
      context: { period_end: sub.current_period_end },
      triggerSource: "cron_renewal_14d",
      restart: false,
    });
    if (result.ok && !result.duplicate) enrolled += 1;
  }
  return { enrolled, scanned: subs?.length || 0 };
}

/** Invoice reminder ~7 days before period end */
export async function enrollInvoiceRemindersFromSubscriptions(
  sb: SupabaseClient,
  limit = 25
) {
  const { data: subs } = await sb
    .from("subscriptions")
    .select("user_id, current_period_end, status")
    .in("status", ["active", "trialing"])
    .not("current_period_end", "is", null)
    .limit(200);

  let enrolled = 0;
  for (const sub of subs || []) {
    if (!sub.user_id || !sub.current_period_end) continue;
    if (!periodEndInWindow(sub.current_period_end, 6, 8)) continue;
    if (enrolled >= limit) break;

    const result = await enrollRevenueFlowForUser(sb, {
      flowId: "invoice_reminder",
      userId: sub.user_id,
      context: { period_end: sub.current_period_end },
      triggerSource: "cron_invoice_7d",
      restart: false,
    });
    if (result.ok && !result.duplicate) enrolled += 1;
  }
  return { enrolled, scanned: subs?.length || 0 };
}

/** cancel_at_period_end still active */
export async function enrollChurnRescueFromSubscriptions(
  sb: SupabaseClient,
  limit = 20
) {
  const { data: subs } = await sb
    .from("subscriptions")
    .select("user_id, cancel_at_period_end, status, current_period_end")
    .eq("cancel_at_period_end", true)
    .in("status", ["active", "trialing"])
    .limit(limit);

  let enrolled = 0;
  for (const sub of subs || []) {
    if (!sub.user_id) continue;
    const result = await enrollRevenueFlowForUser(sb, {
      flowId: "churn_rescue",
      userId: sub.user_id,
      context: {
        period_end: sub.current_period_end,
        cancel_at_period_end: true,
      },
      triggerSource: "cron_churn_rescue",
      restart: false,
    });
    if (result.ok && !result.duplicate) enrolled += 1;
  }
  return { enrolled, scanned: subs?.length || 0 };
}

/** Trialing subs ending within 3 days */
export async function enrollTrialEndingUpgrade(sb: SupabaseClient, limit = 20) {
  const { data: subs } = await sb
    .from("subscriptions")
    .select("user_id, current_period_end, status")
    .eq("status", "trialing")
    .not("current_period_end", "is", null)
    .limit(100);

  let enrolled = 0;
  for (const sub of subs || []) {
    if (!sub.user_id || !sub.current_period_end) continue;
    if (!periodEndInWindow(sub.current_period_end, 0, 4)) continue;
    if (enrolled >= limit) break;

    const result = await enrollRevenueFlowForUser(sb, {
      flowId: "trial_ending_upgrade",
      userId: sub.user_id,
      triggerSource: "cron_trial_ending",
      restart: false,
    });
    if (result.ok && !result.duplicate) enrolled += 1;
  }
  return { enrolled, scanned: subs?.length || 0 };
}

/** Free engaged users → upgrade_prompt (complements upsell_campaigns) */
export async function enrollUpgradePromptFromAnalytics(
  sb: SupabaseClient,
  limit = 15
) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: events } = await sb
    .from("analytics_events")
    .select("email, user_id, event_name")
    .in("event_name", ["pricing_view", "pro_upsell_impression", "checkout_start"])
    .gte("created_at", since)
    .limit(400);

  let enrolled = 0;
  const seen = new Set<string>();

  for (const ev of events || []) {
    const uid = ev.user_id as string | null;
    const email = normalizeEmail(ev.email);
    const key = uid || email || "";
    if (!key || seen.has(key)) continue;
    seen.add(key);

    if (uid) {
      const { data: activeSub } = await sb
        .from("subscriptions")
        .select("id")
        .eq("user_id", uid)
        .in("status", ["active", "trialing"])
        .limit(1);
      if (activeSub?.length) continue;
    }

    if (enrolled >= limit) break;

    const result = await enrollInFlow(sb, {
      flowId: "upgrade_prompt",
      email: email || undefined,
      userId: uid || undefined,
      context: { source: "cron_upgrade_prompt", event: ev.event_name },
      triggerSource: "cron_upgrade_prompt",
    });
    if (result.ok && !result.duplicate) enrolled += 1;
  }

  return { enrolled, scanned: events?.length || 0 };
}
