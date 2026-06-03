import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCorsOrigin } from "../_shared/cors-origins.ts";
import { recordPlatformEvent } from "../_shared/platform-analytics.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": resolveCorsOrigin(origin),
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

async function anonymizeUserLeads(admin: ReturnType<typeof createClient>, email: string | null) {
  if (!email) return;
  try {
    await admin
      .from("auto_leads")
      .update({
        email: null,
        phone: null,
        contact_name: "KVKK_SILINDI",
        metadata: { anonymized: true, reason: "user_account_deletion" },
      })
      .eq("email", email);
  } catch (err) {
    console.error("auto_leads anonymize failed", err);
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405, origin);
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "unauthorized" }, 401, origin);
  }

  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return json({ error: "unauthorized" }, 401, origin);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400, origin);
  }

  const action = String(body.action || "").trim();
  if (action !== "delete_account") {
    return json({ error: "unsupported_action" }, 400, origin);
  }

  const confirm = body.confirm === true || body.confirm === "true";
  if (!confirm) {
    return json({ error: "confirmation_required" }, 400, origin);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  await anonymizeUserLeads(admin, user.email || null);

  try {
    await admin.from("lifecycle_contacts").delete().eq("user_id", user.id);
  } catch (err) {
    console.error("lifecycle_contacts delete failed", err);
  }

  try {
    await admin.from("user_entitlements").delete().eq("user_id", user.id);
  } catch (err) {
    console.error("user_entitlements delete failed", err);
  }

  try {
    await admin.from("profiles").delete().eq("id", user.id);
  } catch (err) {
    console.error("profiles delete failed", err);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("auth deleteUser failed", deleteError);
    return json({ error: "delete_failed", message: deleteError.message }, 500, origin);
  }

  await recordPlatformEvent(admin, {
    event_name: "user_account_deleted",
    event_category: "compliance",
    user_id: user.id,
    email: user.email || null,
    properties: { source: "self_serve" },
    source: "user_account",
  });

  return json({ ok: true, deleted: true }, 200, origin);
});
