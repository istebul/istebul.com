import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

function getNextRetryTime(retryCount: number) {
  const now = new Date();

  if (retryCount <= 1) now.setMinutes(now.getMinutes() + 15);
  else if (retryCount === 2) now.setHours(now.getHours() + 1);
  else if (retryCount === 3) now.setHours(now.getHours() + 6);
  else now.setDate(now.getDate() + 1);

  return now.toISOString();
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

async function getPartnerEndpoint(route: string) {
  const { data, error } = await sb
    .from("partner_endpoints")
    .select("id, name, webhook_url, shared_secret, priority_weight, sent_today, daily_cap")
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
  const incoming = req.headers.get("x-retry-secret");
  const expected = Deno.env.get("RETRY_WORKER_SECRET");

  if (!expected || incoming !== expected) {
    return new Response("forbidden", { status: 403 });
  }
  const now = new Date().toISOString();

  const { data: leads, error } = await sb
    .from("auto_leads")
    .select("*")
    .eq("partner_status", "dispatch_failed")
    .lte("next_retry_at", now)
    .lt("dispatch_retry_count", 5)
    .limit(50);

  if (error) {
    return new Response(JSON.stringify(error), { status: 500 });
  }

  for (const lead of leads || []) {
    try {
      const endpoint = await getPartnerEndpoint(lead.partner_route);
      if (!endpoint?.webhook_url) continue;

      const body = JSON.stringify({
        ...lead,
        partner_endpoint_id: endpoint.id,
        partner_endpoint_name: endpoint.name
      });
      const signature = await signPartnerPayload(body);

      const res = await fetch(endpoint.webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-istebul-signature": signature
        },
        body
      });

      if (res.ok) {
        await sb
          .from("auto_leads")
          .update({
            partner_status: "dispatched",
            last_dispatch_at: new Date().toISOString(),
            next_retry_at: null,
            last_dispatch_error: null
          })
          .eq("id", lead.id);

        await sb.rpc("increment_partner_endpoint_success", { endpoint_id: endpoint.id });
      } else {
        const retry = (lead.dispatch_retry_count || 0) + 1;
        const isDead = retry >= 5;

        await sb
          .from("auto_leads")
          .update({
            partner_status: isDead ? "dispatch_dead" : "dispatch_failed",
            dispatch_retry_count: retry,
            last_dispatch_at: new Date().toISOString(),
            next_retry_at: isDead ? null : getNextRetryTime(retry),
            last_dispatch_error: isDead ? "max retry reached" : "webhook returned non-200"
          })
          .eq("id", lead.id);
      }
    } catch {
      const retry = (lead.dispatch_retry_count || 0) + 1;
      const isDead = retry >= 5;

      await sb
        .from("auto_leads")
        .update({
          partner_status: isDead ? "dispatch_dead" : "dispatch_failed",
          dispatch_retry_count: retry,
          last_dispatch_at: new Date().toISOString(),
          next_retry_at: isDead ? null : getNextRetryTime(retry),
          last_dispatch_error: isDead ? "max retry reached" : "network exception"
        })
        .eq("id", lead.id);
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    processed: leads?.length || 0
  }), {
    headers: { "Content-Type": "application/json" }
  });
});
