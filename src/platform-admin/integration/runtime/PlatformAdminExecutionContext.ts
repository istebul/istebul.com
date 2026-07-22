/**
 * İSTEBUL Platform Admin — PlatformAdminExecutionContext (PR-201F).
 *
 * Shared bag/locale/actor fields from core execution contracts (PR-901A).
 * Public type names unchanged.
 */

import type { PlatformAdminModuleId } from '../../runtime/PlatformAdminModule';
import type {
  ExecutionContextBase,
  PipelineBag
} from '../../../core/execution/index';

/**
 * Pipeline bag — mevcut Platform Admin bag anahtarları kullanılır.
 * Yeni global bag oluşturulmaz.
 */
export type PlatformAdminPipelineBag = PipelineBag;

/**
 * Uçtan uca Platform Admin yürütme bağlamı.
 */
export interface PlatformAdminExecutionContext extends ExecutionContextBase {
  /** Foundation modül filtresi */
  moduleIds?: readonly PlatformAdminModuleId[];
  /** Tenant filtresi */
  tenantIds?: readonly string[];
  /** User filtresi */
  userIds?: readonly string[];
  /** Subscription filtresi */
  subscriptionIds?: readonly string[];
  /** System monitoring servis filtresi */
  serviceIds?: readonly string[];
  /** Başlangıç pipeline bag — mevcut bag anahtarları */
  initialBag?: PlatformAdminPipelineBag;
}

/**
 * PlatformAdminExecutionContext fabrikası.
 */
export function createPlatformAdminExecutionContext(
  partial: PlatformAdminExecutionContext = {}
): PlatformAdminExecutionContext {
  return { ...partial };
}
