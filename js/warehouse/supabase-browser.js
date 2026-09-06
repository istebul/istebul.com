import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm";

const SUPABASE_URL = window.__env?.SUPABASE_URL || window.env?.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = window.__env?.SUPABASE_ANON_KEY || window.env?.SUPABASE_ANON_KEY || "";

export const warehouseSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storageKey: "istebul-auth-public-v1",
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true
  }
});
