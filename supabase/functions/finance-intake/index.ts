import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isAllowedOrigin, resolveCorsOrigin } from "../_shared/cors-origins.ts";

const ALLOWED_EVENTS = new Set([
  "finance_page_view",
  "finance_step_completed",
  "finance_results_view",
  "finance_scenario_selected",
]);

function headers(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": resolveCorsOrigin(origin),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers(origin), "Content-Type": "application/json" } });
}

function cleanText(value: unknown, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function cleanNum(value: unknown, min = 0, max = 1_000_000_000) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const allowed = !origin || isAllowedOrigin(origin);

  if (req.method === "OPTIONS") {
    if (!allowed) return new Response(null, { status: 403 });
    return new Response("ok", { headers: headers(origin) });
  }
  if (!allowed) return json({ error: "Forbidden origin" }, 403, "https://www.istebul.com");
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) return json({ error: "Service unavailable" }, 500, origin);
  const adminClient = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, origin);
  }
  const type = String(body.type || "");
  const sessionId = cleanText(body.session_id, 128) || "anonymous";

  if (type === "event") {
    const eventType = cleanText(body.event_type, 80);
    if (!ALLOWED_EVENTS.has(eventType)) return json({ error: "Invalid event type" }, 400, origin);
    const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : {};
    const { error } = await adminClient.from("finance_events").insert({
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
      full_name: cleanText(form.full_name, 120) || null,
      email: cleanText(form.email, 200) || null,
      phone: cleanText(form.phone, 30) || null,
      finance_purpose: cleanText(form.finance_purpose, 80) || null,
      requested_amount: cleanNum(form.requested_amount),
      down_payment: cleanNum(form.down_payment),
      loan_amount: cleanNum(form.loan_amount),
      term_months: cleanNum(form.term_months, 1, 120),
      monthly_rate: cleanNum(form.monthly_rate, 0, 100),
      monthly_income: cleanNum(form.monthly_income),
      existing_debt: cleanNum(form.existing_debt),
      fixed_expenses: cleanNum(form.fixed_expenses),
      priorities: cleanText(form.priorities, 1000) || null,
      decision_score: cleanNum(form.decision_score, 0, 100),
      risk_level: cleanText(form.risk_level, 40) || null,
      ai_summary: cleanText(form.ai_summary, 4000) || null,
      status: "new",
      notes: null
    };
    const { data, error } = await adminClient.from("finance_leads").insert(row).select("id").single();
    if (error) return json({ error: "Lead recording failed" }, 500, origin);
    return json({ ok: true, id: data?.id }, 200, origin);
  }

  return json({ error: "Invalid type" }, 400, origin);
});
