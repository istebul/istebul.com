import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCorsOrigin } from "../_shared/cors-origins.ts";
import { signPartnerPayload } from "../_shared/partner-dispatch.ts";
import { assertSafePartnerWebhookUrl } from "../_shared/webhook-url.ts";

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("Supabase service credentials missing");
  }
  return createClient(url, key);
}

function corsHeaders(origin: string | null) {
  const allowedOrigin = resolveCorsOrigin(origin, "https://www.istebul.com");

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(
  body: Record<string, unknown>,
  status = 200,
  origin: string | null = null
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

type AdminAuthResult =
  | { ok: true; user: { id: string } }
  | { ok: false; status: 401 | 403; error: string };

async function requireAdmin(
  req: Request,
  sb: ReturnType<typeof createClient>
): Promise<AdminAuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { ok: false, status: 401, error: "Authorization required" };
  }

  const authClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    {
      global: { headers: { Authorization: authHeader } },
    }
  );

  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const { data: profile } = await sb
    .from("profiles")
    .select("role, is_banned")
    .eq("id", userData.user.id)
    .single();

  if (profile?.role !== "admin" || profile?.is_banned === true) {
    return { ok: false, status: 403, error: "admin_required" };
  }

  return { ok: true, user: userData.user };
}

function resolveEndpointId(body: Record<string, unknown>): string {
  const raw = body.endpoint_id ?? body.endpointId ?? body.id;
  return String(raw ?? "").trim();
}

const ENDPOINT_SELECT_FALLBACKS = [
  "id, name, webhook_url, shared_secret, route_type, is_active, health_status",
  "id, name, webhook_url, shared_secret, route_type, is_active",
  "id, name, webhook_url, shared_secret, route_type",
];

function isMissingColumnError(message: string) {
  const msg = message.toLowerCase();
  return msg.includes("column") && msg.includes("does not exist");
}

async function fetchPartnerEndpoint(
  sb: ReturnType<typeof createClient>,
  endpointId: string
) {
  let lastLookupError: string | null = null;

  for (const selectExpr of ENDPOINT_SELECT_FALLBACKS) {
    const { data, error } = await sb
      .from("partner_endpoints")
      .select(selectExpr)
      .eq("id", endpointId)
      .maybeSingle();

    if (error) {
      const message = String(error.message || "lookup_failed");
      lastLookupError = message;
      if (isMissingColumnError(message)) continue;
      return { endpoint: null, error: "endpoint_lookup_failed", detail: message };
    }

    if (data) {
      return { endpoint: data, error: null, detail: null };
    }
  }

  if (lastLookupError && isMissingColumnError(lastLookupError)) {
    return {
      endpoint: null,
      error: "endpoint_lookup_failed",
      detail: lastLookupError,
    };
  }

  return { endpoint: null, error: "endpoint_not_found", detail: null };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  let sb: ReturnType<typeof createClient>;
  try {
    sb = getServiceClient();
  } catch (err) {
    return json({
      ok: false,
      error: "service_unavailable",
      detail: err instanceof Error ? err.message : "config_error",
      status: 500,
    }, 500, origin);
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed", status: 405 }, 405, origin);
  }

  const auth = await requireAdmin(req, sb);
  if (!auth.ok) {
    return json({ ok: false, error: auth.error, status: auth.status }, auth.status, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body", status: 400 }, 400, origin);
  }

  const endpointId = resolveEndpointId(body);
  if (!endpointId) {
    return json({ ok: false, error: "endpoint_id_required", status: 400 }, 400, origin);
  }

  const lookup = await fetchPartnerEndpoint(sb, endpointId);
  if (!lookup.endpoint) {
    const status = lookup.error === "endpoint_not_found" ? 404 : 500;
    return json({
      ok: false,
      error: lookup.error || "endpoint_not_found",
      endpoint_id: endpointId,
      detail: lookup.detail,
      status,
    }, status, origin);
  }
  const endpoint = lookup.endpoint;

  try {
    assertSafePartnerWebhookUrl(endpoint.webhook_url);
  } catch (err) {
    return json({
      ok: false,
      error: err instanceof Error ? err.message : "Invalid webhook URL",
      status: 400,
    }, 400, origin);
  }

  const testPayload = {
    test: true,
    source: "partner_endpoint_test",
    partner_route: endpoint.route_type,
    partner_endpoint_id: endpoint.id,
    partner_endpoint_name: endpoint.name,
    sent_at: new Date().toISOString(),
    lead_id: null,
    phone: "905559990000",
    email: "test@istebul.com",
    lead_score: 95,
    priority: "very_hot",
  };

  const bodyStr = JSON.stringify(testPayload);
  const dispatchAttemptId = crypto.randomUUID();

  let signature = "";
  try {
    signature = await signPartnerPayload(bodyStr, endpoint.shared_secret);
  } catch (err) {
    return json({
      ok: false,
      error: err instanceof Error ? err.message : "Signing failed",
      status: 400,
    }, 400, origin);
  }

  const started = Date.now();
  let httpStatus = 0;
  let success = false;
  let errMsg: string | null = null;

  try {
    const response = await fetch(endpoint.webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-istebul-signature": signature,
        "x-istebul-dispatch-id": dispatchAttemptId,
      },
      body: bodyStr,
    });
    httpStatus = response.status;
    success = response.ok;
    if (!success) errMsg = `HTTP ${response.status}`;
  } catch (err) {
    errMsg = err instanceof Error ? err.message : "network_or_timeout";
  }

  const durationMs = Date.now() - started;

  try {
    await sb.from("partner_lead_dispatch_logs").insert({
      lead_id: null,
      lead_source: "partner_endpoint_test",
      partner_route: endpoint.route_type,
      endpoint_id: endpoint.id,
      endpoint_name: endpoint.name,
      attempt_number: 1,
      trigger_source: "partner_dispatch",
      dispatch_attempt_id: dispatchAttemptId,
      http_status: httpStatus || null,
      duration_ms: durationMs,
      success,
      error_message: errMsg,
      response_preview: success ? "test_ok" : errMsg,
    });
  } catch {
    /* non-blocking */
  }

  if (success) {
    try {
      await sb.rpc("increment_partner_endpoint_success", { endpoint_id: endpoint.id });
    } catch {
      /* non-blocking */
    }
    return json({
      ok: true,
      status: httpStatus || 200,
      endpoint_id: endpoint.id,
      health_status: "healthy",
    }, 200, origin);
  }

  try {
    await sb.rpc("increment_partner_endpoint_fail", { endpoint_id: endpoint.id });
  } catch {
    /* non-blocking */
  }

  const { data: refreshed } = await sb
    .from("partner_endpoints")
    .select("health_status, consecutive_failures")
    .eq("id", endpoint.id)
    .maybeSingle();

  return json({
    ok: false,
    error: "webhook_failed",
    detail: errMsg || "test_failed",
    status: httpStatus || 502,
    endpoint_id: endpoint.id,
    health_status: refreshed?.health_status || "degraded",
  }, 502, origin);
});
