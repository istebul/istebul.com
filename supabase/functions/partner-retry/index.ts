import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  applyDispatchResult,
  dispatchPartnerLead,
} from "../_shared/partner-dispatch.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

Deno.serve(async (req) => {
  const incoming = req.headers.get("x-retry-secret");
  const expected = Deno.env.get("RETRY_WORKER_SECRET");

  if (!expected || incoming !== expected) {
    return new Response("forbidden", { status: 403 });
  }

  const now = new Date().toISOString();

  const { data: leads, error } = await sb
    .from("auto_leads")
    .select("*")
    .eq("partner_status", "dispatch_failed")
    .lte("next_retry_at", now)
    .lt("dispatch_retry_count", 5)
    .limit(50);

  if (error) {
    return new Response(JSON.stringify(error), { status: 500 });
  }

  for (const lead of leads || []) {
    try {
      const dispatchResult = await dispatchPartnerLead(sb, {
        leadId: lead.id,
        payload: lead,
        trigger: "partner_retry",
        attemptNumber: Number(lead.dispatch_retry_count || 0) + 1,
      });

      if (dispatchResult.status === "dispatched" || dispatchResult.status === "dispatch_failed") {
        await applyDispatchResult(
          sb,
          lead.id,
          dispatchResult,
          Number(lead.dispatch_retry_count || 0)
        );
      }
    } catch {
      await applyDispatchResult(
        sb,
        lead.id,
        { status: "dispatch_failed", reason: "retry worker exception" },
        Number(lead.dispatch_retry_count || 0)
      );
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      processed: leads?.length || 0,
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
});
