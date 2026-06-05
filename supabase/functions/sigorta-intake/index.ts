import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isAllowedOrigin, resolveCorsOrigin } from "../_shared/cors-origins.ts";
import { scheduleVerticalPartnerDispatch } from "../_shared/vertical-partner-dispatch.ts";

const ALLOWED_EVENTS = new Set([
  "insurance_page_view",
  "insurance_analysis_started",
  "insurance_results_view",
  "insurance_interest",
  "insurance_pdf_download",
  "insurance_step_completed",
]);

const ALLOWED_INTERESTS = new Set([
  "insurance_quote",
  "insurance_review",
  "insurance_consultation",
  "insurance",
]);

function headers(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": resolveCorsOrigin(origin),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers(origin), "Content-Type": "application/json" },
  });
}

function cleanText(value: unknown, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function cleanNum(value: unknown, min = 0, max = 100) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

function calculateLeadScore(form: Record<string, unknown>) {
  let score = 40;
  const interest = String(form.interest_type || "");
  if (interest === "insurance_quote") score += 55;
  else if (interest === "insurance_review") score += 48;
  else if (interest === "insurance_consultation") score += 42;
  else if (interest === "insurance") score += 35;

  const decision = cleanNum(form.decision_score, 0, 100);
  if (decision >= 80) score += 20;
  else if (decision >= 65) score += 12;

  if (String(form.phone || "").replace(/\D/g, "").length >= 10) score += 8;
  if (String(form.email || "").includes("@")) score += 6;

  const priority =
    score >= 110 ? "very_hot" : score >= 85 ? "hot" : score >= 55 ? "warm" : "cold";

  return { score, priority };
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
  const adminClient = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

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
    const metadata =
      body.metadata && typeof body.metadata === "object"
        ? (body.metadata as Record<string, unknown>)
        : {};
    const { error } = await adminClient.from("sigorta_events").insert({
      session_id: sessionId,
      event_type: eventType,
      payload: metadata,
    });
    if (error) return json({ error: "Event recording failed" }, 500, origin);
    return json({ ok: true }, 200, origin);
  }

  if (type === "lead") {
    const form =
      body.formData && typeof body.formData === "object"
        ? (body.formData as Record<string, unknown>)
        : body;

    const interest = cleanText(form.interest_type, 40);
    if (interest && !ALLOWED_INTERESTS.has(interest)) {
      return json({ error: "Invalid interest type" }, 400, origin);
    }

    if (cleanText(form.privacy_consent, 20) !== "accepted") {
      return json({ error: "privacy_consent_required" }, 400, origin);
    }

    const { score: leadScore, priority } = calculateLeadScore(form);

    const profileJson =
      form.profile && typeof form.profile === "object"
        ? form.profile
        : Object.fromEntries(
            Object.entries(form).filter(
              ([k]) =>
                ![
                  "full_name",
                  "email",
                  "phone",
                  "session_id",
                  "interest_type",
                  "ai_summary",
                ].includes(k)
            )
          );

    const row = {
      session_id: sessionId,
      full_name: cleanText(form.full_name, 120) || null,
      email: cleanText(form.email, 200) || null,
      phone: cleanText(form.phone, 30) || null,
      interest_type: interest || "insurance_quote",
      insurance_type: cleanText(form.insurance_type, 40) || null,
      decision_score: cleanNum(form.decision_score, 0, 100) || null,
      protection_score: cleanNum(form.protection_score, 0, 100) || null,
      coverage_score: cleanNum(form.coverage_score, 0, 100) || null,
      cost_efficiency_score: cleanNum(form.cost_efficiency_score, 0, 100) || null,
      overall_risk: cleanText(form.overall_risk, 40) || null,
      ai_summary: cleanText(form.ai_summary, 4000) || null,
      profile_json: profileJson,
      selected_option: cleanText(form.selected_option, 120) || null,
      status: "new",
      notes: JSON.stringify({ lead_score: leadScore, priority }).slice(0, 500),
    };

    const { data, error } = await adminClient.from("sigorta_leads").insert(row).select("id").single();
    if (error) return json({ error: "Lead recording failed" }, 500, origin);

    const leadId = data?.id || null;
    if (leadId) {
      scheduleVerticalPartnerDispatch(adminClient, {
        leadTable: "sigorta_leads",
        leadId,
        vertical: "sigorta",
        lead: { ...row, lead_score: leadScore, priority },
        trigger: "sigorta_intake",
      });
    }

    return json({ ok: true, id: leadId, lead_score: leadScore, priority }, 200, origin);
  }

  return json({ error: "Invalid type" }, 400, origin);
});
