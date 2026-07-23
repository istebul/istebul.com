/**
 * İSTEBUL Identity — Supabase Auth client port (EPIC-301B).
 *
 * Gerçek @supabase/supabase-js istemcisi DI ile enjekte edilir.
 * Bu dosyada singleton / createClient yoktur.
 */

/**
 * Supabase Auth kullanıcı benzeri.
 */
export interface SupabaseAuthUserLike {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
}

/**
 * Supabase Auth oturum benzeri.
 */
export interface SupabaseAuthSessionLike {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user?: SupabaseAuthUserLike | null;
}

/**
 * Supabase Auth hata benzeri.
 */
export interface SupabaseClientAuthErrorLike {
  message: string;
  status?: number;
  code?: string;
  name?: string;
}

/**
 * Auth API yanıt zarfı.
 */
export interface SupabaseAuthResponseLike<TData> {
  data: TData;
  error: SupabaseClientAuthErrorLike | null;
}

/**
 * Minimal Supabase Auth client sözleşmesi.
 *
 * Gerçek `SupabaseClient` bu arayüzü karşılar; testlerde mock kullanılır.
 */
export interface SupabaseAuthClientLike {
  auth: {
    signInWithPassword(credentials: {
      email: string;
      password: string;
    }): Promise<
      SupabaseAuthResponseLike<{
        user: SupabaseAuthUserLike | null;
        session: SupabaseAuthSessionLike | null;
      }>
    >;
    refreshSession(params?: {
      refresh_token?: string;
    }): Promise<
      SupabaseAuthResponseLike<{
        user: SupabaseAuthUserLike | null;
        session: SupabaseAuthSessionLike | null;
      }>
    >;
    signOut(options?: {
      scope?: 'global' | 'local' | 'others';
    }): Promise<{ error: SupabaseClientAuthErrorLike | null }>;
    getUser(jwt?: string): Promise<
      SupabaseAuthResponseLike<{
        user: SupabaseAuthUserLike | null;
      }>
    >;
    getSession(): Promise<
      SupabaseAuthResponseLike<{
        session: SupabaseAuthSessionLike | null;
      }>
    >;
  };
}

/**
 * Client'ın auth API'sinin mevcut olduğunu doğrular.
 */
export function assertSupabaseAuthClient(
  client: SupabaseAuthClientLike | null | undefined
): asserts client is SupabaseAuthClientLike {
  if (!client || typeof client !== 'object' || !client.auth) {
    throw new Error('Supabase Auth client zorunludur.');
  }
  const auth = client.auth;
  const required = [
    'signInWithPassword',
    'refreshSession',
    'signOut',
    'getUser',
    'getSession'
  ] as const;
  for (const method of required) {
    if (typeof auth[method] !== 'function') {
      throw new Error(`Supabase Auth client.auth.${method} zorunludur.`);
    }
  }
}
