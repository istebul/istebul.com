/**
 * AI Listings user intake — site-style public edge (anon key, no edge secret).
 * Same connection pattern as listing-analysis-intake.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isAllowedOrigin, resolveCorsOrigin } from "../_shared/cors-origins.ts";
import { validateCreateListingBody } from "../_shared/ai-listings/validation.js";

function headers(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": resolveCorsOrigin(origin),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const allowed = !origin || isAllowedOrigin(origin);

  if (req.method === "OPTIONS") {
    if (!allowed) return new Response(null, { status: 403 });
    return new Response("ok", { headers: headers(origin) });
  }
  if (!allowed) return json({ ok: false, error: "Forbidden origin" }, 403, "https://www.istebul.com");
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405, origin);

  const moduleEnabled = String(Deno.env.get("AI_LISTINGS_SUPABASE_ENABLED") ?? "").trim().toLowerCase();
  if (moduleEnabled !== "true" && moduleEnabled !== "1") {
    return json({ ok: false, error: "AI listings module is disabled" }, 503, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) return json({ ok: false, error: "Service unavailable" }, 500, origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400, origin);
  }

  const validation = validateCreateListingBody(body);
  if (!validation.ok) {
    return json({ ok: false, error: validation.message }, 400, origin);
  }

  const adminClient = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authHeader = req.headers.get("authorization") || "";
  let userId: string | null = null;
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();
    if (token && token !== Deno.env.get("SUPABASE_ANON_KEY")) {
      const { data } = await adminClient.auth.getUser(token);
      userId = data?.user?.id || null;
    }
  }

  const input = validation.value;
  const row = {
    category: input.category,
    title: input.title,
    description: input.description ?? null,
    location: input.location ? { label: String(input.location) } : null,
    price: input.price ?? null,
    currency: input.currency ?? "TRY",
    images: input.images ?? [],
    attributes: input.attributes ?? {},
    status: "draft",
    source_type: input.source_type ?? "user_listing",
    source_url: input.source_url ?? null,
    owner_user_id: userId ?? input.owner_user_id ?? null,
  };

  const { data: listing, error } = await adminClient.from("ai_listings").insert(row).select("*").single();
  if (error) return json({ ok: false, error: "Listing intake failed" }, 500, origin);

  await adminClient.from("ai_listing_events").insert({
    listing_id: listing.id,
    event_type: "listing_created",
    payload: { source_type: row.source_type, intake: "ai-listings-intake" },
  });

  return json({ ok: true, listing_id: listing.id, listing }, 201, origin);
});
