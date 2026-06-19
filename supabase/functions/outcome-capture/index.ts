import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  CLIENT_OUTCOME_SIGNAL_TYPES,
  recordOutcomeSignal,
  sanitizeOutcomeProperties,
} from "../_shared/outcome-capture.ts";
import { buildSegmentKey } from "../_shared/scoring-intelligence.ts";
import { recordPlatformEvent } from "../_shared/platform-analytics.ts";

import { resolveCorsOrigin } from "../_shared/cors-origins.ts";

function corsHeaders(origin: string | null) {
  const allowedOrigin = resolveCorsOrigin(origin);

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

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceKey) {
    return json({ error: "server_misconfigured" }, 500, origin);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const signalType = String(body.signal_type || "");
    const signalSource = "user";

    if (!CLIENT_OUTCOME_SIGNAL_TYPES.has(signalType)) {
      return json({ error: "invalid_signal_type" }, 400, origin);
    }

    const form =
      body.form && typeof body.form === "object" ? body.form : {};
    const segmentKey =
      String(body.segment_key || "") || buildSegmentKey(form as Record<string, unknown>);

    const sessionId = String(body.decision_session_id || "").slice(0, 64) || null;
    const leadId = String(body.lead_id || "").trim() || null;
    const clientKey = String(body.client_event_id || "").slice(0, 80);
    const idempotencyKey = clientKey
      ? `user:${sessionId || "anon"}:${signalType}:${clientKey}`
      : null;

    const properties = sanitizeOutcomeProperties({
      ...(body.properties && typeof body.properties === "object" ? body.properties : {}),
      surface: String(body.surface || "auto").slice(0, 32),
      match_score: Number(body.match_score || 0) || undefined,
      confidence_tier: String(body.confidence_tier || "").slice(0, 24) || undefined,
      vehicle_slug: String(body.vehicle_slug || body.vehicle || "").slice(0, 80) || undefined,
      interest_type: String(body.interest_type || "").slice(0, 32) || undefined,
    });

    const result = await recordOutcomeSignal(admin, {
      signal_type: signalType,
      signal_source: signalSource,
      decision_session_id: sessionId,
      lead_id: leadId,
      segment_key: segmentKey || null,
      idempotency_key: idempotencyKey,
      properties,
    });

    if (!result.ok) {
      return json({ error: result.error || "insert_failed" }, 500, origin);
    }

    try {
      await recordPlatformEvent(admin, {
        event_name: `outcome_signal_${signalType}`,
        funnel: "decision",
        funnel_step: signalType,
        properties: {
          segment_key: segmentKey,
          decision_session_id: sessionId,
          signal_source: signalSource,
        },
      });
    } catch {
      /* non-blocking */
    }

    return json(
      {
        ok: true,
        duplicate: result.duplicate === true,
        note: "Signals feed rule-based segment calibration — not generative model training.",
      },
      200,
      origin
    );
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : "request_failed" },
      500,
      origin
    );
  }
});
