/**
 * İSTEBUL Identity — Supabase Tenant client port (EPIC-302B).
 *
 * Gerçek @supabase/supabase-js istemcisi DI ile enjekte edilir.
 * Bu dosyada singleton / createClient yoktur.
 * RLS / Middleware / API / Dashboard yok.
 */

/**
 * Ham tenant satırı.
 */
export interface SupabaseTenantRowLike {
  id: string;
  slug: string;
  display_name?: string | null;
  displayName?: string | null;
  name?: string | null;
  domain?: string | null;
  status?: string | null;
}

/**
 * Ham üyelik satırı.
 */
export interface SupabaseMembershipRowLike {
  id: string;
  identity_id?: string | null;
  identityId?: string | null;
  user_id?: string | null;
  tenant_id?: string | null;
  tenantId?: string | null;
  role_label?: string | null;
  roleLabel?: string | null;
  role?: string | null;
  active?: boolean | null;
}

/**
 * Erişim doğrulama sonucu.
 */
export interface SupabaseAccessCheckLike {
  allowed: boolean;
  outcome?: 'allow' | 'deny' | 'restrict' | null;
  allowed_tenant_ids?: string[] | null;
  allowedTenantIds?: string[] | null;
  cross_tenant_allowed?: boolean | null;
  crossTenantAllowed?: boolean | null;
}

/**
 * Supabase hata benzeri.
 */
export interface SupabaseTenantClientErrorLike {
  message: string;
  status?: number;
  code?: string;
  name?: string;
}

/**
 * API yanıt zarfı.
 */
export interface SupabaseTenantResponseLike<TData> {
  data: TData;
  error: SupabaseTenantClientErrorLike | null;
}

/**
 * Minimal Supabase Tenant client sözleşmesi.
 *
 * Gerçek Supabase client bu port üzerinden sarmalanır; testlerde mock kullanılır.
 */
export interface SupabaseTenantClientLike {
  tenants: {
    getById(
      tenantId: string
    ): Promise<SupabaseTenantResponseLike<SupabaseTenantRowLike | null>>;
    getBySlug(
      slug: string
    ): Promise<SupabaseTenantResponseLike<SupabaseTenantRowLike | null>>;
    getByDomain(
      domain: string
    ): Promise<SupabaseTenantResponseLike<SupabaseTenantRowLike | null>>;
  };
  memberships: {
    listByIdentity(
      identityId: string
    ): Promise<SupabaseTenantResponseLike<SupabaseMembershipRowLike[]>>;
    listByTenant(
      tenantId: string
    ): Promise<SupabaseTenantResponseLike<SupabaseMembershipRowLike[]>>;
    getById(
      membershipId: string
    ): Promise<SupabaseTenantResponseLike<SupabaseMembershipRowLike | null>>;
    validateAccess(params: {
      identityId: string;
      tenantId: string;
      resourceId?: string;
    }): Promise<SupabaseTenantResponseLike<SupabaseAccessCheckLike | null>>;
  };
}

/**
 * Client'ın tenant API'sinin mevcut olduğunu doğrular.
 */
export function assertSupabaseTenantClient(
  client: SupabaseTenantClientLike | null | undefined
): asserts client is SupabaseTenantClientLike {
  if (!client || typeof client !== 'object') {
    throw new Error('Supabase Tenant client zorunludur.');
  }
  if (!client.tenants || typeof client.tenants !== 'object') {
    throw new Error('Supabase Tenant client.tenants zorunludur.');
  }
  if (!client.memberships || typeof client.memberships !== 'object') {
    throw new Error('Supabase Tenant client.memberships zorunludur.');
  }

  const tenantMethods = ['getById', 'getBySlug', 'getByDomain'] as const;
  for (const method of tenantMethods) {
    if (typeof client.tenants[method] !== 'function') {
      throw new Error(
        `Supabase Tenant client.tenants.${method} zorunludur.`
      );
    }
  }

  const membershipMethods = [
    'listByIdentity',
    'listByTenant',
    'getById',
    'validateAccess'
  ] as const;
  for (const method of membershipMethods) {
    if (typeof client.memberships[method] !== 'function') {
      throw new Error(
        `Supabase Tenant client.memberships.${method} zorunludur.`
      );
    }
  }
}
