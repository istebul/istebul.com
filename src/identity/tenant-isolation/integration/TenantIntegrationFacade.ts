/**
 * İSTEBUL Identity — TenantIntegrationFacade (EPIC-302E).
 *
 * Uçtan uca Tenant Integration giriş noktası —
 * Adapter + Supabase Tenant Provider + Session Bridge + Business Context Bridge.
 *
 * 302A–302D implementasyonlarını değiştirmez.
 */

import type { TenantIntegrationResult } from './TenantIntegrationExecutionResult';
import type { TenantIntegrationExecutionContext } from './TenantIntegrationExecutionContext';
import { createTenantIntegrationExecutionContext } from './TenantIntegrationExecutionContext';
import type { TenantIntegrationExecutionResult } from './TenantIntegrationExecutionResult';
import {
  TenantIntegrationPipelineRunner,
  createTenantIntegrationPipelineRunner,
  type TenantIntegrationPipelineRunnerDependencies
} from './TenantIntegrationPipelineRunner';

/**
 * Uçtan uca Tenant Integration facade.
 */
export class TenantIntegrationFacade {
  private readonly runner: TenantIntegrationPipelineRunner;

  constructor(deps?: TenantIntegrationPipelineRunnerDependencies) {
    this.runner = createTenantIntegrationPipelineRunner(deps);
  }

  getRunner(): TenantIntegrationPipelineRunner {
    return this.runner;
  }

  /**
   * Tam yürütme — TenantIntegrationExecutionResult döner.
   */
  execute(
    context: TenantIntegrationExecutionContext = {}
  ): Promise<TenantIntegrationExecutionResult> {
    return this.runner.execute(context);
  }

  /**
   * Kısayol — yalnızca TenantIntegrationResult döner.
   */
  async run(
    options: TenantIntegrationExecutionContext = {}
  ): Promise<TenantIntegrationResult> {
    const result = await this.execute(
      createTenantIntegrationExecutionContext(options)
    );
    return result.tenantIntegrationResult;
  }
}

/**
 * Fabrika — singleton yok.
 */
export function createTenantIntegrationFacade(
  deps?: TenantIntegrationPipelineRunnerDependencies
): TenantIntegrationFacade {
  return new TenantIntegrationFacade(deps);
}

export default TenantIntegrationFacade;
