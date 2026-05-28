import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isAllowedOrigin, resolveCorsOrigin } from "../_shared/cors-origins.ts";

const ALLOWED_EVENTS = new Set([
  "housing_page_view",
  "housing_step_completed",
  "housing_results_view",
  "housing_scenario_selected",
  "home_analysis_start",
  "home_analysis_step_completed",
  "home_results_view",
  "home_lead_submit",
  "home_report_save",
]);

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": resolveCorsOrigin(origin),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });
}

function clean(value: unknown, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function cleanNumber(value: unknown, min = 0, max = 1_000_000_000) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const isAllowedRequestOrigin = !origin || isAllowedOrigin(origin);

  if (req.method === "OPTIONS") {
    if (!isAllowedRequestOrigin) return new Response(null, { status: 403 });
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  if (!isAllowedRequestOrigin) return json({ error: "Forbidden origin" }, 403, "https://www.istebul.com");
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Service unavailable" }, 500, origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, origin);
  }

  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const type = String(body.type || "");
  const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata as Record<string, unknown> : {};
  const sessionId = clean(metadata.session_id || body.session_id, 128) || "anonymous";

  if (type === "event") {
    const eventType = clean(body.event_type, 80);
    if (!ALLOWED_EVENTS.has(eventType)) return json({ error: "Invalid event type" }, 400, origin);
    const { error } = await adminClient.from("housing_events").insert({
      session_id: sessionId,
      event_type: eventType,
      payload: metadata
    });
    if (error) return json({ error: "Event recording failed" }, 500, origin);
    return json({ ok: true }, 200, origin);
  }

  if (type === "lead") {
    const form = body.formData && typeof body.formData === "object" ? body.formData as Record<string, unknown> : body;
    const row = {
      session_id: sessionId,
      full_name: clean(form.full_name, 120) || null,
      email: clean(form.email, 200) || null,
      phone: clean(form.phone, 30) || null,
      housing_purpose: clean(form.housing_purpose, 80) || null,
      housing_type: clean(form.housing_type, 80) || null,
      total_budget: cleanNumber(form.total_budget),
      down_payment: cleanNumber(form.down_payment),
      loan_amount: cleanNumber(form.loan_amount),
      monthly_income: cleanNumber(form.monthly_income),
      term_months: cleanNumber(form.term_months, 1, 480),
      location_text: clean(form.location_text, 300) || null,
      priorities: clean(form.priorities, 1000) || null,
      ai_summary: clean(form.ai_summary, 4000) || null,
      decision_score: cleanNumber(form.decision_score, 0, 100),
      risk_level: clean(form.risk_level, 40) || null,
      monthly_capacity: cleanNumber(form.monthly_capacity),
      financing_needed: Boolean(form.financing_needed),
      status: "new",
      notes: clean(form.notes, 4000) || null
    };
    const { data, error } = await adminClient.from("housing_leads").insert(row).select("id").single();
    if (error) return json({ error: "Lead recording failed" }, 500, origin);
    return json({ ok: true, id: data?.id }, 200, origin);
  }

  return json({ error: "Invalid type" }, 400, origin);
});
