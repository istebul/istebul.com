import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  collectFlywheelMetrics,
  computeDefensibilityIndex,
  computeMoatLayerHealth,
  MOAT_ARCHITECTURE_VERSION,
} from "../_shared/moat-architecture.ts";

const allowedOrigins = [
  "https://istebul.com",
  "https://www.istebul.com",
  "https://istebul-com.pages.dev",
];

function corsHeaders(origin: string | null) {
  const allowedOrigin = allowedOrigins.includes(origin || "")
    ? origin
    : "https://www.istebul.com";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
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

  if (req.method !== "GET") {
    return json({ error: "method_not_allowed" }, 405, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "server_misconfigured" }, 500, origin);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const metrics = await collectFlywheelMetrics(admin);
    const layers = computeMoatLayerHealth(metrics);
    const defensibilityIndex = computeDefensibilityIndex(layers);

    const highResistance = layers.filter(
      (l) => l.copyResistance === "high" && l.score >= 40
    ).length;

    return json(
      {
        ok: true,
        version: MOAT_ARCHITECTURE_VERSION,
        defensibilityIndex,
        flywheel: metrics,
        layers,
        competitorCopy: {
          headline:
            highResistance >= 4
              ? "Composite moat — UI-only copy insufficient"
              : "Moat accumulating — compound flywheel early stage",
          highResistanceLayers: highResistance,
          estimatedEffort:
            "Surface UI: 3–6 mo · Full flywheel (partner OS + outcome + CRM): 12–24 mo",
        },
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
