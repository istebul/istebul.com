import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  enrollAbandonedLeadsFromAnalytics,
  enrollAutoResultsReadyFromAnalytics,
  enrollCheckoutAbandonFromAnalytics,
  enrollInactiveUsers,
  enrollLeadUpgradeFromLeads,
  enrollNoLeadReminderFromAnalytics,
  enrollPartnerFollowUps,
  enrollRetentionFromSubscriptions,
  enrollUpsellFromAnalytics,
  processDueMessages,
} from "../_shared/lifecycle-engine.ts";
import {
  enrollChurnRescueFromSubscriptions,
  enrollInvoiceRemindersFromSubscriptions,
  enrollRenewalNudgesFromSubscriptions,
  enrollTrialEndingUpgrade,
  enrollUpgradePromptFromAnalytics,
} from "../_shared/revenue-ops.ts";
import {
  enrollOnboardingHelpFromNewUsers,
  enrollSupportFollowUpFromAnalytics,
} from "../_shared/customer-ops.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function unauthorized() {
  return new Response("forbidden", { status: 403 });
}

Deno.serve(async (req) => {
  const incoming = req.headers.get("x-lifecycle-cron-secret");
  const expected = Deno.env.get("LIFECYCLE_CRON_SECRET");

  if (!expected || incoming !== expected) {
    return unauthorized();
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  const sendResult = await processDueMessages(sb, 50);
  const partnerResult = await enrollPartnerFollowUps(sb, 25);
  const inactiveResult = await enrollInactiveUsers(sb, 30);
  const retentionResult = await enrollRetentionFromSubscriptions(sb, 20);
  const abandonResult = await enrollAbandonedLeadsFromAnalytics(sb, 25);
  const upsellResult = await enrollUpsellFromAnalytics(sb, 20);
  const resultsD0 = await enrollAutoResultsReadyFromAnalytics(sb, 30);
  const noLeadD1 = await enrollNoLeadReminderFromAnalytics(sb, 25);
  const leadUpgradeD3 = await enrollLeadUpgradeFromLeads(sb, 25);
  const checkoutAbandon = await enrollCheckoutAbandonFromAnalytics(sb, 20);
  const renewalNudge = await enrollRenewalNudgesFromSubscriptions(sb, 25);
  const invoiceReminder = await enrollInvoiceRemindersFromSubscriptions(sb, 25);
  const churnRescue = await enrollChurnRescueFromSubscriptions(sb, 20);
  const trialEnding = await enrollTrialEndingUpgrade(sb, 20);
  const upgradePrompt = await enrollUpgradePromptFromAnalytics(sb, 15);
  const onboardingHelp = await enrollOnboardingHelpFromNewUsers(sb, 25);
  const supportFollowUp = await enrollSupportFollowUpFromAnalytics(sb, 20);

  return new Response(
    JSON.stringify({
      ok: true,
      at: new Date().toISOString(),
      messages: sendResult,
      audiences: {
        partner_follow_up: partnerResult,
        inactive_users: inactiveResult,
        retention_campaigns: retentionResult,
        abandoned_lead: abandonResult,
        upsell_campaigns: upsellResult,
        auto_results_ready: resultsD0,
        results_no_lead_d1: noLeadD1,
        lead_upgrade_d3: leadUpgradeD3,
        checkout_abandon_recovery: checkoutAbandon,
        renewal_nudge: renewalNudge,
        invoice_reminder: invoiceReminder,
        churn_rescue: churnRescue,
        trial_ending_upgrade: trialEnding,
        upgrade_prompt: upgradePrompt,
        onboarding_help: onboardingHelp,
        support_follow_up: supportFollowUp,
      },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
