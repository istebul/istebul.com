import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendLifecycleEmail } from "./lifecycle-email.ts";
import {
  contactAllowsFlow,
  mergeConsentMetadata,
} from "./lifecycle-consent.ts";
import {
  getFlow,
  scheduleStepAt,
  type LifecycleFlow,
} from "./lifecycle-flows.ts";
import { renderTemplate } from "./lifecycle-templates.ts";
import { recordPlatformEvent } from "./platform-analytics.ts";

export type EnrollInput = {
  flowId: string;
  email?: string | null;
  phone?: string | null;
  userId?: string | null;
  leadId?: string | null;
  displayName?: string | null;
  context?: Record<string, unknown>;
  triggerSource?: string;
  marketing_consent?: boolean;
  service_opt_in?: boolean;
  /** Replace active enrollment and reschedule */
  restart?: boolean;
};

function normalizeEmail(value: unknown) {
  const email = String(value || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function normalizePhone(value: unknown) {
  const phone = String(value || "").replace(/\D/g, "");
  if (phone.length < 10 || phone.length > 15) return null;
  return phone;
}

export async function upsertLifecycleContact(
  sb: SupabaseClient,
  input: EnrollInput
) {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const userId = input.userId || null;

  if (!email && !phone && !userId) {
    return { error: "contact_channel_required" as const };
  }

  let existing = null;

  if (userId) {
    const { data } = await sb
      .from("lifecycle_contacts")
      .select("*")
      .eq("user_id", userId)
      .is("unsubscribed_at", null)
      .maybeSingle();
    existing = data;
  }

  if (!existing && email) {
    const { data } = await sb
      .from("lifecycle_contacts")
      .select("*")
      .ilike("email", email)
      .is("unsubscribed_at", null)
      .maybeSingle();
    existing = data;
  }

  const ctx = input.context || {};
  const patch = {
    user_id: userId || existing?.user_id || null,
    email: email || existing?.email || null,
    phone: phone || existing?.phone || null,
    lead_id: input.leadId || existing?.lead_id || null,
    display_name: input.displayName || existing?.display_name || null,
    last_active_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: mergeConsentMetadata(
      {
        ...(existing?.metadata || {}),
        ...ctx,
      },
      {
        marketing_consent:
          input.marketing_consent === true || ctx.marketing_consent === true,
        service_opt_in:
          input.service_opt_in === true || ctx.service_opt_in === true,
      }
    ),
  };

  if (existing?.id) {
    const { data, error } = await sb
      .from("lifecycle_contacts")
      .update(patch)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) return { error: error.message };
    return { contact: data };
  }

  const { data, error } = await sb
    .from("lifecycle_contacts")
    .insert(patch)
    .select("*")
    .single();

  if (error) return { error: error.message };
  return { contact: data };
}

async function cancelEnrollment(
  sb: SupabaseClient,
  enrollmentId: string,
  reason: string
) {
  await sb
    .from("lifecycle_enrollments")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", enrollmentId);

  await sb
    .from("lifecycle_messages")
    .update({ status: "cancelled" })
    .eq("enrollment_id", enrollmentId)
    .eq("status", "pending");
}

export async function enrollInFlow(sb: SupabaseClient, input: EnrollInput) {
  const flow = getFlow(input.flowId);
  if (!flow) return { error: "unknown_flow" as const };

  const contactResult = await upsertLifecycleContact(sb, input);
  if ("error" in contactResult && contactResult.error) {
    return { error: contactResult.error };
  }

  const contact = contactResult.contact!;
  if (!contact.email) {
    return { error: "email_required_for_lifecycle" as const };
  }

  if (!contactAllowsFlow(contact.metadata as Record<string, unknown>, input.flowId)) {
    return { error: "consent_required" as const };
  }

  const { data: active } = await sb
    .from("lifecycle_enrollments")
    .select("id")
    .eq("contact_id", contact.id)
    .eq("flow_id", input.flowId)
    .eq("status", "active")
    .maybeSingle();

  if (active?.id && !input.restart) {
    return { ok: true, duplicate: true, enrollmentId: active.id, contactId: contact.id };
  }

  if (active?.id && input.restart) {
    await cancelEnrollment(sb, active.id, "restarted");
  }

  const enrolledAt = new Date().toISOString();
  const { data: enrollment, error: enrollError } = await sb
    .from("lifecycle_enrollments")
    .insert({
      contact_id: contact.id,
      flow_id: input.flowId,
      status: "active",
      current_step_index: 0,
      enrolled_at: enrolledAt,
      context: input.context || {},
      trigger_source: input.triggerSource || "api",
    })
    .select("*")
    .single();

  if (enrollError) return { error: enrollError.message };

  await scheduleFlowMessages(sb, flow, enrollment, contact);

  try {
    await recordPlatformEvent(sb, {
      event_name: "lifecycle_enrolled",
      email: contact.email,
      phone: contact.phone,
      user_id: contact.user_id,
      funnel: "lifecycle",
      funnel_step: input.flowId,
      properties: {
        flow_id: input.flowId,
        trigger: input.triggerSource || "api",
        enrollment_id: enrollment.id,
      },
      source: "lifecycle_engine",
    });
  } catch {
    /* non-blocking */
  }

  return {
    ok: true,
    enrollmentId: enrollment.id,
    contactId: contact.id,
    scheduledSteps: flow.steps.length,
  };
}

async function scheduleFlowMessages(
  sb: SupabaseClient,
  flow: LifecycleFlow,
  enrollment: { id: string; enrolled_at: string; context?: Record<string, unknown> },
  contact: { id: string; email: string; display_name?: string | null }
) {
  const rows = flow.steps.map((step) => ({
    enrollment_id: enrollment.id,
    contact_id: contact.id,
    flow_id: flow.id,
    step_id: step.id,
    channel: "email",
    subject: step.subject,
    template_id: step.templateId,
    scheduled_at: scheduleStepAt(enrollment.enrolled_at, step.delayHours),
    status: "pending",
    metadata: { context: enrollment.context || {} },
  }));

  const { error } = await sb.from("lifecycle_messages").upsert(rows, {
    onConflict: "enrollment_id,step_id",
    ignoreDuplicates: false,
  });

  if (error) throw error;
}

export async function processDueMessages(sb: SupabaseClient, limit = 50) {
  const now = new Date().toISOString();

  const { data: pending, error } = await sb
    .from("lifecycle_messages")
    .select(
      "*, lifecycle_enrollments!inner(id, status, context, flow_id), lifecycle_contacts!inner(id, email, display_name, unsubscribed_at, user_id, phone)"
    )
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (error) return { error: error.message, processed: 0 };

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const msg of pending || []) {
    const enrollment = msg.lifecycle_enrollments;
    const contact = msg.lifecycle_contacts;

    if (!enrollment || enrollment.status !== "active") {
      await sb.from("lifecycle_messages").update({ status: "cancelled" }).eq("id", msg.id);
      skipped += 1;
      continue;
    }

    if (contact?.unsubscribed_at) {
      await sb.from("lifecycle_messages").update({ status: "skipped", error: "unsubscribed" }).eq("id", msg.id);
      skipped += 1;
      continue;
    }

    if (!contactAllowsFlow(contact.metadata as Record<string, unknown>, msg.flow_id)) {
      await sb
        .from("lifecycle_messages")
        .update({ status: "skipped", error: "consent_required" })
        .eq("id", msg.id);
      skipped += 1;
      continue;
    }

    const email = contact?.email;
    if (!email) {
      await sb.from("lifecycle_messages").update({ status: "skipped", error: "no_email" }).eq("id", msg.id);
      skipped += 1;
      continue;
    }

    const ctx = {
      ...(enrollment.context || {}),
      ...(msg.metadata?.context || {}),
      display_name: contact.display_name,
    };

    const html = renderTemplate(msg.template_id, msg.flow_id, msg.step_id, ctx, email);
    const result = await sendLifecycleEmail({
      to: email,
      subject: msg.subject,
      html,
      tags: [
        { name: "flow_id", value: msg.flow_id },
        { name: "step_id", value: msg.step_id },
      ],
    });

    if (result.ok) {
      await sb
        .from("lifecycle_messages")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          provider_message_id: result.id,
        })
        .eq("id", msg.id);

      const flow = getFlow(msg.flow_id);
      const stepIndex = flow?.steps.findIndex((s) => s.id === msg.step_id) ?? -1;
      if (stepIndex >= 0) {
        await sb
          .from("lifecycle_enrollments")
          .update({
            current_step_index: stepIndex + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", enrollment.id);

        if (flow && stepIndex === flow.steps.length - 1) {
          await sb
            .from("lifecycle_enrollments")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
            })
            .eq("id", enrollment.id);
        }
      }

      try {
        await recordPlatformEvent(sb, {
          event_name: "lifecycle_message_sent",
          email,
          phone: contact.phone,
          user_id: contact.user_id,
          funnel: "lifecycle",
          funnel_step: `${msg.flow_id}:${msg.step_id}`,
          properties: {
            flow_id: msg.flow_id,
            step_id: msg.step_id,
            provider_id: result.id,
          },
          source: "lifecycle_cron",
        });
      } catch {
        /* non-blocking */
      }

      sent += 1;
    } else if (result.skipped) {
      await sb
        .from("lifecycle_messages")
        .update({ status: "skipped", error: result.error })
        .eq("id", msg.id);
      skipped += 1;
    } else {
      await sb
        .from("lifecycle_messages")
        .update({ status: "failed", error: result.error })
        .eq("id", msg.id);
      failed += 1;
    }
  }

  return { processed: (pending || []).length, sent, failed, skipped };
}

/** Cron audience: stale leads with email for partner follow-up */
export async function enrollPartnerFollowUps(sb: SupabaseClient, limit = 30) {
  const now = new Date().toISOString();
  const { data: leads } = await sb
    .from("auto_leads")
    .select("id, email, phone, contact_name, vehicle, follow_up_at, follow_up_done, status")
    .eq("follow_up_done", false)
    .not("email", "is", null)
    .lte("follow_up_at", now)
    .in("status", ["new", "contacted", "qualified"])
    .order("follow_up_at", { ascending: true })
    .limit(limit);

  let enrolled = 0;
  for (const lead of leads || []) {
    const result = await enrollInFlow(sb, {
      flowId: "partner_follow_up",
      email: lead.email,
      phone: lead.phone,
      leadId: lead.id,
      displayName: lead.contact_name,
      context: { vehicle: lead.vehicle, lead_id: lead.id },
      triggerSource: "cron_partner_follow_up",
    });
    if (result.ok && !result.duplicate) enrolled += 1;
  }
  return { enrolled, scanned: leads?.length || 0 };
}

/** Inactive profiles with email, no recent session */
export async function enrollInactiveUsers(sb: SupabaseClient, limit = 40) {
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: profiles } = await sb
    .from("profiles")
    .select("id, email, full_name, updated_at")
    .not("email", "is", null)
    .lt("updated_at", cutoff)
    .order("updated_at", { ascending: true })
    .limit(limit);

  let enrolled = 0;
  for (const profile of profiles || []) {
    const result = await enrollInFlow(sb, {
      flowId: "inactive_users",
      email: profile.email,
      userId: profile.id,
      displayName: profile.full_name,
      triggerSource: "cron_inactive",
    });
    if (result.ok && !result.duplicate) enrolled += 1;
  }
  return { enrolled, scanned: profiles?.length || 0 };
}

/** Subscription canceled → retention */
export async function enrollRetentionFromSubscriptions(sb: SupabaseClient, limit = 20) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: subs } = await sb
    .from("subscriptions")
    .select("user_id, status, canceled_at, updated_at")
    .in("status", ["canceled", "past_due"])
    .gte("updated_at", since)
    .limit(limit);

  let enrolled = 0;
  for (const sub of subs || []) {
    if (!sub.user_id) continue;
    const { data: profile } = await sb
      .from("profiles")
      .select("email, full_name")
      .eq("id", sub.user_id)
      .maybeSingle();
    if (!profile?.email) continue;

    const result = await enrollInFlow(sb, {
      flowId: "retention_campaigns",
      email: profile.email,
      userId: sub.user_id,
      displayName: profile.full_name,
      context: { subscription_status: sub.status },
      triggerSource: "cron_retention",
      restart: true,
    });
    if (result.ok) enrolled += 1;
  }
  return { enrolled, scanned: subs?.length || 0 };
}

/** Abandon events from analytics (last 6h) with email in properties */
export async function enrollAbandonedLeadsFromAnalytics(sb: SupabaseClient, limit = 25) {
  const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  const { data: events } = await sb
    .from("analytics_events")
    .select("email, phone, properties, created_at")
    .eq("event_name", "growth_lead_abandon")
    .gte("created_at", since)
    .not("email", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  let enrolled = 0;
  const seen = new Set<string>();

  for (const ev of events || []) {
    const email = normalizeEmail(ev.email);
    if (!email || seen.has(email)) continue;
    seen.add(email);

    const props = (ev.properties || {}) as Record<string, unknown>;
    const result = await enrollInFlow(sb, {
      flowId: "abandoned_lead",
      email,
      phone: ev.phone,
      context: {
        vehicle: props.vehicle,
        interest_type: props.interest_type,
        campaign: "abandon_analytics",
      },
      triggerSource: "cron_abandon_analytics",
    });
    if (result.ok && !result.duplicate) enrolled += 1;
  }
  return { enrolled, scanned: events?.length || 0 };
}

/** Pro upsell for engaged free users (3+ result views, last 14d) */
export async function enrollUpsellFromAnalytics(sb: SupabaseClient, limit = 20) {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: events } = await sb
    .from("analytics_events")
    .select("email, created_at")
    .eq("event_name", "auto_results_view")
    .gte("created_at", since)
    .not("email", "is", null)
    .order("created_at", { ascending: false })
    .limit(800);

  const counts = new Map<string, number>();
  for (const ev of events || []) {
    const email = normalizeEmail(ev.email);
    if (!email) continue;
    counts.set(email, (counts.get(email) || 0) + 1);
  }

  let enrolled = 0;
  let scanned = 0;

  for (const [email, count] of counts) {
    if (count < 3) continue;
    scanned += 1;
    if (enrolled >= limit) break;

    const { data: profile } = await sb
      .from("profiles")
      .select("id, email")
      .ilike("email", email)
      .maybeSingle();

    if (profile?.id) {
      const { data: activeSub } = await sb
        .from("subscriptions")
        .select("id")
        .eq("user_id", profile.id)
        .in("status", ["active", "trialing"])
        .limit(1);

      if (activeSub?.length) continue;
    }

    const { data: existing } = await sb
      .from("lifecycle_enrollments")
      .select("id")
      .eq("flow_id", "upsell_campaigns")
      .eq("status", "active")
      .limit(1);

    if (existing?.length) continue;

    const result = await enrollInFlow(sb, {
      flowId: "upsell_campaigns",
      email,
      userId: profile?.id,
      context: { results_views: count, source: "cron_upsell" },
      triggerSource: "cron_upsell_analytics",
    });
    if (result.ok && !result.duplicate) enrolled += 1;
  }

  return { enrolled, scanned: counts.size };
}

/** D0: results rendered with email (analytics backup, last 12h) */
export async function enrollAutoResultsReadyFromAnalytics(sb: SupabaseClient, limit = 30) {
  const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

  const { data: events } = await sb
    .from("analytics_events")
    .select("email, properties, created_at")
    .in("event_name", ["auto_results_rendered", "auto_results_view"])
    .gte("created_at", since)
    .not("email", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);

  let enrolled = 0;
  const seen = new Set<string>();

  for (const ev of events || []) {
    const email = normalizeEmail(ev.email);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    if (enrolled >= limit) break;

    const result = await enrollInFlow(sb, {
      flowId: "auto_results_ready",
      email,
      service_opt_in: true,
      context: {
        service_opt_in: true,
        results_count: (ev.properties as Record<string, unknown>)?.count,
      },
      triggerSource: "cron_results_d0",
    });
    if (result.ok && !result.duplicate) enrolled += 1;
  }

  return { enrolled, scanned: events?.length || 0 };
}

/** D1: saw results 24–48h ago, no lead submit */
export async function enrollNoLeadReminderFromAnalytics(sb: SupabaseClient, limit = 25) {
  const windowEnd = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const windowStart = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: views } = await sb
    .from("analytics_events")
    .select("email, created_at")
    .in("event_name", ["auto_results_view", "auto_results_rendered"])
    .gte("created_at", windowStart)
    .lte("created_at", windowEnd)
    .not("email", "is", null)
    .limit(400);

  const { data: leads } = await sb
    .from("analytics_events")
    .select("email")
    .in("event_name", ["auto_lead_submit", "lead_submit"])
    .gte("created_at", windowStart)
    .not("email", "is", null)
    .limit(400);

  const leadEmails = new Set(
    (leads || []).map((row) => normalizeEmail(row.email)).filter(Boolean) as string[]
  );

  let enrolled = 0;
  const seen = new Set<string>();

  for (const ev of views || []) {
    const email = normalizeEmail(ev.email);
    if (!email || seen.has(email) || leadEmails.has(email)) continue;
    seen.add(email);
    if (enrolled >= limit) break;

    const result = await enrollInFlow(sb, {
      flowId: "results_no_lead_d1",
      email,
      context: { campaign: "no_lead_d1" },
      triggerSource: "cron_no_lead_d1",
    });
    if (result.ok && !result.duplicate) enrolled += 1;
  }

  return { enrolled, scanned: views?.length || 0 };
}

/** D3: lead in CRM 72h+, no active subscription */
export async function enrollLeadUpgradeFromLeads(sb: SupabaseClient, limit = 25) {
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

  const { data: leads } = await sb
    .from("auto_leads")
    .select("id, email, contact_name, vehicle, created_at, status")
    .not("email", "is", null)
    .lte("created_at", cutoff)
    .in("status", [
      "new",
      "first_contact",
      "called",
      "callback",
      "unreachable",
      "proposal_sent",
      "interested",
      "financing",
      "insurance",
      "contacted",
      "qualified",
    ])
    .order("created_at", { ascending: true })
    .limit(limit * 2);

  let enrolled = 0;

  for (const lead of leads || []) {
    if (enrolled >= limit) break;
    const email = normalizeEmail(lead.email);
    if (!email) continue;

    const { data: profile } = await sb
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (profile?.id) {
      const { data: activeSub } = await sb
        .from("subscriptions")
        .select("id")
        .eq("user_id", profile.id)
        .in("status", ["active", "trialing"])
        .limit(1);
      if (activeSub?.length) continue;
    }

    const result = await enrollInFlow(sb, {
      flowId: "lead_upgrade_d3",
      email,
      leadId: lead.id,
      displayName: lead.contact_name,
      context: { vehicle: lead.vehicle, lead_id: lead.id },
      triggerSource: "cron_lead_upgrade_d3",
    });
    if (result.ok && !result.duplicate) enrolled += 1;
  }

  return { enrolled, scanned: leads?.length || 0 };
}

/** Checkout started without completion (2h+ ago) */
export async function enrollCheckoutAbandonFromAnalytics(sb: SupabaseClient, limit = 20) {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const minAge = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const { data: started } = await sb
    .from("analytics_events")
    .select("email, user_id, created_at, properties")
    .eq("event_name", "checkout_started")
    .gte("created_at", since)
    .lte("created_at", minAge)
    .not("email", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: completed } = await sb
    .from("analytics_events")
    .select("email")
    .eq("event_name", "checkout_completed")
    .gte("created_at", since)
    .not("email", "is", null)
    .limit(400);

  const completedSet = new Set(
    (completed || []).map((row) => normalizeEmail(row.email)).filter(Boolean) as string[]
  );

  let enrolled = 0;
  const seen = new Set<string>();

  for (const ev of started || []) {
    const email = normalizeEmail(ev.email);
    if (!email || seen.has(email) || completedSet.has(email)) continue;
    seen.add(email);
    if (enrolled >= limit) break;

    const result = await enrollInFlow(sb, {
      flowId: "checkout_abandon_recovery",
      email,
      userId: ev.user_id || undefined,
      service_opt_in: true,
      context: {
        service_opt_in: true,
        billing_interval: (ev.properties as Record<string, unknown>)?.billing_interval,
      },
      triggerSource: "cron_checkout_abandon",
    });
    if (result.ok && !result.duplicate) enrolled += 1;
  }

  return { enrolled, scanned: started?.length || 0 };
}

export async function cancelFlowsForContact(
  sb: SupabaseClient,
  contactId: string,
  flowIds: string[],
  reason: string
) {
  const { data: enrollments } = await sb
    .from("lifecycle_enrollments")
    .select("id")
    .eq("contact_id", contactId)
    .eq("status", "active")
    .in("flow_id", flowIds);

  for (const row of enrollments || []) {
    await cancelEnrollment(sb, row.id, reason);
  }
}

const RECOVERY_CANCEL_FLOWS = [
  "abandoned_lead",
  "abandoned_onboarding",
  "finance_follow_up",
  "partner_follow_up",
  "auto_results_ready",
  "results_no_lead_d1",
  "checkout_abandon_recovery",
  "lead_upgrade_d3",
  "upsell_campaigns",
];

export async function cancelRecoveryFlowsByEmail(
  sb: SupabaseClient,
  email: string,
  reason = "converted"
) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return;

  const { data: contact } = await sb
    .from("lifecycle_contacts")
    .select("id")
    .ilike("email", normalized)
    .maybeSingle();

  if (!contact?.id) return;
  await cancelFlowsForContact(sb, contact.id, RECOVERY_CANCEL_FLOWS, reason);
}
