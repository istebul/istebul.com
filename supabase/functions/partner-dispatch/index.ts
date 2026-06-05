import { createClient } from "@supabase/supabase-js";
import {
  applyDispatchResult,
  applyVerticalDispatchResult,
  dispatchPartnerLead,
} from "../_shared/partner-dispatch.ts";
import { runVerticalPartnerDispatch } from "../_shared/vertical-partner-dispatch.ts";
import {
  isVerticalLeadTable,
  LEAD_TABLE_ROUTE_TYPES,
} from "../_shared/vertical-partner-routing.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return false;

  const authClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData.user) return false;

  const { data: profile } = await sb
    .from("profiles")
    .select("role, is_banned")
    .eq("id", userData.user.id)
    .single();

  return profile?.role === "admin" && profile?.is_banned !== true;
}

function verticalFromLead(lead: Record<string, unknown>, leadTable: string) {
  if (leadTable === "vertical_leads") {
    return String(lead.vertical || "finans");
  }
  if (leadTable === "housing_leads") return "konut";
  if (leadTable === "vacation_leads") return "tatil";
  if (leadTable === "sigorta_leads") return "sigorta";
  if (leadTable === "kasko_leads") return "kasko";
  return LEAD_TABLE_ROUTE_TYPES[leadTable] || "konut";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const isAdmin = await requireAdmin(req);
  if (!isAdmin) return json({ error: "Forbidden: admin only" }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const leadId = String(body.lead_id || "").trim();
  if (!leadId) return json({ error: "lead_id required" }, 400);

  const leadTable = String(body.lead_table || "auto_leads").trim();

  const { data: lead, error: leadError } = await sb
    .from(leadTable)
    .select("*")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) return json({ error: "Lead not found" }, 404);

  try {
    if (isVerticalLeadTable(leadTable)) {
      const vertical = verticalFromLead(lead, leadTable);
      const dispatchResult = await runVerticalPartnerDispatch(sb, {
        leadTable,
        leadId: lead.id,
        vertical,
        lead,
        trigger: "partner_dispatch",
        attemptNumber: Number(lead.partner_dispatch_retry_count || 0) + 1,
        manualDispatch: true,
        skipHotCheck: Boolean(body.force),
      });

      if (!dispatchResult) {
        return json({
          ok: false,
          status: "skipped",
          reason: "not_dispatchable",
        }, 400);
      }

      if (dispatchResult.status === "skipped") {
        return json({
          ok: false,
          status: "skipped",
          reason: dispatchResult.reason,
        }, 400);
      }

      if (dispatchResult.status === "dispatched") {
        return json({
          ok: true,
          status: "dispatched",
          endpoint: dispatchResult.endpoint,
          route: dispatchResult.route,
          failover_used: dispatchResult.failover_used || false,
        });
      }

      return json({
        ok: false,
        status: "dispatch_failed",
        error: dispatchResult.reason || "dispatch failed",
      }, 502);
    }

    const dispatchResult = await dispatchPartnerLead(sb, {
      leadId: lead.id,
      payload: lead,
      trigger: "partner_dispatch",
      attemptNumber: Number(lead.dispatch_retry_count || 0) + 1,
      manualDispatch: true,
      skipHotCheck: Boolean(body.force),
    });

    if (dispatchResult.status === "skipped") {
      return json({
        ok: false,
        status: "skipped",
        reason: dispatchResult.reason,
      }, 400);
    }

    if (dispatchResult.status === "dispatched" || dispatchResult.status === "dispatch_failed") {
      await applyDispatchResult(
        sb,
        lead.id,
        dispatchResult,
        Number(lead.dispatch_retry_count || 0)
      );
    }

    if (dispatchResult.status === "dispatched") {
      return json({
        ok: true,
        status: "dispatched",
        endpoint: dispatchResult.endpoint,
        route: dispatchResult.route,
        failover_used: dispatchResult.failover_used || false,
      });
    }

    return json({
      ok: false,
      status: "dispatch_failed",
      error: dispatchResult.reason || "dispatch failed",
    }, 502);
  } catch {
    if (isVerticalLeadTable(leadTable)) {
      await applyVerticalDispatchResult(
        sb,
        leadTable,
        lead.id,
        { status: "dispatch_failed", reason: "manual dispatch exception" },
        Number(lead.partner_dispatch_retry_count || 0)
      );
    } else {
      await applyDispatchResult(
        sb,
        lead.id,
        { status: "dispatch_failed", reason: "manual dispatch exception" },
        Number(lead.dispatch_retry_count || 0)
      );
    }

    return json({
      ok: false,
      status: "dispatch_failed",
      error: "Network exception",
    }, 502);
  }
});
