/**
 * Cloudflare Pages / build-time public env (window.__env from env.js).
 */

export function getPublicEnv() {
  return typeof window !== 'undefined' ? window.__env || {} : {};
}

export function requireSupabasePublicEnv() {
  const env = getPublicEnv();
  const url = String(env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = env.SUPABASE_ANON_KEY || '';
  if (!url || !key) {
    throw new Error('SUPABASE_URL veya SUPABASE_ANON_KEY yapılandırılmamış (env.js / build).');
  }
  return { url, key };
}

/**
 * @param {() => Promise<{ data: unknown, error: unknown }>} queryFn
 * @param {string} [context]
 */
export async function safeSupabaseQuery(queryFn, context = 'supabase') {
  try {
    const result = await queryFn();
    if (result?.error) {
      console.error(`[${context}]`, result.error);
      return { data: null, error: result.error };
    }
    return { data: result.data ?? null, error: null };
  } catch (err) {
    console.error(`[${context}]`, err);
    return { data: null, error: err };
  }
}
