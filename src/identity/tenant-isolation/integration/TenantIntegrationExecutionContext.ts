/**
 * İSTEBUL Identity — TenantIntegrationExecutionContext (EPIC-302E).
 */

import type { TenantProviderContext } from '../adapters/TenantProviderContext';

/**
 * Pipeline bag — instance bazlı; yeni global bag yok.
 */
export type TenantIntegrationPipelineBag = Record<string, unknown>;

/**
 * Integration operasyonu — alt katmanlara iletilir.
 */
export type TenantIntegrationOperation =
  | 'synchronize'
  | 'refresh'
  | 'validate'
  | 'mapWorkspace';

/**
 * Uçtan uca Tenant Integration yürütme bağlamı.
 */
export interface TenantIntegrationExecutionContext {
  /**
   * Dil — varsayılan `tr`.
   * Geçersiz değerler validation aşamasında error üretir.
   */
  locale?: 'tr' | 'en' | (string & {});
  /** Integration operasyonu — varsayılan synchronize */
  operation?: TenantIntegrationOperation;
  /** Adapter'a iletilecek provider bağlamı */
  providerContext?: TenantProviderContext;
  /** Provider kimliği (providerContext yoksa) */
  providerId?: string;
  /** Opsiyonel aktör kimliği */
  actorId?: string;
  /** Opsiyonel tenant kimliği */
  tenantId?: string;
  /** Opsiyonel tenant slug */
  tenantSlug?: string;
  /** Opsiyonel business kimliği */
  businessId?: string;
  /** Opsiyonel identity kimliği */
  identityId?: string;
  /** Opsiyonel oturum kimliği */
  sessionId?: string;
  /** Opsiyonel üyelik kimliği */
  membershipId?: string;
  /** Opsiyonel workspace kimliği */
  workspaceId?: string;
  /** Opsiyonel workspace etiketi */
  workspaceLabel?: string;
  /** Opsiyonel business runtime modül kimlikleri */
  moduleIds?: readonly string[];
  /** Opsiyonel business context bridge binding */
  businessContextBridgeBindingId?: string;
  /** Opsiyonel tenant session bridge binding */
  sessionBridgeBindingId?: string;
  /** Başlangıç pipeline bag */
  initialBag?: TenantIntegrationPipelineBag;
}

/**
 * TenantIntegrationExecutionContext fabrikası.
 */
export function createTenantIntegrationExecutionContext(
  partial: TenantIntegrationExecutionContext = {}
): TenantIntegrationExecutionContext {
  return { ...partial };
}
