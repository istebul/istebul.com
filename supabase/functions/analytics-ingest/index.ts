import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  recordPlatformEvent,
  upsertAnalyticsSession,
} from "../_shared/platform-analytics.ts";
import { isAllowedOrigin, resolveCorsOrigin } from "../_shared/cors-origins.ts";

function corsHeaders(origin: string | null) {
  const allowedOrigin = resolveCorsOrigin(origin, "https://www.istebul.com", {
    allowLocalDev: true,
  });

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
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

  if (
    !data ||
    new Date(data.window_start).getTime() < new Date(windowStart).getTime()
  ) {
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
    .update({
      count: data.count + 1,
      updated_at: new Date(now).toISOString(),
    })
    .eq("key", key);

  return true;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, origin);
  }

  if (origin && !isAllowedOrigin(origin, { allowLocalDev: true })) {
    return json({ error: "Forbidden" }, 403, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Supabase environment missing" }, 500, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, origin);
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const clientIp =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  const allowed = await checkRateLimit(
    adminClient,
    `analytics_ingest:${clientIp}`,
    100,
    60 * 1000
  );

  if (!allowed) {
    return json({ error: "Too many requests" }, 429, origin);
  }

  const events = Array.isArray(body.events)
    ? body.events
    : [body];

  if (events.length > 25) {
    return json({ error: "Too many events in batch" }, 400, origin);
  }

  const sessionMeta = body.session && typeof body.session === "object"
    ? (body.session as Record<string, unknown>)
    : null;

  const consentAnalytics = sessionMeta?.consent_analytics === true;

  if (sessionMeta?.session_id) {
    await upsertAnalyticsSession(adminClient, {
      session_id: String(sessionMeta.session_id),
      user_id: sessionMeta.user_id ? String(sessionMeta.user_id) : null,
      page_path: sessionMeta.page_path ? String(sessionMeta.page_path) : null,
      referrer: sessionMeta.referrer ? String(sessionMeta.referrer) : null,
      utm_source: sessionMeta.utm_source ? String(sessionMeta.utm_source) : null,
      utm_medium: sessionMeta.utm_medium ? String(sessionMeta.utm_medium) : null,
      utm_campaign: sessionMeta.utm_campaign
        ? String(sessionMeta.utm_campaign)
        : null,
      utm_content: sessionMeta.utm_content ? String(sessionMeta.utm_content) : null,
      utm_term: sessionMeta.utm_term ? String(sessionMeta.utm_term) : null,
      device_type: sessionMeta.device_type ? String(sessionMeta.device_type) : null,
      consent_analytics: sessionMeta.consent_analytics === true,
    });
  }

  const results = [];

  for (const raw of events) {
    if (!raw || typeof raw !== "object") continue;

    const event = raw as Record<string, unknown>;
    const properties =
      event.properties && typeof event.properties === "object"
        ? (event.properties as Record<string, unknown>)
        : {};
    const attribution =
      event.attribution && typeof event.attribution === "object"
        ? (event.attribution as Record<string, unknown>)
        : {};

    try {
      const result = await recordPlatformEvent(adminClient, {
        event_name: String(event.event_name || ""),
        event_category: event.event_category
          ? String(event.event_category)
          : undefined,
        session_id: event.session_id ? String(event.session_id) : null,
        user_id: event.user_id ? String(event.user_id) : null,
        anonymous_id: event.anonymous_id ? String(event.anonymous_id) : null,
        page_path: event.page_path ? String(event.page_path) : null,
        page_section: event.page_section ? String(event.page_section) : null,
        funnel: event.funnel ? String(event.funnel) : null,
        funnel_step: event.funnel_step ? String(event.funnel_step) : null,
        step_index: event.step_index != null ? Number(event.step_index) : null,
        cta_id: event.cta_id ? String(event.cta_id) : null,
        element_id: event.element_id ? String(event.element_id) : null,
        email: consentAnalytics && event.email ? String(event.email) : null,
        phone: consentAnalytics && event.phone ? String(event.phone) : null,
        revenue_cents: event.revenue_cents != null
          ? Number(event.revenue_cents)
          : null,
        currency: event.currency ? String(event.currency) : null,
        properties,
        attribution,
        source: event.source ? String(event.source) : "web",
        idempotency_key: event.idempotency_key
          ? String(event.idempotency_key)
          : null,
      });

      results.push({ event_name: event.event_name, ...result });
    } catch (err) {
      results.push({
        event_name: event.event_name,
        ok: false,
        error: err instanceof Error ? err.message : "invalid_event",
      });
    }
  }

  return json({ ok: true, results }, 200, origin);
});
