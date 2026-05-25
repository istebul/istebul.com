import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
const OPS_ALERT_WEBHOOK_SECRET = Deno.env.get("OPS_ALERT_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function unauthorized() {
  return new Response("unauthorized", { status: 401 });
}

function isAuthorized(req: Request) {
  if (!OPS_ALERT_WEBHOOK_SECRET) {
    console.error("OPS_ALERT_WEBHOOK_SECRET is not configured");
    return false;
  }
  const bearer = req.headers.get("authorization") || "";
  const headerSecret = req.headers.get("x-webhook-secret") || "";
  return (
    bearer === `Bearer ${OPS_ALERT_WEBHOOK_SECRET}` ||
    headerSecret === OPS_ALERT_WEBHOOK_SECRET
  );
}

async function sendTelegram(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error("Telegram is not configured");
  }
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
  });
}

async function recordOpsEvent(eventName: string, properties: Record<string, unknown>) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  await admin.from("operational_events").insert({
    severity: "info",
    category: "ops_automation",
    event_name: eventName,
    source: "ops-alert-digest",
    properties,
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }
  if (!isAuthorized(req)) {
    return unauthorized();
  }

  try {
    const body = await req.json();
    const alerts = Array.isArray(body.alerts) ? body.alerts : [];
    if (!alerts.length) {
      return new Response(JSON.stringify({ ok: true, sent: false }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const lines = alerts.map(
      (a: { severity?: string; domain?: string; message?: string }) =>
        `[${a.severity || "warn"}] ${a.domain || "ops"}: ${a.message || "alert"}`
    );
    const text = `📊 isteBul Ops Digest\n\n${lines.join("\n")}\n\n— P9 automation`;
    await sendTelegram(text.slice(0, 4000));
    await recordOpsEvent("ops_alert_digest_sent", { count: alerts.length });

    return new Response(JSON.stringify({ ok: true, sent: true, count: alerts.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
