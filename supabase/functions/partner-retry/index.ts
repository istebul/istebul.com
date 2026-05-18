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

async function getPartnerEndpoints(route: string) {
  const { data, error } = await sb
    .from("partner_endpoints")
    .select("id, name, webhook_url, shared_secret, priority_weight, sent_today, daily_cap")
    .eq("route_type", route)
    .eq("is_active", true)
    .or("daily_cap.is.null,sent_today.lt.daily_cap");

  if (error) throw error;

  const endpoints = data || [];
  const ordered = [];

  while (endpoints.length) {
    const totalWeight = endpoints.reduce((sum, endpoint) => {
      return sum + Math.max(Number(endpoint.priority_weight || 0), 1);
    }, 0);

    let random = Math.random() * totalWeight;
    let selectedIndex = 0;

    for (let i = 0; i < endpoints.length; i += 1) {
      random -= Math.max(Number(endpoints[i].priority_weight || 0), 1);
      if (random <= 0) {
        selectedIndex = i;
        break;
      }
    }

    ordered.push(endpoints.splice(selectedIndex, 1)[0]);
  }

  return ordered;
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
    let dispatched = false;
    let lastError = "no active partner endpoint";

    try {
      const endpoints = await getPartnerEndpoints(lead.partner_route);

      for (const endpoint of endpoints) {
        if (!endpoint?.webhook_url) continue;

        const body = JSON.stringify({
          ...lead,
          partner_endpoint_id: endpoint.id,
          partner_endpoint_name: endpoint.name
        });
        const signature = await signPartnerPayload(body);

        try {
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
            dispatched = true;
            break;
          }

          lastError = `webhook returned non-200: ${res.status}`;
          await sb.rpc("increment_partner_endpoint_fail", { endpoint_id: endpoint.id });
        } catch {
          lastError = "network exception";
          await sb.rpc("increment_partner_endpoint_fail", { endpoint_id: endpoint.id });
        }
      }

      if (!dispatched) {
        const retry = (lead.dispatch_retry_count || 0) + 1;
        const isDead = retry >= 5;

        await sb
          .from("auto_leads")
          .update({
            partner_status: isDead ? "dispatch_dead" : "dispatch_failed",
            dispatch_retry_count: retry,
            last_dispatch_at: new Date().toISOString(),
            next_retry_at: isDead ? null : getNextRetryTime(retry),
            last_dispatch_error: isDead ? "max retry reached" : lastError
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
          last_dispatch_error: isDead ? "max retry reached" : "partner endpoint lookup exception"
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
