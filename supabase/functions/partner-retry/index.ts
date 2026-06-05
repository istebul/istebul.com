import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  applyDispatchResult,
  applyVerticalDispatchResult,
  dispatchPartnerLead,
} from "../_shared/partner-dispatch.ts";
import { runVerticalPartnerDispatch } from "../_shared/vertical-partner-dispatch.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

const VERTICAL_RETRY_TABLES = [
  { table: "housing_leads", vertical: "konut" },
  { table: "vacation_leads", vertical: "tatil" },
  { table: "sigorta_leads", vertical: "sigorta" },
  { table: "kasko_leads", vertical: "kasko" },
  { table: "vertical_leads", vertical: null },
] as const;

async function fetchVerticalRetryLeads(table: string, now: string) {
  const { data, error } = await sb
    .from(table)
    .select("*")
    .eq("partner_dispatch_status", "failed")
    .lte("partner_dispatch_next_retry_at", now)
    .lt("partner_dispatch_retry_count", 5)
    .limit(20);

  if (error) return [];
  return data || [];
}

Deno.serve(async (req) => {
  const incoming = req.headers.get("x-retry-secret");
  const expected = Deno.env.get("RETRY_WORKER_SECRET");

  if (!expected || incoming !== expected) {
    return new Response("forbidden", { status: 403 });
  }

  const now = new Date().toISOString();
  let processed = 0;

  const { data: autoLeads, error } = await sb
    .from("auto_leads")
    .select("*")
    .eq("partner_status", "dispatch_failed")
    .lte("next_retry_at", now)
    .lt("dispatch_retry_count", 5)
    .limit(50);

  if (error) {
    return new Response(JSON.stringify(error), { status: 500 });
  }

  for (const lead of autoLeads || []) {
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
      processed += 1;
    } catch {
      await applyDispatchResult(
        sb,
        lead.id,
        { status: "dispatch_failed", reason: "retry worker exception" },
        Number(lead.dispatch_retry_count || 0)
      );
      processed += 1;
    }
  }

  for (const entry of VERTICAL_RETRY_TABLES) {
    const leads = await fetchVerticalRetryLeads(entry.table, now);

    for (const lead of leads) {
      const vertical = entry.vertical || String(lead.vertical || "finans");
      try {
        await runVerticalPartnerDispatch(sb, {
          leadTable: entry.table,
          leadId: lead.id,
          vertical,
          lead,
          trigger: "partner_retry",
          attemptNumber: Number(lead.partner_dispatch_retry_count || 0) + 1,
        });
        processed += 1;
      } catch {
        await applyVerticalDispatchResult(
          sb,
          entry.table,
          lead.id,
          { status: "dispatch_failed", reason: "retry worker exception" },
          Number(lead.partner_dispatch_retry_count || 0)
        );
        processed += 1;
      }
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      processed,
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
});
