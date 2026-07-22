/**
 * İSTEBUL Identity — IdentityAccessRuntimeFacade (PR-203F).
 *
 * Uçtan uca Identity & Access giriş noktası —
 * Identity + Authentication + Session + Authorization + Tenant Isolation.
 */

import type { IdentityAccessResult } from './IdentityAccessExecutionResult';
import type { IdentityAccessExecutionContext } from './IdentityAccessExecutionContext';
import { createIdentityAccessExecutionContext } from './IdentityAccessExecutionContext';
import type { IdentityAccessExecutionResult } from './IdentityAccessExecutionResult';
import {
  IdentityAccessPipelineRunner,
  createIdentityAccessPipelineRunner,
  type IdentityAccessPipelineRunnerDependencies
} from './IdentityAccessPipelineRunner';

/**
 * Uçtan uca Identity & Access facade.
 */
export class IdentityAccessRuntimeFacade {
  private readonly runner: IdentityAccessPipelineRunner;

  constructor(deps?: IdentityAccessPipelineRunnerDependencies) {
    this.runner = createIdentityAccessPipelineRunner(deps);
  }

  /**
   * Tam yürütme — IdentityAccessExecutionResult döner.
   */
  execute(
    context: IdentityAccessExecutionContext = {}
  ): IdentityAccessExecutionResult {
    return this.runner.execute(context);
  }

  /**
   * Kısayol — yalnızca IdentityAccessResult döner.
   */
  run(options: IdentityAccessExecutionContext = {}): IdentityAccessResult {
    const result = this.execute(createIdentityAccessExecutionContext(options));
    return result.identityAccessResult;
  }
}

/**
 * Fabrika.
 */
export function createIdentityAccessRuntimeFacade(
  deps?: IdentityAccessPipelineRunnerDependencies
): IdentityAccessRuntimeFacade {
  return new IdentityAccessRuntimeFacade(deps);
}

export default IdentityAccessRuntimeFacade;
