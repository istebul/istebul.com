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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(null), "Content-Type": "application/json" },
  });
}

function cleanPhone(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function isValidEmail(value: unknown) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req.headers.get("origin")) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Supabase environment variables missing" }, 500);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const type = String(body.type || "");
  const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : {};
  const email = String(body.email || metadata.email || "").trim().toLowerCase();
  const phone = cleanPhone(body.phone || metadata.phone);

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (type === "event") {
    const eventName = String(body.event_name || "").trim();

    if (!eventName || eventName.length > 80) {
      return json({ error: "Invalid event name" }, 400);
    }

    const { error } = await adminClient.from("auto_events").insert({
      event_name: eventName,
      email: email || null,
      phone: phone || null,
      metadata,
    });

    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  if (type === "lead") {
    if (!isValidEmail(email) || phone.length < 10 || phone.length > 15) {
      return json({ error: "Invalid contact information" }, 400);
    }

    const form = body.formData && typeof body.formData === "object" ? body.formData : metadata;

    const payload = {
      email,
      phone,
      budget: Number(form.budget || 0),
      usage: String(form.usage || ""),
      body: String(form.body || ""),
      fuel: String(form.fuel || ""),
      km: Number(form.km || 0),
      loan: String(form.loan || ""),
      source: "auto",
    };

    const { data: updatedRows, error: updateError } = await adminClient
      .from("auto_leads")
      .update(payload)
      .eq("email", email)
      .select("id");

    if (updateError) return json({ error: updateError.message }, 500);

    if (!updatedRows?.length) {
      const { error: insertError } = await adminClient.from("auto_leads").insert(payload);
      if (insertError) return json({ error: insertError.message }, 500);
    }

    return json({ ok: true });
  }

  return json({ error: "Invalid intake type" }, 400);
});
