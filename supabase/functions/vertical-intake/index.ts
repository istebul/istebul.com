import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isAllowedOrigin, resolveCorsOrigin } from "../_shared/cors-origins.ts";
import { scheduleVerticalPartnerDispatch } from "../_shared/vertical-partner-dispatch.ts";

const ALLOWED_VERTICALS = new Set(["konut", "finans"]);

const ALLOWED_EVENTS: Record<string, Set<string>> = {
  konut: new Set([
    "konut_start",
    "konut_step_completed",
    "konut_results_view",
    "konut_option_selected",
    "konut_selection_confirmed",
    "konut_lead_submit",
  ]),
  finans: new Set([
    "finans_start",
    "finans_step_completed",
    "finans_results_view",
    "finans_option_selected",
    "finans_selection_confirmed",
    "finans_lead_submit",
  ]),
};

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": resolveCorsOrigin(origin),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

function clampString(value: unknown, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function clampSessionId(value: unknown) {
  const id = clampString(value, 128);
  return id || "anonymous";
}

function isValidEmail(value: unknown) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function cleanPhone(value: unknown) {
  return String(value || "").replace(/\D/g, "").slice(0, 15);
}

function getClientIp(req: Request) {
  return req.headers.get("cf-connecting-ip") || "unknown";
}

async function checkRateLimit(
  adminClient: ReturnType<typeof createClient>,
  key: string,
  limit: number,
  windowMs: number
) {
  const now = Date.now();
  const windowStart = new Date(now - windowMs).toISOString();
  const { data, error } = await adminClient
    .from("auto_rate_limits")
    .select("key, count, window_start")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  if (!data || new Date(data.window_start).getTime() < new Date(windowStart).getTime()) {
    await adminClient.from("auto_rate_limits").upsert(
      {
        key,
        count: 1,
        window_start: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
      },
      { onConflict: "key" }
    );
    return true;
  }
  if (data.count >= limit) return false;
  await adminClient
    .from("auto_rate_limits")
    .update({ count: data.count + 1, updated_at: new Date(now).toISOString() })
    .eq("key", key);
  return true;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const isAllowedRequestOrigin = !origin || isAllowedOrigin(origin);

  if (req.method === "OPTIONS") {
    if (!isAllowedRequestOrigin) return new Response(null, { status: 403 });
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  if (!isAllowedRequestOrigin) {
    return json({ error: "Forbidden origin" }, 403, "https://www.istebul.com");
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Service unavailable" }, 500, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, origin);
  }

  const vertical = clampString(body.vertical, 16);
  if (!ALLOWED_VERTICALS.has(vertical)) {
    return json({ error: "Invalid vertical" }, 400, origin);
  }

  const type = String(body.type || "");
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const clientIp = getClientIp(req);
  const metadata =
    body.metadata && typeof body.metadata === "object"
      ? Object.fromEntries(Object.entries(body.metadata as Record<string, unknown>).slice(0, 40))
      : {};

  const sessionId = clampSessionId(metadata.session_id || body.session_id);

  if (type === "event") {
    const allowed = await checkRateLimit(
      adminClient,
      `vertical:event:${vertical}:${clientIp}`,
      50,
      60 * 1000
    );
    if (!allowed) return json({ error: "Too many requests" }, 429, origin);

    const eventType = clampString(body.event_type || body.event_name, 80);
    if (!ALLOWED_EVENTS[vertical]?.has(eventType)) {
      return json({ error: "Invalid event type" }, 400, origin);
    }

    const { error } = await adminClient.from("vertical_events").insert({
      vertical,
      session_id: sessionId,
      event_type: eventType,
      payload: metadata,
    });

    if (error) {
      console.error("vertical event insert failed", error.code);
      return json({ error: "Event recording failed" }, 500, origin);
    }

    return json({ ok: true }, 200, origin);
  }

  if (type === "lead") {
    const allowed = await checkRateLimit(
      adminClient,
      `vertical:lead:${vertical}:${clientIp}`,
      8,
      10 * 60 * 1000
    );
    if (!allowed) return json({ error: "Too many requests" }, 429, origin);

    const email = String(body.email || metadata.email || "")
      .trim()
      .toLowerCase()
      .slice(0, 200);
    const phone = cleanPhone(body.phone || metadata.phone);

    if (email && !isValidEmail(email)) {
      return json({ error: "Invalid email" }, 400, origin);
    }
    if (phone && (phone.length < 10 || phone.length > 15)) {
      return json({ error: "Invalid phone" }, 400, origin);
    }

    const form =
      body.formData && typeof body.formData === "object"
        ? (body.formData as Record<string, unknown>)
        : body;

    const profileJson =
      form.profile && typeof form.profile === "object"
        ? form.profile
        : Object.fromEntries(
            Object.entries(form).filter(([k]) => !["full_name", "email", "phone", "session_id"].includes(k))
          );

    const leadRow = {
      vertical,
      session_id: sessionId,
      full_name: clampString(form.full_name, 120) || null,
      email: email || null,
      phone: phone || null,
      profile_json: profileJson,
      selected_option: clampString(form.selected_option, 120) || null,
      decision_score:
        form.decision_score != null
          ? Math.min(Math.max(Number(form.decision_score) || 0, 0), 100)
          : null,
      result_summary: clampString(form.result_summary, 500) || null,
      ai_summary: clampString(form.ai_summary, 4000) || null,
      status: "new",
      updated_at: new Date().toISOString(),
    };

    let existingId: string | null = null;
    if (sessionId && sessionId !== "anonymous") {
      const { data: existing } = await adminClient
        .from("vertical_leads")
        .select("id")
        .eq("vertical", vertical)
        .eq("session_id", sessionId)
        .eq("status", "new")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      existingId = existing?.id ?? null;
    }

    if (existingId) {
      const { error } = await adminClient.from("vertical_leads").update(leadRow).eq("id", existingId);
      if (error) return json({ error: "Lead update failed" }, 500, origin);
      scheduleVerticalPartnerDispatch(adminClient, {
        leadTable: "vertical_leads",
        leadId: existingId,
        vertical,
        lead: leadRow,
        trigger: "vertical_intake",
      });
      return json({ ok: true, id: existingId, updated: true }, 200, origin);
    }

    const { data, error } = await adminClient
      .from("vertical_leads")
      .insert(leadRow)
      .select("id")
      .single();

    if (error) return json({ error: "Lead recording failed" }, 500, origin);

    const leadId = data?.id || null;
    if (leadId) {
      scheduleVerticalPartnerDispatch(adminClient, {
        leadTable: "vertical_leads",
        leadId,
        vertical,
        lead: leadRow,
        trigger: "vertical_intake",
      });
    }

    return json({ ok: true, id: leadId }, 200, origin);
  }

  return json({ error: "Invalid type" }, 400, origin);
});
