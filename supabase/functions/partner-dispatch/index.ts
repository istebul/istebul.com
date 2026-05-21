import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function getNextRetryTime(retryCount: number) {
  const now = new Date();

  if (retryCount <= 1) now.setMinutes(now.getMinutes() + 15);
  else if (retryCount === 2) now.setHours(now.getHours() + 1);
  else if (retryCount === 3) now.setHours(now.getHours() + 6);
  else now.setDate(now.getDate() + 1);

  return now.toISOString();
}


async function postPartnerWebhook(url: string, body: string, signature: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-istebul-signature": signature
      },
      body,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function signPartnerPayload(body: string) {
  const secret = Deno.env.get("PARTNER_WEBHOOK_SIGNING_SECRET");
  if (!secret) return "";

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body)
  );

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return false;

  const authClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData.user) return false;

  const { data: profile } = await sb
    .from("profiles")
    .select("role, is_banned")
    .eq("id", userData.user.id)
    .single();

  return profile?.role === "admin" && profile?.is_banned !== true;
}

async function getPartnerEndpoint(route: string) {
  const { data, error } = await sb
    .from("partner_endpoints")
    .select("id, name, webhook_url, priority_weight, sent_today, daily_cap")
    .eq("route_type", route)
    .eq("is_active", true)
    .or("daily_cap.is.null,sent_today.lt.daily_cap")
    .order("priority_weight", { ascending: false })
    .order("sent_today", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const isAdmin = await requireAdmin(req);
  if (!isAdmin) return json({ error: "Forbidden: admin only" }, 403);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const leadId = String(body.lead_id || "").trim();
  if (!leadId) return json({ error: "lead_id required" }, 400);

  const { data: lead, error: leadError } = await sb
    .from("auto_leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) return json({ error: "Lead not found" }, 404);

  const endpoint = await getPartnerEndpoint(String(lead.partner_route || ""));
  if (!endpoint?.webhook_url) {
    await sb.from("auto_leads").update({
      partner_status: "dispatch_failed",
      last_dispatch_at: new Date().toISOString(),
      next_retry_at: getNextRetryTime(Number(lead.dispatch_retry_count || 0) + 1),
      last_dispatch_error: "no active partner endpoint"
    }).eq("id", lead.id);

    return json({ error: "No active partner endpoint" }, 400);
  }

  const payload = JSON.stringify({
    ...lead,
    partner_endpoint_id: endpoint.id,
    partner_endpoint_name: endpoint.name,
    manual_dispatch: true
  });

  const signature = await signPartnerPayload(payload);

  try {
    const res = await postPartnerWebhook(endpoint.webhook_url, payload, signature);

    if (res.ok) {
      await sb.from("auto_leads").update({
        partner_status: "dispatched",
        last_dispatch_at: new Date().toISOString(),
        next_retry_at: null,
        last_dispatch_error: null
      }).eq("id", lead.id);

      await sb.rpc("increment_partner_endpoint_success", { endpoint_id: endpoint.id });

      return json({ ok: true, status: "dispatched", endpoint: endpoint.name });
    }

    await sb.from("auto_leads").update({
      partner_status: "dispatch_failed",
      dispatch_retry_count: Number(lead.dispatch_retry_count || 0) + 1,
      last_dispatch_at: new Date().toISOString(),
      next_retry_at: getNextRetryTime(Number(lead.dispatch_retry_count || 0) + 1),
      last_dispatch_error: `manual dispatch non-200: ${res.status}`
    }).eq("id", lead.id);

    await sb.rpc("increment_partner_endpoint_fail", { endpoint_id: endpoint.id });

    return json({ ok: false, status: "dispatch_failed", error: `Partner returned ${res.status}` }, 502);
  } catch {
    await sb.from("auto_leads").update({
      partner_status: "dispatch_failed",
      dispatch_retry_count: Number(lead.dispatch_retry_count || 0) + 1,
      last_dispatch_at: new Date().toISOString(),
      next_retry_at: getNextRetryTime(Number(lead.dispatch_retry_count || 0) + 1),
      last_dispatch_error: "manual dispatch network exception"
    }).eq("id", lead.id);

    await sb.rpc("increment_partner_endpoint_fail", { endpoint_id: endpoint.id });

    return json({ ok: false, status: "dispatch_failed", error: "Network exception" }, 502);
  }
});
