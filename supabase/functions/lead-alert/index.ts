import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const LEAD_ALERT_WEBHOOK_SECRET = Deno.env.get("LEAD_ALERT_WEBHOOK_SECRET");

const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

function unauthorized() {
  return new Response("unauthorized", { status: 401 });
}

function isAuthorized(req: Request) {
  if (!LEAD_ALERT_WEBHOOK_SECRET) {
    console.error("LEAD_ALERT_WEBHOOK_SECRET is not configured");
    return false;
  }

  const bearer = req.headers.get("authorization") || "";
  const headerSecret = req.headers.get("x-webhook-secret") || "";

  if (bearer === `Bearer ${LEAD_ALERT_WEBHOOK_SECRET}`) {
    return true;
  }

  if (headerSecret === LEAD_ALERT_WEBHOOK_SECRET) {
    return true;
  }

  return false;
}

async function sendTelegram(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error("Telegram is not configured");
  }

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
    }),
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
    const payload = await req.json();
    const record = payload.record;

    if (!record) {
      return new Response("no record", { status: 400 });
    }

    const msg = `
🔥 Yeni Lead

📞 ${record.phone || "-"}
📧 ${record.email || "-"}
🚗 ${record.vehicle || "-"}
💰 Bütçe: ${record.budget || "-"} ₺
🎯 Skor: ${record.lead_score || 0}
🔥 Öncelik: ${record.priority || "-"}
🤝 Partner: ${record.partner_route || "-"}
`.trim();

    await sendTelegram(msg);

    return new Response("ok");
  } catch (e) {
    console.error("lead-alert failed", e);
    return new Response("error", { status: 500 });
  }
});
