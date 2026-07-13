export interface PublicEnv {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

declare global {
  interface Window {
    __env?: PublicEnv;
  }
}

const ENV_KEYS = {
  url: ['SUPABASE_URL', 'VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'],
  anonKey: ['SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
} as const;

function readMetaEnv(key: string): string {
  const value = import.meta.env[key];
  return typeof value === 'string' ? value.trim() : '';
}

function pickEnvValue(keys: readonly string[]): string {
  for (const key of keys) {
    const fromMeta = readMetaEnv(key);
    if (fromMeta) return fromMeta;
  }

  if (typeof window !== 'undefined' && window.__env) {
    for (const key of keys) {
      const value = window.__env[key as keyof PublicEnv];
      if (value && String(value).trim()) return String(value).trim();
    }
  }

  return '';
}

export function getSupabaseUrl(): string {
  return pickEnvValue(ENV_KEYS.url);
}

export function getSupabaseAnonKey(): string {
  return pickEnvValue(ENV_KEYS.anonKey);
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}
