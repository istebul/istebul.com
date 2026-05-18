import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESET_SECRET = Deno.env.get("PARTNER_DAILY_RESET_SECRET");

const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

Deno.serve(async (req) => {
  const incoming = req.headers.get("x-reset-secret");

  if (!RESET_SECRET || incoming !== RESET_SECRET) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { error } = await sb
    .from("partner_endpoints")
    .update({
      sent_today: 0,
      updated_at: new Date().toISOString()
    })
    .neq("sent_today", 0);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ ok: true, reset: "sent_today" }), {
    headers: { "Content-Type": "application/json" }
  });
});
