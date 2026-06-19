import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isAllowedOrigin, resolveCorsOrigin } from "../_shared/cors-origins.ts";
import { scheduleVerticalPartnerDispatch } from "../_shared/vertical-partner-dispatch.ts";

const ALLOWED_EVENTS = new Set([
  "kasko_page_view",
  "kasko_analysis_started",
  "kasko_step",
  "kasko_results_view",
  "kasko_lead_submit",
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
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Service unavailable" }, 500, origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, origin);
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const type = String(body.type || "");
  const metadata =
    body.metadata && typeof body.metadata === "object"
      ? (body.metadata as Record<string, unknown>)
      : {};
  const sessionId = cleanText(metadata.session_id || body.session_id, 128) || "anonymous";

  if (type === "event") {
    const eventType = cleanText(body.event_type || body.event_name, 80);
    if (!ALLOWED_EVENTS.has(eventType)) return json({ error: "Invalid event type" }, 400, origin);
    return json({ ok: true }, 200, origin);
  }

  if (type === "lead") {
    const form =
      body.formData && typeof body.formData === "object"
        ? (body.formData as Record<string, unknown>)
        : body;

    if (cleanText(form.privacy_consent, 20) !== "accepted") {
      return json({ error: "privacy_consent_required" }, 400, origin);
    }

    const row = {
      session_id: sessionId,
      full_name: cleanText(form.full_name || form.contact_name, 120) || null,
      email: cleanText(form.email, 200) || null,
      phone: cleanText(form.phone, 30) || null,
      vehicle_info: cleanText(form.vehicle_info || form.vehicle, 200) || null,
      coverage_preference: cleanText(form.coverage_preference, 80) || null,
      decision_score: cleanNum(form.decision_score, 0, 100) || null,
      ai_summary: cleanText(form.ai_summary, 4000) || null,
      profile_json:
        form.profile && typeof form.profile === "object"
          ? form.profile
          : {},
      selected_option: cleanText(form.selected_option, 120) || null,
      status: "new",
      notes: cleanText(form.notes, 4000) || null,
    };

    const { data, error } = await adminClient
      .from("kasko_leads")
      .insert(row)
      .select("id")
      .single();

    if (error) return json({ error: "Lead recording failed" }, 500, origin);

    const leadId = data?.id || null;
    if (leadId) {
      scheduleVerticalPartnerDispatch(adminClient, {
        leadTable: "kasko_leads",
        leadId,
        vertical: "kasko",
        lead: row,
        trigger: "kasko_intake",
      });
    }

    return json({ ok: true, id: leadId }, 200, origin);
  }

  return json({ error: "Invalid type" }, 400, origin);
});
