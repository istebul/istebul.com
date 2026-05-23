import { createClient } from "@supabase/supabase-js";

function corsHeaders(origin: string | null) {
  const allowed = new Set([
    "https://istebul.com",
    "https://www.istebul.com",
    "http://localhost:3000",
    "http://localhost:5173"
  ]);

  const allowOrigin = origin && allowed.has(origin) ? origin : "https://www.istebul.com";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };
}

function json(body: Record<string, unknown>, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(origin)
  });
}

function clean(value: unknown) {
  return String(value || "").trim().slice(0, 500);
}

function cleanPhone(value: unknown) {
  return String(value || "").replace(/\D/g, "").slice(0, 20);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
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

  const company_name = clean(body.company_name);
  const contact_name = clean(body.contact_name);
  const phone = cleanPhone(body.phone);
  const email = clean(body.email).toLowerCase();
  const city = clean(body.city);
  const category = clean(body.category);
  const lead_capacity = clean(body.lead_capacity);
  const webhook_ready = Boolean(body.webhook_ready);
  const notes = clean(body.notes);

  const honeypot = clean(body.website);
  if (honeypot) return json({ ok: true }, 200, origin);

  if (
    company_name.length < 2 ||
    contact_name.length < 2 ||
    phone.length < 10 ||
    !isValidEmail(email) ||
    !category
  ) {
    return json({ error: "Invalid application data" }, 400, origin);
  }

  const sb = createClient(supabaseUrl, serviceKey);

  const clientIp =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const rateKey = `partner_app:${clientIp}`;
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: recent } = await sb
    .from("partner_applications")
    .select("id")
    .eq("email", email)
    .gte("created_at", since)
    .limit(1);

  if (recent?.length) {
    return json({ ok: true, duplicate: true }, 200, origin);
  }

  const { data: rateRow } = await sb
    .from("auto_rate_limits")
    .select("count, window_start")
    .eq("key", rateKey)
    .maybeSingle();

  const windowStart = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  if (rateRow && new Date(rateRow.window_start).getTime() >= new Date(windowStart).getTime()) {
    if (rateRow.count >= 5) {
      return json({ error: "Too many requests" }, 429, origin);
    }
    await sb.from("auto_rate_limits").update({
      count: rateRow.count + 1,
      updated_at: new Date().toISOString(),
    }).eq("key", rateKey);
  } else {
    await sb.from("auto_rate_limits").upsert({
      key: rateKey,
      count: 1,
      window_start: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });
  }

  const { data, error } = await sb
    .from("partner_applications")
    .insert({
      company_name,
      contact_name,
      phone,
      email,
      city,
      category,
      lead_capacity,
      webhook_ready,
      notes,
      status: "new"
    })
    .select("id")
    .single();

  if (error) return json({ error: error.message }, 500, origin);

  return json({ ok: true, id: data.id }, 200, origin);
});
