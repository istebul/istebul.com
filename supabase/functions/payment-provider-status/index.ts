import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { paymentJson, paymentCorsHeaders } from "../_shared/cors.ts";
import { providerStatusSnapshot } from "../_shared/payment-env.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

async function getUser(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY },
  });
  if (!res.ok) return null;
  return res.json();
}

async function isAdmin(userId: string): Promise<boolean> {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data } = await sb
    .from("profiles")
    .select("role, is_banned")
    .eq("id", userId)
    .maybeSingle();
  return data?.role === "admin" && !data?.is_banned;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: paymentCorsHeaders(origin) });
  }
  if (req.method !== "GET" && req.method !== "POST") {
    return paymentJson({ ok: false }, 405, origin);
  }

  const user = await getUser(req);
  if (!user?.id || !(await isAdmin(user.id))) {
    return paymentJson({ ok: false, code: "FORBIDDEN" }, 403, origin);
  }

  return paymentJson({ ok: true, providers: providerStatusSnapshot() }, 200, origin);
});
