/**
 * İSTEBUL Identity — TenantProviderContext (EPIC-302A).
 *
 * Adapter katmanı girdi bağlamı.
 * Supabase / API / Database / RLS / Business Context yok.
 */

import type { TenantProviderKind } from './TenantProvider';

/**
 * Adapter operasyonu — provider arayüz yöntemleriyle hizalı.
 */
export type TenantProviderOperation =
  | 'resolveTenant'
  | 'getTenant'
  | 'listMemberships'
  | 'validateAccess'
  | 'refreshTenant';

/**
 * Tenant provider yürütme girdi bağlamı.
 */
export interface TenantProviderContext {
  /** Dil */
  locale: 'tr' | 'en';
  /** Hedef provider kimliği */
  providerId: string;
  /** Çalıştırılan operasyon */
  operation?: TenantProviderOperation;
  /** Provider çözümleme türü */
  kind?: TenantProviderKind;
  /** Opsiyonel tenant kimliği */
  tenantId?: string;
  /** Opsiyonel tenant slug */
  tenantSlug?: string;
  /** Opsiyonel identity kimliği */
  identityId?: string;
  /** Opsiyonel üyelik kimliği */
  membershipId?: string;
  /** Opsiyonel oturum kimliği */
  sessionId?: string;
  /** Opsiyonel aktör kimliği */
  actorId?: string;
  /** Hedef kaynak / erişim doğrulama için */
  resourceId?: string;
  /** Ek bag */
  bag?: Record<string, unknown>;
}

/**
 * TenantProviderContext üretir — locale varsayılanı `tr`.
 */
export function createTenantProviderContext(
  partial: Omit<TenantProviderContext, 'locale'> & {
    locale?: 'tr' | 'en';
  }
): TenantProviderContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? 'tr'
  };
}
