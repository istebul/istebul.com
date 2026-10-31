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
  readonly locale: 'tr' | 'en';
  /** Hedef provider kimliği */
  readonly providerId: string;
  /** Çalıştırılan operasyon */
  readonly operation?: TenantProviderOperation;
  /** Provider çözümleme türü */
  readonly kind?: TenantProviderKind;
  /** Opsiyonel tenant kimliği */
  readonly tenantId?: string;
  /** Opsiyonel tenant slug */
  readonly tenantSlug?: string;
  /** Opsiyonel identity kimliği */
  readonly identityId?: string;
  /** Opsiyonel üyelik kimliği */
  readonly membershipId?: string;
  /** Opsiyonel oturum kimliği */
  readonly sessionId?: string;
  /** Opsiyonel aktör kimliği */
  readonly actorId?: string;
  /** Hedef kaynak / erişim doğrulama için */
  readonly resourceId?: string;
  /** Ek bag */
  readonly bag?: Readonly<Record<string, unknown>>;
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
  return Object.freeze({
    ...rest,
    bag: rest.bag ? Object.freeze({ ...rest.bag }) : undefined,
    locale: locale ?? 'tr'
  });
}
