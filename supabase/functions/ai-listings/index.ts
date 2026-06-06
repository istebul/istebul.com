/**
 * isteBul AI Listings Engine v1 — Edge Function API (internal only).
 *
 * INACTIVE BY DEFAULT:
 * - Requires AI_LISTINGS_SUPABASE_ENABLED=true
 * - Requires AI_LISTINGS_EDGE_SECRET + x-ai-listings-secret header
 * - Uses SUPABASE_SERVICE_ROLE_KEY (never anon key)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleAiListingsRequest } from "../_shared/ai-listings/handler.js";

Deno.serve(async (req) => {
  const env = {
    AI_LISTINGS_SUPABASE_ENABLED: Deno.env.get("AI_LISTINGS_SUPABASE_ENABLED") ?? undefined,
    AI_LISTINGS_EDGE_SECRET: Deno.env.get("AI_LISTINGS_EDGE_SECRET") ?? undefined,
    SUPABASE_URL: Deno.env.get("SUPABASE_URL") ?? undefined,
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? undefined,
  };

  return handleAiListingsRequest(req, {
    env,
    createServiceClient: (url, key) =>
      createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
  });
});
