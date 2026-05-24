import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertSafePartnerWebhookUrl } from "../_shared/webhook-url.ts";
import { recordPlatformEvent } from "../_shared/platform-analytics.ts";

function corsHeaders(origin: string | null) {
  const allowed = new Set([
    "https://istebul.com",
    "https://www.istebul.com",
    "http://localhost:3000",
    "http://localhost:5173",
  ]);
  const allowOrigin = origin && allowed.has(origin) ? origin : "https://www.istebul.com";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

function json(body: Record<string, unknown>, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

function cleanToken(value: unknown) {
  return String(value || "").trim().slice(0, 64);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

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

  const action = String(body.action || "status");
  const token = cleanToken(body.token);
  if (!token || token.length < 16) {
    return json({ error: "Invalid token" }, 400, origin);
  }

  const sb = createClient(supabaseUrl, serviceKey);

  const { data: app, error } = await sb
    .from("partner_applications")
    .select(
      "id, company_name, contact_name, email, category, status, webhook_ready, webhook_url_draft, partner_endpoint_id, billing_plan, created_at"
    )
    .eq("onboarding_token", token)
    .maybeSingle();

  if (error) return json({ error: error.message }, 500, origin);
  if (!app) return json({ error: "not_found" }, 404, origin);

  if (action === "save_webhook") {
    const webhookUrl = String(body.webhook_url || "").trim();
    if (!webhookUrl) return json({ error: "webhook_url_required" }, 400, origin);

    try {
      assertSafePartnerWebhookUrl(webhookUrl);
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : "invalid_webhook_url" }, 400, origin);
    }

    const { error: updateError } = await sb
      .from("partner_applications")
      .update({
        webhook_url_draft: webhookUrl,
        webhook_ready: true,
        status: app.status === "new" ? "integrating" : app.status,
      })
      .eq("id", app.id);

    if (updateError) return json({ error: updateError.message }, 500, origin);

    try {
      await recordPlatformEvent(sb, {
        event_name: "partner_webhook_draft_saved",
        email: app.email,
        funnel: "partner_acquisition",
        funnel_step: "webhook_draft_saved",
        properties: {
          application_id: app.id,
          category: app.category,
        },
        source: "partner_onboarding",
      });
    } catch {
      /* non-blocking */
    }

    return json({ ok: true, webhook_url_draft: webhookUrl }, 200, origin);
  }

  let endpoint = null;
  if (app.partner_endpoint_id) {
    const { data } = await sb
      .from("partner_endpoints")
      .select("id, name, is_active, health_status, route_type")
      .eq("id", app.partner_endpoint_id)
      .maybeSingle();
    endpoint = data;
  }

  return json(
    {
      ok: true,
      application: {
        id: app.id,
        company_name: app.company_name,
        contact_name: app.contact_name,
        email: app.email,
        category: app.category,
        status: app.status,
        webhook_ready: app.webhook_ready,
        webhook_url_draft: app.webhook_url_draft,
        billing_plan: app.billing_plan,
        created_at: app.created_at,
      },
      endpoint,
    },
    200,
    origin
  );
});
