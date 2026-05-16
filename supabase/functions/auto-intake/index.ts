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
  "auto_results_view",
  "auto_whatsapp_click",
  "auto_finance_click"
]);

function clampString(value: unknown, max = 64) {
  return String(value || "").trim().slice(0, max);
}

function clampNumber(value: unknown, min = 0, max = 100000000) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
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

    if ((email && !isValidEmail(email)) || phone.length < 10 || phone.length > 15) {
      return json({ error: "Invalid contact information" }, 400, origin);
    }

    const form = body.formData && typeof body.formData === "object" ? body.formData : metadata;

    const payload = {
      email,
      phone,
      budget: clampNumber(form.budget, 0, 20000000),
      usage: clampString(form.usage, 40),
      body: clampString(form.body, 40),
      fuel: clampString(form.fuel, 20),
      km: clampNumber(form.km, 0, 2000000),
      loan: clampString(form.loan, 20),
      source: "auto",
    };

    let updatedRows = null;
let updateError = null;

if (email) {
    const res = await adminClient
      .from("auto_leads")
      .update(payload)
      .eq("email", email)
      .eq("phone", phone)
      .select("id");

    updatedRows = res.data;
    updateError = res.error;
} else {
    const res = await adminClient
      .from("auto_leads")
      .update(payload)
      .eq("phone", phone)
      .select("id");

    updatedRows = res.data;
    updateError = res.error;
}

if (updateError) return json({ error: updateError.message }, 500, origin);

if (!updatedRows?.length) {
      const { error: insertError } = await adminClient.from("auto_leads").insert(payload);
      if (insertError) return json({ error: insertError.message }, 500, origin);
    }

    return json({ ok: true }, 200, origin);
  }

  return json({ error: "Invalid intake type" }, 400, origin);
});
