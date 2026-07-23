/**
 * İSTEBUL Identity — TenantIntegrationExecutionContext (EPIC-302E).
 *
 * Shared bag/locale/actor fields from core execution contracts (PR-901A).
 * Public type names unchanged.
 */

import type { TenantProviderContext } from '../adapters/TenantProviderContext';
import type {
  ExecutionContextBase,
  PipelineBag
} from '../../../core/execution/index';

/**
 * Pipeline bag — instance bazlı; yeni global bag yok.
 */
export type TenantIntegrationPipelineBag = PipelineBag;

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
export interface TenantIntegrationExecutionContext extends ExecutionContextBase {
  /** Integration operasyonu — varsayılan synchronize */
  operation?: TenantIntegrationOperation;
  /** Adapter'a iletilecek provider bağlamı */
  providerContext?: TenantProviderContext;
  /** Provider kimliği (providerContext yoksa) */
  providerId?: string;
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
