import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enrollInFlow, upsertLifecycleContact } from "../_shared/lifecycle-engine.ts";
import { PUBLIC_ENROLL_FLOWS } from "../_shared/lifecycle-flows.ts";

const allowedOrigins = new Set([
  "https://istebul.com",
  "https://www.istebul.com",
  "https://istebul-com.pages.dev",
  "http://localhost:3000",
  "http://localhost:5173",
]);

function corsHeaders(origin: string | null) {
  const allowedOrigin = origin && allowedOrigins.has(origin)
    ? origin
    : "https://www.istebul.com";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-lifecycle-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

async function checkRateLimit(
  sb: ReturnType<typeof createClient>,
  key: string,
  limit: number,
  windowMs: number
) {
  const now = Date.now();
  const windowStart = new Date(now - windowMs).toISOString();

  const { data, error } = await sb
    .from("auto_rate_limits")
    .select("key, count, window_start")
    .eq("key", key)
    .maybeSingle();

  if (error) throw error;

  if (
    !data ||
    new Date(data.window_start).getTime() < new Date(windowStart).getTime()
  ) {
    await sb.from("auto_rate_limits").upsert(
      {
        key,
        count: 1,
        window_start: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
      },
      { onConflict: "key" }
    );
    return true;
  }

  if (data.count >= limit) return false;

  await sb
    .from("auto_rate_limits")
    .update({
      count: data.count + 1,
      updated_at: new Date(now).toISOString(),
    })
    .eq("key", key);

  return true;
}

function isServiceAuth(req: Request) {
  const secret = Deno.env.get("LIFECYCLE_WEBHOOK_SECRET");
  if (!secret) return false;
  const header = req.headers.get("x-lifecycle-secret") || "";
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return header === secret || bearer === secret;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400, origin);
  }

  const flowId = String(body.flow_id || "").trim();
  if (!flowId) return json({ error: "flow_id_required" }, 400, origin);

  const serviceAuth = isServiceAuth(req);

  if (!serviceAuth) {
    if (!PUBLIC_ENROLL_FLOWS.has(flowId)) {
      return json({ error: "forbidden_flow" }, 403, origin);
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const allowed = await checkRateLimit(sb, `lifecycle_enroll:${ip}:${flowId}`, 8, 60 * 60 * 1000);
    if (!allowed) return json({ error: "rate_limited" }, 429, origin);
  }

  if (body.action === "unsubscribe") {
    const email = String(body.email || "").trim().toLowerCase();
    if (!email) return json({ error: "email_required" }, 400, origin);

    const { data: contact } = await sb
      .from("lifecycle_contacts")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (contact?.id) {
      await sb
        .from("lifecycle_contacts")
        .update({ unsubscribed_at: new Date().toISOString() })
        .eq("id", contact.id);
      await sb
        .from("lifecycle_enrollments")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancel_reason: "unsubscribe",
        })
        .eq("contact_id", contact.id)
        .eq("status", "active");
    }

    return json({ ok: true, unsubscribed: true }, 200, origin);
  }

  if (body.action === "touch") {
    const touch = await upsertLifecycleContact(sb, {
      flowId: "touch",
      email: body.email as string,
      phone: body.phone as string,
      userId: body.user_id as string,
      context: (body.context as Record<string, unknown>) || {},
    });
    if ("error" in touch && touch.error) {
      return json({ error: touch.error }, 400, origin);
    }
    return json({ ok: true, contactId: touch.contact?.id }, 200, origin);
  }

  const result = await enrollInFlow(sb, {
    flowId,
    email: body.email as string,
    phone: body.phone as string,
    userId: body.user_id as string,
    leadId: body.lead_id as string,
    displayName: body.display_name as string,
    context: (body.context as Record<string, unknown>) || {},
    triggerSource: String(body.trigger_source || (serviceAuth ? "webhook" : "web")),
    restart: Boolean(body.restart),
  });

  if ("error" in result && result.error) {
    const status = result.error === "email_required_for_lifecycle" ? 400 : 500;
    return json({ error: result.error }, status, origin);
  }

  return json(result, 200, origin);
});
