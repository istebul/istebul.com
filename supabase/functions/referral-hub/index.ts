import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  attributeReferralSignup,
  ensureReferralCode,
  normalizeReferralCode,
  processReferralConversion,
  trackReferralClick,
} from "../_shared/referral-engine.ts";
import { recordPlatformEvent } from "../_shared/platform-analytics.ts";
import { resolveCorsOrigin } from "../_shared/cors-origins.ts";

function corsHeaders(origin: string | null) {
  const allowedOrigin = resolveCorsOrigin(origin, "https://www.istebul.com", {
    allowLocalDev: true,
  });
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
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
    .update({ count: data.count + 1, updated_at: new Date(now).toISOString() })
    .eq("key", key);
  return true;
}

function isServiceAuth(req: Request) {
  const secret =
    Deno.env.get("REFERRAL_WEBHOOK_SECRET") ||
    Deno.env.get("LIFECYCLE_WEBHOOK_SECRET");
  if (!secret) return false;
  const header =
    req.headers.get("x-referral-secret") ||
    req.headers.get("x-lifecycle-secret") ||
    "";
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return header === secret || bearer === secret;
}

async function getUserFromRequest(req: Request, sb: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
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

  const action = String(body.action || "").trim();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const serviceAuth = isServiceAuth(req);

  if (action === "process_conversion" && serviceAuth) {
    const code = normalizeReferralCode(body.referral_code || body.code);
    if (!code) return json({ error: "invalid_code" }, 400, origin);

    const result = await processReferralConversion(sb, {
      referralCode: code,
      conversionType: body.conversion_type === "subscription" ? "subscription" : "lead",
      refereeEmail: body.referee_email as string,
      refereeUserId: body.referee_user_id as string,
      sessionId: String(body.session_id || "").slice(0, 64) || null,
    });

    return json(result, 200, origin);
  }

  if (action === "track_click") {
    const code = normalizeReferralCode(body.code);
    if (!code) return json({ error: "invalid_code" }, 400, origin);

    const allowed = await checkRateLimit(
      sb,
      `referral_click:${ip}:${code}`,
      20,
      60 * 60 * 1000
    );
    if (!allowed) return json({ error: "rate_limited" }, 429, origin);

    const result = await trackReferralClick(sb, {
      code,
      sessionId: String(body.session_id || "").slice(0, 64) || null,
      refereeEmail: body.email as string,
      ip,
    });

    if ("error" in result && result.error) {
      return json({ error: result.error }, 400, origin);
    }
    return json(result, 200, origin);
  }

  const user = await getUserFromRequest(req, sb);

  if (action === "ensure_code") {
    if (!user?.id || !user.email) {
      return json({ error: "auth_required" }, 401, origin);
    }

    const result = await ensureReferralCode(sb, {
      userId: user.id,
      email: user.email,
      displayName: user.user_metadata?.full_name,
    });

    if ("error" in result && result.error) {
      return json({ error: result.error }, 500, origin);
    }

    if (result.created) {
      try {
        await recordPlatformEvent(sb, {
          event_name: "referral_link_created",
          email: user.email,
          user_id: user.id,
          funnel: "referral",
          funnel_step: "link_created",
          properties: { referral_code: result.code },
          source: "referral_hub",
        });
      } catch {
        /* non-blocking */
      }
    }

    return json({ ok: true, code: result.code, created: result.created }, 200, origin);
  }

  if (action === "attribute_signup") {
    if (!user?.id || !user.email) {
      return json({ error: "auth_required" }, 401, origin);
    }

    const code = normalizeReferralCode(body.code || body.referral_code);
    if (!code) return json({ error: "invalid_code" }, 400, origin);

    const result = await attributeReferralSignup(sb, {
      code,
      userId: user.id,
      email: user.email,
      sessionId: String(body.session_id || "").slice(0, 64) || null,
    });

    if ("error" in result && result.error) {
      const status = result.error === "self_referral" ? 400 : 500;
      return json({ error: result.error }, status, origin);
    }
    return json(result, 200, origin);
  }

  if (action === "get_entitlements") {
    if (!user?.id) return json({ error: "auth_required" }, 401, origin);

    const { data: profile } = await sb
      .from("profiles")
      .select("referral_entitlements")
      .eq("id", user.id)
      .maybeSingle();

    return json(
      { ok: true, entitlements: profile?.referral_entitlements || {} },
      200,
      origin
    );
  }

  return json({ error: "unknown_action" }, 400, origin);
});
