import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from '@/lib/env';

export const GARSON_AUTH_STORAGE_KEY = 'istebul-auth-garson-v1';

let supabaseSingleton: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (supabaseSingleton) return supabaseSingleton;

  supabaseSingleton = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      storageKey: GARSON_AUTH_STORAGE_KEY,
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return supabaseSingleton;
}

export function resetSupabaseClientForTests() {
  supabaseSingleton = null;
}
