/** GDPR/KVKK consent tiers for lifecycle email sends */

export type ConsentTier = "marketing" | "service" | "transactional";

export const FLOW_CONSENT_TIER: Record<string, ConsentTier> = {
  signup_nurture: "service",
  auto_results_ready: "service",
  results_no_lead_d1: "marketing",
  lead_upgrade_d3: "marketing",
  checkout_abandon_recovery: "service",
  abandoned_onboarding: "service",
  abandoned_lead: "service",
  upsell_campaigns: "marketing",
  inactive_users: "marketing",
  retention_campaigns: "marketing",
  reactivation_ltv: "marketing",
  habit_loop_reminder: "service",
  saved_decision_revisit: "service",
  finance_follow_up: "transactional",
  partner_follow_up: "transactional",
};

export type ContactConsentMeta = {
  marketing_consent?: boolean;
  marketing_consent_at?: string;
  service_opt_in?: boolean;
  service_opt_in_at?: string;
};

export function mergeConsentMetadata(
  existing: Record<string, unknown> = {},
  input: {
    marketing_consent?: boolean;
    service_opt_in?: boolean;
  } = {}
): Record<string, unknown> {
  const next = { ...existing };
  const now = new Date().toISOString();

  if (input.marketing_consent === true) {
    next.marketing_consent = true;
    next.marketing_consent_at = now;
  }

  if (input.service_opt_in === true) {
    next.service_opt_in = true;
    next.service_opt_in_at = now;
  }

  return next;
}

export function contactAllowsFlow(
  metadata: Record<string, unknown> | null | undefined,
  flowId: string
): boolean {
  const tier = FLOW_CONSENT_TIER[flowId] || "marketing";
  const meta = metadata || {};
  const marketing = meta.marketing_consent === true;
  const service = meta.service_opt_in === true;

  if (tier === "transactional") return true;
  if (tier === "service") return marketing || service;
  return marketing;
}
