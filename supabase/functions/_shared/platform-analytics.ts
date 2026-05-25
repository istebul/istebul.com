export const ANALYTICS_CATEGORIES = new Set([
  "page",
  "cta",
  "auth",
  "subscription",
  "lead",
  "auto",
  "finance",
  "partner",
  "decision",
  "admin",
  "revenue",
  "growth",
  "lifecycle",
]);

export const ALLOWED_ANALYTICS_EVENTS = new Set([
  // Page journeys
  "page_view",
  "page_exit",
  "route_change",
  // CTA
  "cta_click",
  // Auth
  "auth_modal_open",
  "auth_login_start",
  "auth_login_success",
  "auth_login_failed",
  "auth_register_start",
  "auth_register_success",
  "auth_register_failed",
  "auth_logout",
  // Subscription
  "checkout_started",
  "checkout_abandoned",
  "pricing_view",
  "checkout_completed",
  "subscription_created",
  "subscription_updated",
  "subscription_canceled",
  "invoice_paid",
  "invoice_failed",
  "trial_started",
  // Lead
  "lead_submit",
  "lead_duplicate",
  // Auto funnel (legacy names preserved)
  "auto_page_view",
  "auto_quiz_submit",
  "auto_form_started",
  "auto_form_submitted",
  "auto_analysis_started",
  "auto_results_view",
  "auto_results_rendered",
  "auto_modal_open",
  "auto_lead_submit",
  "auto_wizard_step",
  "auto_wizard_complete",
  "auto_wizard_dropoff",
  "auto_whatsapp_click",
  "auto_whatsapp_lead_intent",
  "auto_finance_click",
  "auto_insurance_click",
  "auto_vehicle_offer_click",
  "auto_premium_report_click",
  "auto_premium_paywall_view",
  // Finance funnel
  "finance_funnel_start",
  "finance_funnel_step",
  "finance_funnel_complete",
  "finance_offer_view",
  // Partner
  "partner_dispatch_success",
  "partner_dispatch_failed",
  "partner_dispatch_skipped",
  "partner_landing_view",
  "partner_application_start",
  "partner_application_submit",
  "partner_docs_view",
  "partner_onboarding_view",
  "partner_webhook_draft_saved",
  "partner_funnel_qualification",
  "partner_funnel_lead_needs",
  "partner_funnel_webhook",
  "partner_funnel_test_payload",
  "partner_onboarding_complete",
  "partner_trust_view",
  "partner_pricing_view",
  "partner_pricing_cta",
  // Decision moat (P3)
  "decision_feedback_helpful",
  "decision_feedback_unclear",
  "decision_feedback_contact",
  "feedback_requested",
  "feedback_submitted",
  "recommendation_success",
  "recommendation_rejected",
  "outcome_insight_view",
  "moat_differentiation_view",
  "moat_architecture_view",
  "moat_defensibility_snapshot",
  "outcome_signal_vehicle_recommended_selected",
  "outcome_signal_financing_accepted",
  "outcome_signal_user_satisfaction",
  "outcome_signal_recommendation_usefulness",
  "outcome_signal_confidence_accuracy",
  "outcome_signal_lead_submitted",
  "outcome_signal_lead_closed",
  "outcome_signal_partner_sale",
  // Admin CRM
  "crm_lead_status_change",
  "crm_follow_up_complete",
  "crm_partner_status_change",
  "crm_manual_dispatch",
  // Revenue attribution
  "revenue_attributed",
  "affiliate_click",
  "upsell_view",
  "upsell_click",
  "upsell_conversion",
  // Canonical growth funnel (P1.5)
  "landing_visit",
  "hero_cta_click",
  "auto_start",
  "wizard_step",
  "wizard_complete",
  "results_view",
  "checkout_start",
  "checkout_complete",
  "paid_conversion",
  // Growth engine
  "growth_referral_land",
  "growth_referral_share",
  "growth_referral_convert",
  "referral_link_created",
  "referral_link_clicked",
  "referral_signup",
  "referral_conversion",
  "growth_lead_abandon",
  "growth_lead_recovery_click",
  "growth_email_click",
  "growth_crm_touch",
  "growth_viral_share",
  "growth_experiment_exposure",
  "growth_experiment_conversion",
  "paid_click_capture",
  "paid_conversion_signal",
  "paid_landing_view",
  "paid_funnel_step",
  "paid_capi_dispatch",
  "retention_engagement",
  "retention_return_visit",
  "retention_decision_saved",
  "retention_decision_revisited",
  "retention_reactivation_land",
  "retention_revisit_prompt",
  "retention_revisit_triggered",
  "retention_habit_action",
  "retention_habit_weekly_visit",
  "retention_habit_milestone",
  "partner_sales_touch",
  "partner_outbound_sent",
  "partner_objection_view",
  "partner_deal_scored",
  "partner_closing_kit_view",
  "partner_crm_stage_change",
  "newsletter_subscribe",
  // Lifecycle CRM
  "lifecycle_enrolled",
  "lifecycle_message_sent",
  "lifecycle_message_failed",
  "lifecycle_enroll_requested",
  "lifecycle_unsubscribe",
  "lifecycle_enroll_requested",
]);

const AUTO_EVENT_NAMES = new Set(
  [...ALLOWED_ANALYTICS_EVENTS].filter((name) => name.startsWith("auto_"))
);

export function eventCategoryFor(name: string, fallback?: string) {
  if (fallback && ANALYTICS_CATEGORIES.has(fallback)) return fallback;
  if (name.startsWith("auto_")) return "auto";
  if (name.startsWith("finance_")) return "finance";
  if (name.startsWith("auth_")) return "auth";
  if (name.startsWith("partner_")) return "partner";
  if (
    name.startsWith("decision_") ||
    name === "outcome_insight_view" ||
    name === "moat_differentiation_view" ||
    name === "moat_architecture_view" ||
    name === "moat_defensibility_snapshot" ||
    name.startsWith("feedback_") ||
    name === "recommendation_success" ||
    name === "recommendation_rejected"
  ) {
    return "decision";
  }
  if (name.startsWith("crm_")) return "admin";
  if (
    name.startsWith("growth_") ||
    name.startsWith("referral_") ||
    name === "newsletter_subscribe" ||
    name === "landing_visit" ||
    name === "hero_cta_click" ||
    name === "auto_start" ||
    name === "wizard_step" ||
    name === "wizard_complete" ||
    name === "results_view" ||
    name === "checkout_start" ||
    name === "checkout_complete" ||
    name === "paid_conversion" ||
    name === "pricing_view"
  ) {
    return "growth";
  }
  if (name.startsWith("lifecycle_")) return "lifecycle";
  if (name.startsWith("page_") || name === "route_change") return "page";
  if (name.startsWith("cta_")) return "cta";
  if (
    name.startsWith("checkout_") ||
    name.startsWith("subscription_") ||
    name.startsWith("invoice_") ||
    name === "trial_started"
  ) {
    return "subscription";
  }
  if (name.startsWith("lead_")) return "lead";
  if (name.startsWith("revenue_") || name.startsWith("upsell_") || name === "affiliate_click") {
    return "revenue";
  }
  return "page";
}

export function isAutoLegacyEvent(name: string) {
  return AUTO_EVENT_NAMES.has(name);
}

export type PlatformEventInput = {
  event_name: string;
  event_category?: string;
  session_id?: string | null;
  user_id?: string | null;
  anonymous_id?: string | null;
  page_path?: string | null;
  page_section?: string | null;
  funnel?: string | null;
  funnel_step?: string | null;
  step_index?: number | null;
  cta_id?: string | null;
  element_id?: string | null;
  email?: string | null;
  phone?: string | null;
  revenue_cents?: number | null;
  currency?: string | null;
  properties?: Record<string, unknown>;
  attribution?: Record<string, unknown>;
  source?: string;
  idempotency_key?: string | null;
};

function clampString(value: unknown, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

function clampProperties(value: Record<string, unknown> | undefined) {
  const entries = Object.entries(value || {}).slice(0, 30);
  const out: Record<string, unknown> = {};
  for (const [key, val] of entries) {
    if (typeof val === "string") out[key] = val.slice(0, 500);
    else if (typeof val === "number" || typeof val === "boolean" || val === null) {
      out[key] = val;
    } else if (typeof val === "object") {
      out[key] = JSON.stringify(val).slice(0, 500);
    }
  }
  return out;
}

export async function upsertAnalyticsSession(
  adminClient: { from: (table: string) => any },
  session: {
    session_id: string;
    user_id?: string | null;
    page_path?: string | null;
    referrer?: string | null;
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_content?: string | null;
    utm_term?: string | null;
    device_type?: string | null;
    consent_analytics?: boolean;
  }
) {
  const now = new Date().toISOString();
  const { data: existing } = await adminClient
    .from("analytics_sessions")
    .select("session_id, first_page_path")
    .eq("session_id", session.session_id)
    .maybeSingle();

  if (!existing) {
    await adminClient.from("analytics_sessions").insert({
      session_id: session.session_id,
      user_id: session.user_id || null,
      first_page_path: session.page_path || null,
      last_page_path: session.page_path || null,
      referrer: session.referrer || null,
      utm_source: session.utm_source || null,
      utm_medium: session.utm_medium || null,
      utm_campaign: session.utm_campaign || null,
      utm_content: session.utm_content || null,
      utm_term: session.utm_term || null,
      device_type: session.device_type || null,
      consent_analytics: session.consent_analytics === true,
      created_at: now,
      updated_at: now,
    });
    return;
  }

  await adminClient
    .from("analytics_sessions")
    .update({
      user_id: session.user_id || existing.user_id || null,
      last_page_path: session.page_path || existing.last_page_path || null,
      updated_at: now,
    })
    .eq("session_id", session.session_id);
}

export async function recordPlatformEvent(
  adminClient: { from: (table: string) => any },
  input: PlatformEventInput
) {
  const eventName = clampString(input.event_name, 80);
  if (!ALLOWED_ANALYTICS_EVENTS.has(eventName)) {
    throw new Error(`Invalid event_name: ${eventName}`);
  }

  const category = eventCategoryFor(eventName, input.event_category);
  const row = {
    event_name: eventName,
    event_category: category,
    session_id: input.session_id ? clampString(input.session_id, 64) : null,
    user_id: input.user_id || null,
    anonymous_id: input.anonymous_id ? clampString(input.anonymous_id, 64) : null,
    page_path: input.page_path ? clampString(input.page_path, 200) : null,
    page_section: input.page_section ? clampString(input.page_section, 80) : null,
    funnel: input.funnel ? clampString(input.funnel, 40) : null,
    funnel_step: input.funnel_step ? clampString(input.funnel_step, 80) : null,
    step_index:
      input.step_index != null && Number.isFinite(Number(input.step_index))
        ? Number(input.step_index)
        : null,
    cta_id: input.cta_id ? clampString(input.cta_id, 80) : null,
    element_id: input.element_id ? clampString(input.element_id, 80) : null,
    email: input.email ? clampString(input.email, 120) : null,
    phone: input.phone ? clampString(input.phone, 20) : null,
    revenue_cents: Math.max(0, Math.min(Number(input.revenue_cents || 0), 100000000)),
    currency: clampString(input.currency || "TRY", 8),
    properties: clampProperties(input.properties),
    attribution: clampProperties(input.attribution),
    source: clampString(input.source || "web", 32),
    idempotency_key: input.idempotency_key
      ? clampString(input.idempotency_key, 120)
      : null,
  };

  const { error } = await adminClient.from("analytics_events").insert(row);
  if (error) {
    if (error.code === "23505") return { ok: true, duplicate: true };
    throw error;
  }

  if (isAutoLegacyEvent(eventName)) {
    await adminClient.from("auto_events").insert({
      event_name: eventName,
      email: row.email,
      phone: row.phone,
      metadata: {
        ...row.properties,
        session_id: row.session_id,
        funnel: row.funnel,
        funnel_step: row.funnel_step,
      },
    });
  }

  return { ok: true };
}
