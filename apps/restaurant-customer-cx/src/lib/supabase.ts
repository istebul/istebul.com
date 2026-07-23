import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from '@/lib/env';

let supabaseSingleton: SupabaseClient | null = null;

const AUTH_OPTS = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
} as const;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (supabaseSingleton) return supabaseSingleton;

  supabaseSingleton = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { ...AUTH_OPTS },
  });

  return supabaseSingleton;
}

/** P7-KA: scoped anon client that can SELECT the just-inserted reservation via access token. */
export function getSupabaseClientWithReservationToken(
  accessToken: string,
): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  const token = String(accessToken || '').trim();
  if (token.length < 32) return null;

  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { ...AUTH_OPTS },
    global: {
      headers: {
        'x-garson-reservation-token': token,
      },
    },
  });
}

export function createReservationAccessToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '');
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}${Math.random()
    .toString(16)
    .slice(2)}`.padEnd(32, '0');
}
