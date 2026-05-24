import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertSafePartnerWebhookUrl } from "../_shared/webhook-url.ts";
import { recordPlatformEvent } from "../_shared/platform-analytics.ts";

const SAMPLE_WEBHOOK_PAYLOAD = {
  email: "ornek@firma.com",
  phone: "905551112233",
  budget: 1750000,
  usage: "family",
  body: "suv",
  fuel: "hybrid",
  interest_type: "vehicle_offer",
  vehicle: "Örnek model",
  lead_score: 142,
  priority: "hot",
  partner_route: "dealer_partner",
  estimated_revenue: 7500,
  source: "auto",
};

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

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function applicationPayload(app: Record<string, unknown>) {
  return {
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
    onboarding_step: app.onboarding_step ?? 1,
    onboarding_completed_at: app.onboarding_completed_at,
    qualification_data: app.qualification_data ?? {},
    lead_needs_data: app.lead_needs_data ?? {},
    test_payload_verified: app.test_payload_verified ?? false,
    integration_notes: app.integration_notes,
  };
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
      "id, company_name, contact_name, email, category, status, webhook_ready, webhook_url_draft, partner_endpoint_id, billing_plan, created_at, onboarding_step, onboarding_completed_at, qualification_data, lead_needs_data, test_payload_verified, integration_notes",
    )
    .eq("onboarding_token", token)
    .maybeSingle();

  if (error) return json({ error: error.message }, 500, origin);
  if (!app) return json({ error: "not_found" }, 404, origin);

  const trackFunnel = async (eventName: string, funnelStep: string, extra: Record<string, unknown> = {}) => {
    try {
      await recordPlatformEvent(sb, {
        event_name: eventName,
        email: app.email,
        funnel: "partner_acquisition",
        funnel_step: funnelStep,
        properties: { application_id: app.id, category: app.category, ...extra },
        source: "partner_onboarding",
      });
    } catch {
      /* non-blocking */
    }
  };

  if (action === "save_step") {
    const step = Number(body.step);
    if (!Number.isFinite(step) || step < 2 || step > 3) {
      return json({ error: "invalid_step" }, 400, origin);
    }

    const data = asObject(body.data);
    const patch: Record<string, unknown> = {
      onboarding_step: Math.max(Number(app.onboarding_step) || 1, step + 1),
    };

    if (step === 2) {
      patch.qualification_data = {
        annual_revenue_band: String(data.annual_revenue_band || "").slice(0, 40),
        crm_platform: String(data.crm_platform || "").slice(0, 80),
        sales_team_size: String(data.sales_team_size || "").slice(0, 40),
        kvkk_dpa_ready: Boolean(data.kvkk_dpa_ready),
        pilot_timeline: String(data.pilot_timeline || "").slice(0, 60),
        integration_owner: String(data.integration_owner || "").slice(0, 80),
      };
      if (app.status === "new") patch.status = "contacted";
    }

    if (step === 3) {
      patch.lead_needs_data = {
        min_lead_score: Number(data.min_lead_score) || 120,
        max_leads_per_day: Number(data.max_leads_per_day) || 10,
        geographic_focus: String(data.geographic_focus || "").slice(0, 120),
        vehicle_focus: String(data.vehicle_focus || "").slice(0, 120),
        interest_types: Array.isArray(data.interest_types)
          ? data.interest_types.map((v) => String(v).slice(0, 40)).slice(0, 8)
          : [],
        notes: String(data.notes || "").slice(0, 500),
      };
      if (["new", "contacted"].includes(String(app.status))) patch.status = "qualified";
    }

    const { error: updateError } = await sb.from("partner_applications").update(patch).eq("id", app.id);
    if (updateError) return json({ error: updateError.message }, 500, origin);

    if (step === 3 && app.partner_endpoint_id && patch.lead_needs_data) {
      const minScore = Number(
        (patch.lead_needs_data as { min_lead_score?: number }).min_lead_score || 120
      );
      await sb
        .from("partner_endpoints")
        .update({ min_lead_score: minScore })
        .eq("id", app.partner_endpoint_id);
    }

    const eventName = step === 2 ? "partner_funnel_qualification" : "partner_funnel_lead_needs";
    await trackFunnel(eventName, step === 2 ? "qualification" : "lead_needs");

    const { data: updated } = await sb
      .from("partner_applications")
      .select(
        "id, company_name, contact_name, email, category, status, webhook_ready, webhook_url_draft, partner_endpoint_id, billing_plan, created_at, onboarding_step, onboarding_completed_at, qualification_data, lead_needs_data, test_payload_verified, integration_notes",
      )
      .eq("id", app.id)
      .single();

    return json({ ok: true, application: applicationPayload(updated || app) }, 200, origin);
  }

  if (action === "save_webhook") {
    const webhookUrl = String(body.webhook_url || "").trim();
    if (!webhookUrl) return json({ error: "webhook_url_required" }, 400, origin);

    try {
      assertSafePartnerWebhookUrl(webhookUrl);
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : "invalid_webhook_url" }, 400, origin);
    }

    const notes = String(body.integration_notes || "").trim().slice(0, 500);

    const { error: updateError } = await sb
      .from("partner_applications")
      .update({
        webhook_url_draft: webhookUrl,
        webhook_ready: true,
        integration_notes: notes || app.integration_notes,
        onboarding_step: Math.max(Number(app.onboarding_step) || 1, 5),
        status: app.status === "new" ? "integrating" : app.status,
      })
      .eq("id", app.id);

    if (updateError) return json({ error: updateError.message }, 500, origin);

    await trackFunnel("partner_funnel_webhook", "webhook");

    const { data: updated } = await sb
      .from("partner_applications")
      .select(
        "id, company_name, contact_name, email, category, status, webhook_ready, webhook_url_draft, partner_endpoint_id, billing_plan, created_at, onboarding_step, onboarding_completed_at, qualification_data, lead_needs_data, test_payload_verified, integration_notes",
      )
      .eq("id", app.id)
      .single();

    return json(
      { ok: true, webhook_url_draft: webhookUrl, application: applicationPayload(updated || app) },
      200,
      origin,
    );
  }

  if (action === "verify_test_payload") {
    const secret = String(body.webhook_secret || "").trim();
    const signature = String(body.signature || "").trim().toLowerCase();
    if (secret.length < 8) return json({ error: "webhook_secret_required" }, 400, origin);
    if (!signature || signature.length !== 64) return json({ error: "invalid_signature" }, 400, origin);

    const payloadBody = JSON.stringify(SAMPLE_WEBHOOK_PAYLOAD);
    const expected = await hmacSha256Hex(secret, payloadBody);
    if (expected !== signature) {
      return json({ error: "signature_mismatch", expected_for_docs: false }, 400, origin);
    }

    const { error: updateError } = await sb
      .from("partner_applications")
      .update({
        test_payload_verified: true,
        onboarding_step: Math.max(Number(app.onboarding_step) || 1, 6),
        status: ["new", "contacted", "qualified"].includes(String(app.status)) ? "integrating" : app.status,
      })
      .eq("id", app.id);

    if (updateError) return json({ error: updateError.message }, 500, origin);

    await trackFunnel("partner_funnel_test_payload", "test_payload");

    const { data: updated } = await sb
      .from("partner_applications")
      .select(
        "id, company_name, contact_name, email, category, status, webhook_ready, webhook_url_draft, partner_endpoint_id, billing_plan, created_at, onboarding_step, onboarding_completed_at, qualification_data, lead_needs_data, test_payload_verified, integration_notes",
      )
      .eq("id", app.id)
      .single();

    return json({ ok: true, verified: true, application: applicationPayload(updated || app) }, 200, origin);
  }

  if (action === "complete_onboarding") {
    if (!app.webhook_url_draft) {
      return json({ error: "webhook_required" }, 400, origin);
    }
    if (!app.test_payload_verified) {
      return json({ error: "test_payload_not_verified" }, 400, origin);
    }

    const completedAt = new Date().toISOString();
    const { error: updateError } = await sb
      .from("partner_applications")
      .update({
        onboarding_step: 6,
        onboarding_completed_at: completedAt,
        status: app.status === "rejected" ? app.status : "integrating",
      })
      .eq("id", app.id);

    if (updateError) return json({ error: updateError.message }, 500, origin);

    await trackFunnel("partner_onboarding_complete", "complete");

    const { data: updated } = await sb
      .from("partner_applications")
      .select(
        "id, company_name, contact_name, email, category, status, webhook_ready, webhook_url_draft, partner_endpoint_id, billing_plan, created_at, onboarding_step, onboarding_completed_at, qualification_data, lead_needs_data, test_payload_verified, integration_notes",
      )
      .eq("id", app.id)
      .single();

    return json(
      {
        ok: true,
        completed_at: completedAt,
        application: applicationPayload(updated || app),
      },
      200,
      origin,
    );
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
      application: applicationPayload(app),
      endpoint,
      sample_payload: SAMPLE_WEBHOOK_PAYLOAD,
    },
    200,
    origin,
  );
});
