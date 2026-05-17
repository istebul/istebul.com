import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

async function sendTelegram(text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text
    })
  });
}

Deno.serve(async (req) => {
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
    return new Response(String(e), { status: 500 });
  }
});
