/**
 * İSTEBUL Business Dashboard Engine — DashboardRuntimeFacade (PR-105F).
 *
 * Uçtan uca dashboard giriş noktası — mevcut runtime katmanlarını birleştirir.
 * Yeni dashboard mantığı eklemez.
 */

import type { DashboardRequest } from '../../models/DashboardRequest';
import type { DashboardModel } from '../../models/DashboardModel';
import type { DashboardExecutionContext } from './DashboardExecutionContext';
import { createDashboardExecutionContext } from './DashboardExecutionContext';
import type { DashboardExecutionResult } from './DashboardExecutionResult';
import {
  DashboardPipelineRunner,
  createDashboardPipelineRunner,
  type DashboardPipelineRunnerDependencies
} from './DashboardPipelineRunner';

/**
 * Uçtan uca Dashboard Engine facade.
 */
export class DashboardRuntimeFacade {
  private readonly runner: DashboardPipelineRunner;

  constructor(deps?: DashboardPipelineRunnerDependencies) {
    this.runner = createDashboardPipelineRunner(deps);
  }

  /**
   * Tam yürütme — DashboardExecutionResult döner.
   */
  async execute(
    context: DashboardExecutionContext
  ): Promise<DashboardExecutionResult> {
    return this.runner.execute(context);
  }

  /**
   * Kısayol — yalnızca foundation DashboardModel (DashboardResult) döner.
   */
  async run(
    request: DashboardRequest,
    options: Omit<DashboardExecutionContext, 'request'> = {}
  ): Promise<DashboardModel> {
    const result = await this.execute(
      createDashboardExecutionContext({ request, ...options })
    );
    return result.dashboardModel;
  }
}

/**
 * Fabrika.
 */
export function createDashboardRuntimeFacade(
  deps?: DashboardPipelineRunnerDependencies
): DashboardRuntimeFacade {
  return new DashboardRuntimeFacade(deps);
}

export default DashboardRuntimeFacade;
