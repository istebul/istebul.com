/**
 * İSTEBUL Business Admin — BusinessAdminRuntimeFacade (PR-202F).
 *
 * Uçtan uca Business Admin giriş noktası —
 * Foundation + Dashboard + Reports + Export + Settings Workspaces.
 */

import type { BusinessAdminResult } from '../../runtime/BusinessAdminResult';
import type { BusinessAdminExecutionContext } from './BusinessAdminExecutionContext';
import { createBusinessAdminExecutionContext } from './BusinessAdminExecutionContext';
import type { BusinessAdminExecutionResult } from './BusinessAdminExecutionResult';
import {
  BusinessAdminPipelineRunner,
  createBusinessAdminPipelineRunner,
  type BusinessAdminPipelineRunnerDependencies
} from './BusinessAdminPipelineRunner';

/**
 * Uçtan uca Business Admin facade.
 */
export class BusinessAdminRuntimeFacade {
  private readonly runner: BusinessAdminPipelineRunner;

  constructor(deps?: BusinessAdminPipelineRunnerDependencies) {
    this.runner = createBusinessAdminPipelineRunner(deps);
  }

  /**
   * Tam yürütme — BusinessAdminExecutionResult döner.
   */
  execute(
    context: BusinessAdminExecutionContext = {}
  ): BusinessAdminExecutionResult {
    return this.runner.execute(context);
  }

  /**
   * Kısayol — yalnızca BusinessAdminResult döner.
   */
  run(options: BusinessAdminExecutionContext = {}): BusinessAdminResult {
    const result = this.execute(createBusinessAdminExecutionContext(options));
    return result.businessAdminResult;
  }
}

/**
 * Fabrika.
 */
export function createBusinessAdminRuntimeFacade(
  deps?: BusinessAdminPipelineRunnerDependencies
): BusinessAdminRuntimeFacade {
  return new BusinessAdminRuntimeFacade(deps);
}

export default BusinessAdminRuntimeFacade;
