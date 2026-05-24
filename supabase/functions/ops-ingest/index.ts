import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  CLIENT_OPS_EVENTS,
  recordOperationalEvent,
} from "../_shared/operational-observability.ts";

const allowedOrigins = new Set([
  "https://istebul.com",
  "https://www.istebul.com",
  "https://istebul-com.pages.dev",
  "http://localhost:3000",
  "http://localhost:5173",
]);

function corsHeaders(origin: string | null) {
  const allowedOrigin = origin && allowedOrigins.has(origin)
    ? origin
    : "https://www.istebul.com";
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
  sb: ReturnType<typeof createClient>,
  key: string,
  limit: number,
  windowMs: number
) {
  const now = Date.now();
  const windowStart = new Date(now - windowMs).toISOString();

  const { data, error } = await sb
    .from("auto_rate_limits")
    .select("key, count, window_start")
    .eq("key", key)
    .maybeSingle();

  if (error) throw error;

  if (
    !data ||
    new Date(data.window_start).getTime() < new Date(windowStart).getTime()
  ) {
    await sb.from("auto_rate_limits").upsert(
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

  await sb
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
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  const allowed = await checkRateLimit(sb, `ops_ingest:${ip}`, 60, 60 * 1000);
  if (!allowed) {
    return json({ error: "rate_limited" }, 429, origin);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400, origin);
  }

  const events = Array.isArray(body.events) ? body.events : [body];
  if (events.length > 20) {
    return json({ error: "too_many_events" }, 400, origin);
  }

  const results = [];

  for (const raw of events) {
    if (!raw || typeof raw !== "object") continue;
    const ev = raw as Record<string, unknown>;
    const eventName = String(ev.event_name || "");

    if (!CLIENT_OPS_EVENTS.has(eventName)) {
      results.push({ event_name: eventName, ok: false, error: "forbidden_event" });
      continue;
    }

    try {
      const result = await recordOperationalEvent(sb, {
        event_name: eventName,
        category: String(ev.category || "error"),
        severity: ev.severity ? String(ev.severity) : undefined,
        source: String(ev.source || "web"),
        fingerprint: ev.fingerprint ? String(ev.fingerprint) : null,
        idempotency_key: ev.idempotency_key ? String(ev.idempotency_key) : null,
        user_id: ev.user_id ? String(ev.user_id) : null,
        session_id: ev.session_id ? String(ev.session_id) : null,
        http_status: ev.http_status != null ? Number(ev.http_status) : null,
        duration_ms: ev.duration_ms != null ? Number(ev.duration_ms) : null,
        properties:
          ev.properties && typeof ev.properties === "object"
            ? (ev.properties as Record<string, unknown>)
            : {},
      });
      results.push({ event_name: eventName, ...result });
    } catch (err) {
      results.push({
        event_name: eventName,
        ok: false,
        error: err instanceof Error ? err.message : "insert_failed",
      });
    }
  }

  return json({ ok: true, results }, 200, origin);
});
