import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { recordPlatformEvent } from "../_shared/platform-analytics.ts";
import { resolveCorsOrigin } from "../_shared/cors-origins.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": resolveCorsOrigin(origin),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  const message = String(body.message || "").trim().slice(0, 2000);
  if (!message) {
    return new Response(JSON.stringify({ error: "message_required" }), {
      status: 400,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  await recordPlatformEvent(sb, {
    event_name: "support_ticket_submitted",
    event_category: "support",
    user_id: (body.user_id as string) || null,
    email: (body.email as string) || null,
    properties: {
      message_preview: message.slice(0, 240),
      intent: body.intent || null,
      page_path: body.page_path || null,
      context: body.context || {},
    },
    source: "support_intake",
  });

  return new Response(
    JSON.stringify({ ok: true, received: true }),
    { headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
  );
});
