import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isAllowedOrigin, resolveCorsOrigin } from "../_shared/cors-origins.ts";

const ALLOWED_EVENTS = new Set([
  "vacation_page_view",
  "vacation_step_completed",
  "vacation_results_view",
  "vacation_option_selected",
  "vacation_partner_cta_click",
]);

function corsHeaders(origin: string | null) {
  const allowedOrigin = resolveCorsOrigin(origin);
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
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
    const { error: upsertError } = await adminClient.from("auto_rate_limits").upsert(
      {
        key,
        count: 1,
        window_start: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
      },
      { onConflict: "key" }
    );
    if (upsertError) throw upsertError;
    return true;
  }

  if (data.count >= limit) return false;

  const { error: updateError } = await adminClient
    .from("auto_rate_limits")
    .update({
      count: data.count + 1,
      updated_at: new Date(now).toISOString(),
    })
    .eq("key", key);

  if (updateError) throw updateError;
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

  const type = String(body.type || "");
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const clientIp = getClientIp(req);
  const metadata =
    body.metadata && typeof body.metadata === "object"
      ? Object.fromEntries(Object.entries(body.metadata as Record<string, unknown>).slice(0, 30))
      : {};

  const sessionId = clampSessionId(metadata.session_id || body.session_id);

  if (type === "event") {
    const allowed = await checkRateLimit(
      adminClient,
      `vacation:event:${clientIp}`,
      40,
      60 * 1000
    );
    if (!allowed) {
      return json({ error: "Too many requests" }, 429, origin);
    }

    const eventType = clampString(body.event_type || body.event_name, 80);
    if (!ALLOWED_EVENTS.has(eventType)) {
      return json({ error: "Invalid event type" }, 400, origin);
    }

    const { error } = await adminClient.from("vacation_events").insert({
      session_id: sessionId,
      event_type: eventType,
      payload: metadata,
    });

    if (error) {
      console.error("vacation event insert failed", error.code);
      return json({ error: "Event recording failed" }, 500, origin);
    }

    return json({ ok: true }, 200, origin);
  }

  if (type === "lead") {
    const allowed = await checkRateLimit(
      adminClient,
      `vacation:lead:${clientIp}`,
      8,
      10 * 60 * 1000
    );
    if (!allowed) {
      return json({ error: "Too many requests" }, 429, origin);
    }

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

    const leadRow = {
      session_id: sessionId,
      full_name: clampString(form.full_name || form.contact_name, 120) || null,
      email: email || null,
      phone: phone || null,
      vacation_goal: clampString(form.vacation_goal, 80) || null,
      budget_range: clampString(form.budget_range, 40) || null,
      people_type: clampString(form.people_type, 40) || null,
      vacation_type: clampString(form.vacation_type, 40) || null,
      date_range: clampString(form.date_range, 80) || null,
      duration: clampString(form.duration, 40) || null,
      user_note: clampString(form.user_note, 2000) || null,
      selected_option: clampString(form.selected_option, 120) || null,
      decision_score:
        form.decision_score != null ? Math.min(Math.max(Number(form.decision_score) || 0, 0), 100) : null,
      estimated_cost_range: clampString(form.estimated_cost_range, 80) || null,
      ai_summary: clampString(form.ai_summary, 4000) || null,
      status: "new",
      updated_at: new Date().toISOString(),
    };

    let existingId: string | null = null;
    if (sessionId && sessionId !== "anonymous") {
      const { data: existing } = await adminClient
        .from("vacation_leads")
        .select("id")
        .eq("session_id", sessionId)
        .eq("status", "new")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      existingId = existing?.id ?? null;
    }

    if (existingId) {
      const { error } = await adminClient
        .from("vacation_leads")
        .update(leadRow)
        .eq("id", existingId);
      if (error) {
        console.error("vacation lead update failed", error.code);
        return json({ error: "Lead update failed" }, 500, origin);
      }
      return json({ ok: true, id: existingId, updated: true }, 200, origin);
    }

    const { data, error } = await adminClient
      .from("vacation_leads")
      .insert(leadRow)
      .select("id")
      .single();

    if (error) {
      console.error("vacation lead insert failed", error.code);
      return json({ error: "Lead recording failed" }, 500, origin);
    }

    return json({ ok: true, id: data?.id }, 200, origin);
  }

  return json({ error: "Invalid type" }, 400, origin);
});
