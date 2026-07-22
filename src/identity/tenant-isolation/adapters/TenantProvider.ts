/**
 * İSTEBUL Identity — TenantProvider port (EPIC-302A).
 *
 * Gerçek tenant sağlayıcıları için adapter arayüzü.
 * Bu PR'da provider implementasyonu yoktur.
 *
 * Architecture Freeze — Tenant Isolation Runtime değiştirilmez.
 */

import type { TenantProviderContext } from './TenantProviderContext';
import type { TenantProviderResult } from './TenantProviderResult';

/**
 * Tenant çözümleme stratejisi / provider türü.
 * Yalnızca adapter katmanı metadata'sı — runtime modeli değildir.
 */
export type TenantProviderKind =
  | 'registry'
  | 'membership'
  | 'slug'
  | 'domain'
  | 'header'
  | 'claim';

/**
 * Provider kayıt metadata'sı — implementasyon olmadan slot tanımı.
 */
export interface TenantProviderRegistration {
  /** Provider kimliği */
  id: string;
  /** Görünen ad */
  name: string;
  /** Açıklama */
  description: string;
  /** Çözümleme türü */
  kind: TenantProviderKind;
  /** Provider implementasyonu kayıtlı mı */
  providerRegistered: boolean;
  /** Sıralama */
  order: number;
}

/**
 * Provider operasyon sonucu — senkron veya asenkron.
 */
export type TenantProviderOperationResult =
  | TenantProviderResult
  | Promise<TenantProviderResult>;

/**
 * Tenant provider port arayüzü.
 *
 * Gerçek sağlayıcılar (Supabase, API vb.) gelecek PR'larda
 * bu arayüzü uygular; bu foundation katmanında implementasyon yoktur.
 */
export interface TenantProvider {
  /** Benzersiz provider kimliği */
  readonly id: string;
  /** Desteklenen çözümleme türü */
  readonly kind: TenantProviderKind;
  /** Tenant çözümleme */
  resolveTenant(context: TenantProviderContext): TenantProviderOperationResult;
  /** Tenant getirme */
  getTenant(context: TenantProviderContext): TenantProviderOperationResult;
  /** Üyelik listesi */
  listMemberships(
    context: TenantProviderContext
  ): TenantProviderOperationResult;
  /** Erişim doğrulama */
  validateAccess(
    context: TenantProviderContext
  ): TenantProviderOperationResult;
  /** Tenant yenileme */
  refreshTenant(context: TenantProviderContext): TenantProviderOperationResult;
}
