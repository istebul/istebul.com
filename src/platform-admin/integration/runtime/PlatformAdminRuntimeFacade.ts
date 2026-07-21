/**
 * İSTEBUL Platform Admin — PlatformAdminRuntimeFacade (PR-201F).
 *
 * Uçtan uca Platform Admin giriş noktası —
 * Foundation + Tenant + Users + Subscriptions + System Monitoring.
 */

import type { PlatformAdminResult } from '../../runtime/PlatformAdminResult';
import type { PlatformAdminExecutionContext } from './PlatformAdminExecutionContext';
import { createPlatformAdminExecutionContext } from './PlatformAdminExecutionContext';
import type { PlatformAdminExecutionResult } from './PlatformAdminExecutionResult';
import {
  PlatformAdminPipelineRunner,
  createPlatformAdminPipelineRunner,
  type PlatformAdminPipelineRunnerDependencies
} from './PlatformAdminPipelineRunner';

/**
 * Uçtan uca Platform Admin facade.
 */
export class PlatformAdminRuntimeFacade {
  private readonly runner: PlatformAdminPipelineRunner;

  constructor(deps?: PlatformAdminPipelineRunnerDependencies) {
    this.runner = createPlatformAdminPipelineRunner(deps);
  }

  /**
   * Tam yürütme — PlatformAdminExecutionResult döner.
   */
  execute(
    context: PlatformAdminExecutionContext = {}
  ): PlatformAdminExecutionResult {
    return this.runner.execute(context);
  }

  /**
   * Kısayol — yalnızca PlatformAdminResult döner.
   */
  run(
    options: PlatformAdminExecutionContext = {}
  ): PlatformAdminResult {
    const result = this.execute(
      createPlatformAdminExecutionContext(options)
    );
    return result.platformAdminResult;
  }
}

/**
 * Fabrika.
 */
export function createPlatformAdminRuntimeFacade(
  deps?: PlatformAdminPipelineRunnerDependencies
): PlatformAdminRuntimeFacade {
  return new PlatformAdminRuntimeFacade(deps);
}

export default PlatformAdminRuntimeFacade;
