import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  enrollAbandonedLeadsFromAnalytics,
  enrollInactiveUsers,
  enrollPartnerFollowUps,
  enrollRetentionFromSubscriptions,
  processDueMessages,
} from "../_shared/lifecycle-engine.ts";

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

  const sendResult = await processDueMessages(sb, 80);
  const partnerResult = await enrollPartnerFollowUps(sb, 30);
  const inactiveResult = await enrollInactiveUsers(sb, 40);
  const retentionResult = await enrollRetentionFromSubscriptions(sb, 20);
  const abandonResult = await enrollAbandonedLeadsFromAnalytics(sb, 25);

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
      },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
