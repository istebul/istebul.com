import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CALLBACK_SECRET = Deno.env.get("PARTNER_CALLBACK_SECRET")!;

const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

const ALLOWED_STATUSES = new Set([
  "won",
  "lost",
  "paid",
  "closed",
  "funded",
  "delivered",
  "rejected"
]);

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const incoming = req.headers.get("x-partner-callback-secret");
  if (!CALLBACK_SECRET || incoming !== CALLBACK_SECRET) {
    return json({ error: "forbidden" }, 403);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const leadId = String(body.lead_id || "").trim();
  const phone = String(body.phone || "").replace(/\D/g, "");
  const partnerStatus = String(body.partner_status || "").trim();
  const actualRevenue = Number(body.actual_revenue || 0);
  const notes = String(body.notes || "").slice(0, 500);

  if (!ALLOWED_STATUSES.has(partnerStatus)) {
    return json({ error: "Invalid partner_status" }, 400);
  }

  if (!leadId && !phone) {
    return json({ error: "lead_id or phone is required" }, 400);
  }

  const values: Record<string, unknown> = {
    partner_status: partnerStatus,
    commission_notes: notes || null
  };

  if (actualRevenue > 0) {
    values.actual_revenue = actualRevenue;
  }

  if (["won", "paid", "closed", "funded", "delivered"].includes(partnerStatus)) {
    values.status = "won";
  }

  if (["lost", "rejected"].includes(partnerStatus)) {
    values.status = "lost";
  }

  let query = sb.from("auto_leads").update(values);

  if (leadId) query = query.eq("id", leadId);
  else query = query.eq("phone", phone);

  const { data, error } = await query.select("id, partner_status, status, actual_revenue");

  if (error) return json({ error: error.message }, 500);
  if (!data?.length) return json({ error: "Lead not found" }, 404);

  return json({ ok: true, updated: data.length, lead: data[0] });
});
