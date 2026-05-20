import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  "https://istebul.com",
  "https://www.istebul.com",
  "https://istebul-com.pages.dev"
];

function corsHeaders(origin: string | null) {
  const allowedOrigin = allowedOrigins.includes(origin || "")
    ? origin
    : "https://istebul.com";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

function cleanPhone(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function isValidEmail(value: unknown) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}


const ALLOWED_EVENTS = new Set([
  "auto_page_view",
  "auto_quiz_submit",
  "auto_analysis_started",
  "auto_results_view",
  "auto_modal_open",
  "auto_lead_submit",
  "auto_whatsapp_click",
  "auto_whatsapp_lead_intent",
  "auto_finance_click",
  "auto_insurance_click",
  "auto_vehicle_offer_click",
  "auto_premium_report_click"
]);

function clampString(value: unknown, max = 64) {
  return String(value || "").trim().slice(0, max);
}

function clampNumber(value: unknown, min = 0, max = 100000000) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}


function calculateLeadScore(form: Record<string, unknown>) {
  let score = 0;

  const interest = String(form.interest_type || "");
  const budget = Number(form.budget || 0);
  const km = Number(form.km || 0);
  const loan = String(form.loan || "");

  if (interest === "vehicle_offer") score += 90;
  else if (interest === "premium_report") score += 75;
  else if (interest === "finance") score += 65;
  else if (interest === "insurance") score += 55;

  if (budget >= 2000000) score += 35;
  else if (budget >= 1000000) score += 20;
  else if (budget >= 500000) score += 10;

  if (loan === "yes") score += 15;
  if (km > 20000) score += 10;

  const priority =
    score >= 150 ? "very_hot" :
    score >= 100 ? "hot" :
    score >= 50 ? "warm" :
    "cold";

  return { score, priority };
}


const TEST_PHONES = new Set([
  "905551112233",
  "905551111111",
  "905559998888"
]);

function isJunkPhone(phone?: unknown) {
  const clean = String(phone || "").replace(/\D/g, "");

  if (!clean) return true;
  if (TEST_PHONES.has(clean)) return true;
  if (/^(\d)\1{9,}$/.test(clean)) return true;
  if (clean.includes("123456") || clean.includes("000000")) return true;

  return false;
}

function isTestLead(phone?: unknown) {
  const clean = String(phone || "").replace(/\D/g, "");
  return TEST_PHONES.has(clean);
}


function getNextRetryTime(retryCount: number) {
  const now = new Date();

  if (retryCount <= 1) now.setMinutes(now.getMinutes() + 15);
  else if (retryCount == 2) now.setHours(now.getHours() + 1);
  else if (retryCount == 3) now.setHours(now.getHours() + 6);
  else now.setDate(now.getDate() + 1);

  return now.toISOString();
}

function getAutoFollowUp(priority: string) {
  const now = new Date();

  if (priority === "very_hot") {
    now.setMinutes(now.getMinutes() + 15);
    return now.toISOString();
  }

  if (priority === "hot") {
    now.setHours(now.getHours() + 2);
    return now.toISOString();
  }

  if (priority === "warm") {
    now.setDate(now.getDate() + 1);
    return now.toISOString();
  }

  return null;
}


function getPartnerRoute(form: Record<string, unknown>) {
  const interest = String(form.interest_type || "");

  if (interest === "finance") return "finance_partner";
  if (interest === "insurance") return "insurance_partner";
  if (interest === "vehicle_offer") return "dealer_partner";
  if (interest === "premium_report") return "premium_report";

  return "general_sales";
}


function estimateCommission(partnerRoute: string, leadScore: number) {
  const baseMap: Record<string, number> = {
    insurance_partner: 1500,
    finance_partner: 2000,
    dealer_partner: 5000,
    premium_report: 499,
    general_sales: 1000
  };

  let revenue = baseMap[partnerRoute] || 0;

  if (leadScore >= 90) revenue = Math.round(revenue * 1.5);
  else if (leadScore >= 75) revenue = Math.round(revenue * 1.2);

  return revenue;
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


async function getPartnerEndpoints(adminClient: any, route: string) {
  const { data, error } = await adminClient
    .from("partner_endpoints")
    .select("id, name, webhook_url, priority_weight, sent_today, daily_cap")
    .eq("route_type", route)
    .eq("is_active", true);

  if (error) throw error;

  const endpoints = (data || []).filter((endpoint: any) => {
    if (endpoint.daily_cap == null) return true;
    return Number(endpoint.sent_today || 0) < Number(endpoint.daily_cap);
  });

  const ordered = [];

  while (endpoints.length) {
    const totalWeight = endpoints.reduce((sum: number, endpoint: any) => {
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

async function dispatchPartnerLead(adminClient: any, payload: Record<string, unknown>) {
  const route = String(payload.partner_route || "");
  const priority = String(payload.priority || "");

  if (isTestLead(payload.phone)) {
    return { status: "skipped", reason: "test_lead" };
  }

  if (priority !== "hot" && priority !== "very_hot") {
    return { status: "skipped", reason: "not_hot" };
  }

  const endpoints = await getPartnerEndpoints(adminClient, route);

  if (!endpoints.length) {
    return { status: "dispatch_failed", reason: "no_active_partner" };
  }

  for (const endpoint of endpoints) {
    if (!endpoint?.webhook_url) continue;

    const body = JSON.stringify({
      ...payload,
      partner_endpoint_id: endpoint.id,
      partner_endpoint_name: endpoint.name
    });

    const signature = await signPartnerPayload(body);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(endpoint.webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-istebul-signature": signature
        },
        body,
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (response.ok) {
        try {
          await adminClient.rpc("increment_partner_endpoint_success", {
            endpoint_id: endpoint.id
          });
        } catch {}

        return {
          status: "dispatched",
          endpoint: endpoint.name
        };
      }

      try {
        await adminClient.rpc("increment_partner_endpoint_fail", {
          endpoint_id: endpoint.id
        });
      } catch {}

    } catch {
      clearTimeout(timeout);

      try {
        await adminClient.rpc("increment_partner_endpoint_fail", {
          endpoint_id: endpoint.id
        });
      } catch {}
    }
  }

  return {
    status: "dispatch_failed",
    reason: "all_endpoints_failed"
  };
}

async function notifyTelegramLead(payload: Record<string, unknown>) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

  if (!token || !chatId) return;

  const score = Number(payload.lead_score || 0);
  const priority = String(payload.priority || "");

  if (isTestLead(payload.phone)) return;
  if (priority !== "hot" && score < 80) return;

  const text = `
🔥 SICAK LEAD

📞 ${payload.phone || "-"}
📧 ${payload.email || "-"}
🚗 ${payload.vehicle || "-"}
💰 Bütçe: ${payload.budget || "-"} ₺
🎯 Skor: ${score}
🔥 Öncelik: ${priority}
🤝 Partner: ${payload.partner_route || "-"}

🔗 https://www.istebul.com/admin-panel.html
`.trim();

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  });
}


async function verifyTurnstile(token: string, ip: string) {
  const secret = Deno.env.get("TURNSTILE_SECRET");

  if (!secret) {
    return { ok: false, error: "Turnstile secret missing" };
  }

  if (!token) {
    return { ok: false, error: "Turnstile token missing" };
  }

  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip && ip !== "unknown") form.append("remoteip", ip);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    return { ok: false, error: "Turnstile verify failed" };
  }

  const data = await res.json();
  return { ok: Boolean(data.success), error: data["error-codes"]?.join(",") || "" };
}

function getClientIp(req: Request) {
  return req.headers.get("cf-connecting-ip") || "unknown";
}

async function checkRateLimit(adminClient: any, key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const windowStart = new Date(now - windowMs).toISOString();

  const { data, error } = await adminClient
    .from("auto_rate_limits")
    .select("key, count, window_start")
    .eq("key", key)
    .maybeSingle();

  if (error) throw error;

  if (!data || new Date(data.window_start).getTime() < new Date(windowStart).getTime()) {
    const { error: upsertError } = await adminClient
      .from("auto_rate_limits")
      .upsert({
        key,
        count: 1,
        window_start: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
      }, { onConflict: "key" });

    if (upsertError) throw upsertError;
    return true;
  }

  if (data.count >= limit) {
    return false;
  }

  const { error: updateError } = await adminClient
    .from("auto_rate_limits")
    .update({
      count: data.count + 1,
      updated_at: new Date(now).toISOString(),
    })
    .eq("key", key);

  if (updateError) throw updateError;
  return true;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req.headers.get("origin")) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Supabase environment variables missing" }, 500, origin);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, origin);
  }

  const type = String(body.type || "");
  const metadata = body.metadata && typeof body.metadata === "object" ? Object.fromEntries(Object.entries(body.metadata).slice(0, 20)) : {};
  const email = String(body.email || metadata.email || "").trim().toLowerCase();
  const phone = cleanPhone(body.phone || metadata.phone);

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (type === "event") {
    const clientIp = getClientIp(req);
    const allowed = await checkRateLimit(adminClient, `event:${clientIp}`, 30, 60 * 1000);

    if (!allowed) {
      return json({ error: "Too many requests" }, 429, origin);
    }

    const eventName = String(body.event_name || "").trim();

    if (!ALLOWED_EVENTS.has(eventName)) {
      return json({ error: "Invalid event name" }, 400, origin);
    }

    const { error } = await adminClient.from("auto_events").insert({
      event_name: eventName,
      email: email || null,
      phone: phone || null,
      metadata,
    });

    if (error) return json({ error: error.message }, 500, origin);
    return json({ ok: true }, 200, origin);
  }

  if (type === "lead") {
    const clientIp = getClientIp(req);
    const allowed = await checkRateLimit(adminClient, `lead:${clientIp}`, 5, 10 * 60 * 1000);

    if (!allowed) {
      return json({ error: "Too many requests" }, 429, origin);
    }

    if ((email && !isValidEmail(email)) || phone.length < 10 || phone.length > 15 || isJunkPhone(phone)) {
      return json({ error: "Invalid contact information" }, 400, origin);
    }

    if (!isTestLead(phone)) {
      const token = String(body.turnstile_token || metadata.turnstile_token || "").trim();
      const turnstile = await verifyTurnstile(token, clientIp);

      if (!turnstile.ok) {
        return json({ error: "Bot verification failed" }, 403, origin);
      }
    }

    const normalizedEmail = isValidEmail(email) ? String(email).trim().toLowerCase() : null;

    if (!isTestLead(phone)) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const sessionId = String(metadata.session_id || "").trim();

      const { data: recentPhoneLead, error: recentPhoneLeadError } = await adminClient
        .from("auto_leads")
        .select("id, created_at")
        .eq("phone", phone)
        .gte("created_at", since)
        .maybeSingle();

      if (recentPhoneLeadError) {
        return json({ error: recentPhoneLeadError.message }, 500, origin);
      }

      if (recentPhoneLead) {
        return json({ ok: true, duplicate: true, reason: "phone_24h" }, 200, origin);
      }

      if (normalizedEmail) {
        const { data: recentEmailLead, error: recentEmailLeadError } = await adminClient
          .from("auto_leads")
          .select("id, created_at")
          .eq("email", normalizedEmail)
          .gte("created_at", since)
          .maybeSingle();

        if (recentEmailLeadError) {
          return json({ error: recentEmailLeadError.message }, 500, origin);
        }

        if (recentEmailLead) {
          return json({ ok: true, duplicate: true, reason: "email_24h" }, 200, origin);
        }
      }

      if (sessionId) {
        const allowedSession = await checkRateLimit(adminClient, `lead_session:${sessionId}`, 1, 10 * 60 * 1000);
        if (!allowedSession) {
          return json({ ok: true, duplicate: true, reason: "session_cooldown" }, 200, origin);
        }
      }
    }

    const form = body.formData && typeof body.formData === "object" ? body.formData : metadata;
    const honeypot = String(form.website || form.company || form.url || "").trim();
    if (honeypot) {
      return json({ ok: true, spam: true }, 200, origin);
    }

    const scoring = calculateLeadScore(form);

    const payload = {
      email: normalizedEmail,
      phone,
      budget: clampNumber(form.budget, 0, 20000000),
      usage: clampString(form.usage, 40),
      body: clampString(form.body, 40),
      fuel: clampString(form.fuel, 20),
      km: clampNumber(form.km, 0, 2000000),
      loan: clampString(form.loan, 20),
      interest_type: clampString(form.interest_type, 40),
      vehicle: clampString(form.vehicle, 120),
      lead_score: scoring.score,
      priority: scoring.priority,
      partner_route: getPartnerRoute(form),
      partner_status: "pending",
      dispatch_retry_count: 0,
      last_dispatch_at: null,
      next_retry_at: null,
      last_dispatch_error: null,
      estimated_revenue: estimateCommission(getPartnerRoute(form), scoring.score),
      follow_up_at: getAutoFollowUp(scoring.priority),
      follow_up_done: false,
      status: isTestLead(phone) ? "test_spam" : "new",
      source: "auto",
    };

    const phoneUpdate = await adminClient
      .from("auto_leads")
      .update(payload)
      .eq("phone", phone)
      .select("id");

    if (phoneUpdate.error) return json({ error: phoneUpdate.error.message }, 500, origin);

    if (!phoneUpdate.data?.length && normalizedEmail) {
      const emailUpdate = await adminClient
        .from("auto_leads")
        .update(payload)
        .eq("email", normalizedEmail)
        .select("id");

      if (emailUpdate.error) return json({ error: emailUpdate.error.message }, 500, origin);

      if (emailUpdate.data?.length) {
        return json({ ok: true }, 200, origin);
      }
    }

    if (!phoneUpdate.data?.length) {
      const { error: insertError } = await adminClient.from("auto_leads").insert(payload);
      if (insertError) return json({ error: insertError.message }, 500, origin);
    }

    try {
      await notifyTelegramLead(payload);
      const dispatchResult = await dispatchPartnerLead(adminClient, payload);

      if (dispatchResult.status === "dispatched") {
        await adminClient
          .from("auto_leads")
          .update({
            partner_status: "dispatched",
            last_dispatch_at: new Date().toISOString(),
            next_retry_at: null,
            last_dispatch_error: null
          })
          .eq("phone", phone);
      }

      if (dispatchResult.status === "dispatch_failed") {
        await adminClient
          .from("auto_leads")
          .update({
            partner_status: "dispatch_failed",
            dispatch_retry_count: 1,
            last_dispatch_at: new Date().toISOString(),
            next_retry_at: getNextRetryTime(1),
            last_dispatch_error: dispatchResult.reason || "partner webhook failed"
          })
          .eq("phone", phone);
      }
    } catch {
      await adminClient
        .from("auto_leads")
        .update({
          partner_status: "dispatch_failed",
          dispatch_retry_count: 1,
          last_dispatch_at: new Date().toISOString(),
          next_retry_at: getNextRetryTime(1),
          last_dispatch_error: "dispatch exception"
        })
        .eq("phone", phone);
    }

    return json({ ok: true }, 200, origin);
  }

  return json({ error: "Invalid intake type" }, 400, origin);
});
