/**
 * P11 — Customer ops automation (onboarding help, support follow-up).
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enrollInFlow } from "./lifecycle-engine.ts";

function normalizeEmail(value: unknown) {
  const email = String(value || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

/** New users (24–72h) without auto funnel start */
export async function enrollOnboardingHelpFromNewUsers(
  sb: SupabaseClient,
  limit = 25
) {
  const windowStart = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: profiles } = await sb
    .from("profiles")
    .select("id, email, full_name, created_at")
    .gte("created_at", windowStart)
    .lte("created_at", windowEnd)
    .not("email", "is", null)
    .limit(limit * 2);

  let enrolled = 0;
  for (const profile of profiles || []) {
    if (enrolled >= limit) break;
    const email = normalizeEmail(profile.email);
    if (!email) continue;

    const { data: started } = await sb
      .from("analytics_events")
      .select("id")
      .eq("user_id", profile.id)
      .in("event_name", ["auto_start", "auto_page_view", "wizard_complete"])
      .limit(1);

    if (started?.length) continue;

    const result = await enrollInFlow(sb, {
      flowId: "onboarding_help",
      email,
      userId: profile.id,
      displayName: profile.full_name,
      service_opt_in: true,
      triggerSource: "cron_onboarding_help",
    });
    if (result.ok && !result.duplicate) enrolled += 1;
  }

  return { enrolled, scanned: profiles?.length || 0 };
}

/** Users who escalated to support in last 12h */
export async function enrollSupportFollowUpFromAnalytics(
  sb: SupabaseClient,
  limit = 20
) {
  const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

  const { data: events } = await sb
    .from("analytics_events")
    .select("email, user_id, event_name, properties")
    .in("event_name", [
      "support_escalation",
      "support_ticket_submitted",
      "decision_feedback_contact",
    ])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(80);

  let enrolled = 0;
  const seen = new Set<string>();

  for (const ev of events || []) {
    const key = ev.user_id || normalizeEmail(ev.email) || "";
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (enrolled >= limit) break;

    const email = normalizeEmail(ev.email);
    if (!email && !ev.user_id) continue;

    const result = await enrollInFlow(sb, {
      flowId: "support_follow_up",
      email: email || undefined,
      userId: ev.user_id || undefined,
      service_opt_in: true,
      context: { source_event: ev.event_name },
      triggerSource: "cron_support_follow_up",
      restart: false,
    });
    if (result.ok && !result.duplicate) enrolled += 1;
  }

  return { enrolled, scanned: events?.length || 0 };
}
