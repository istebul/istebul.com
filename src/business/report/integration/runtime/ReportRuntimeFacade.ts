/**
 * İSTEBUL Business Report Engine — ReportRuntimeFacade (PR-104F).
 *
 * Uçtan uca rapor giriş noktası — mevcut runtime katmanlarını birleştirir.
 * Yeni rapor mantığı eklemez.
 */

import type { ReportRequest } from '../../models/ReportRequest';
import type { ReportModel } from '../../models/ReportModel';
import type { ReportExecutionContext } from './ReportExecutionContext';
import { createReportExecutionContext } from './ReportExecutionContext';
import type { ReportExecutionResult } from './ReportExecutionResult';
import {
  ReportPipelineRunner,
  createReportPipelineRunner,
  type ReportPipelineRunnerDependencies
} from './ReportPipelineRunner';

/**
 * Uçtan uca Report Engine facade.
 */
export class ReportRuntimeFacade {
  private readonly runner: ReportPipelineRunner;

  constructor(deps?: ReportPipelineRunnerDependencies) {
    this.runner = createReportPipelineRunner(deps);
  }

  /**
   * Tam yürütme — ReportExecutionResult döner.
   */
  async execute(
    context: ReportExecutionContext
  ): Promise<ReportExecutionResult> {
    return this.runner.execute(context);
  }

  /**
   * Kısayol — yalnızca foundation ReportModel (ReportResult) döner.
   */
  async run(
    request: ReportRequest,
    options: Omit<ReportExecutionContext, 'request'> = {}
  ): Promise<ReportModel> {
    const result = await this.execute(
      createReportExecutionContext({ request, ...options })
    );
    return result.reportModel;
  }
}

/**
 * Fabrika.
 */
export function createReportRuntimeFacade(
  deps?: ReportPipelineRunnerDependencies
): ReportRuntimeFacade {
  return new ReportRuntimeFacade(deps);
}

export default ReportRuntimeFacade;
