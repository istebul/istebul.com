import { createClient } from "@supabase/supabase-js";
import {
  mapPartnerStatusToSignals,
  recordOutcomeSignals,
} from "../_shared/outcome-capture.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CALLBACK_SECRET = Deno.env.get("PARTNER_CALLBACK_SECRET")!;

const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const ALLOWED_STATUSES = new Set([
  "accepted",
  "won",
  "lost",
  "paid",
  "closed",
  "funded",
  "delivered",
  "rejected",
]);

async function checkCallbackRateLimit(key: string) {
  const limit = 60;
  const windowMs = 60 * 1000;
  const now = Date.now();
  const windowStart = new Date(now - windowMs).toISOString();
  const rateKey = `partner_callback:${key}`;

  const { data, error } = await sb
    .from("auto_rate_limits")
    .select("key, count, window_start")
    .eq("key", rateKey)
    .maybeSingle();

  if (error) throw error;

  if (!data || new Date(data.window_start).getTime() < new Date(windowStart).getTime()) {
    await sb.from("auto_rate_limits").upsert({
      key: rateKey,
      count: 1,
      window_start: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
    }, { onConflict: "key" });
    return true;
  }

  if (data.count >= limit) return false;

  await sb
    .from("auto_rate_limits")
    .update({
      count: data.count + 1,
      updated_at: new Date(now).toISOString(),
    })
    .eq("key", rateKey);

  return true;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const incoming = req.headers.get("x-partner-callback-secret");
  if (!CALLBACK_SECRET || incoming !== CALLBACK_SECRET) {
    return json({ error: "forbidden" }, 403);
  }

  const clientIp =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  const allowed = await checkCallbackRateLimit(clientIp);
  if (!allowed) {
    return json({ error: "Too many requests" }, 429);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const leadId = String(body.lead_id || "").trim();
  const partnerStatus = String(body.partner_status || "").trim();
  const actualRevenue = Number(body.actual_revenue || 0);
  const notes = String(body.notes || "").slice(0, 500);
  const eventId = String(body.event_id || "").trim().slice(0, 120);

  if (!ALLOWED_STATUSES.has(partnerStatus)) {
    return json({ error: "Invalid partner_status" }, 400);
  }

  if (!leadId) {
    return json({ error: "lead_id is required" }, 400);
  }

  const idempotencyKey = eventId
    ? `${leadId}:${eventId}`
    : `${leadId}:${partnerStatus}:${notes.slice(0, 40)}`;

  const { data: existingEvent } = await sb
    .from("partner_callback_events")
    .select("idempotency_key")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingEvent) {
    return json({ ok: true, duplicate: true });
  }

  const values: Record<string, unknown> = {
    partner_status: partnerStatus,
    commission_notes: notes || null,
  };

  if (actualRevenue > 0) {
    values.actual_revenue = actualRevenue;
  }

  if (partnerStatus === "accepted") {
    values.status = "contacted";
  }

  if (["won", "paid", "closed", "funded", "delivered"].includes(partnerStatus)) {
    values.status = "won";
  }

  if (["lost", "rejected"].includes(partnerStatus)) {
    values.status = "lost";
  }

  const { data, error } = await sb
    .from("auto_leads")
    .update(values)
    .eq("id", leadId)
    .select("id, partner_status, status, actual_revenue");

  if (error) return json({ error: error.message }, 500);
  if (!data?.length) return json({ error: "Lead not found" }, 404);

  await sb.from("partner_callback_events").insert({
    idempotency_key: idempotencyKey,
    lead_id: leadId,
    partner_status: partnerStatus,
    payload: body,
  });

  const lead = data[0] as Record<string, unknown>;
  const partnerSignals = mapPartnerStatusToSignals(partnerStatus);
  if (partnerSignals.length) {
    try {
      const { data: leadMeta } = await sb
        .from("auto_leads")
        .select("decision_session_id, segment_key")
        .eq("id", leadId)
        .maybeSingle();

      await recordOutcomeSignals(sb, partnerSignals, {
        lead_id: leadId,
        decision_session_id: leadMeta?.decision_session_id ?? null,
        segment_key: leadMeta?.segment_key ?? null,
        idempotency_prefix: idempotencyKey,
      });
    } catch {
      /* non-blocking moat ingest */
    }
  }

  return json({ ok: true, updated: data.length, lead });
});
