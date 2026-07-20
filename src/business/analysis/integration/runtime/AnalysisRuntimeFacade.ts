/**
 * İSTEBUL Business Analysis Engine — AnalysisRuntimeFacade (PR-102F).
 *
 * Uçtan uca analiz giriş noktası — mevcut runtime katmanlarını birleştirir.
 */

import type { AnalysisRequest } from '../../models/AnalysisRequest';
import type { AnalysisResult } from '../../models/AnalysisResult';
import type { AnalysisExecutionContext } from './AnalysisExecutionContext';
import { createAnalysisExecutionContext } from './AnalysisExecutionContext';
import type { AnalysisExecutionResult } from './AnalysisExecutionResult';
import {
  AnalysisPipelineRunner,
  createAnalysisPipelineRunner,
  type AnalysisPipelineRunnerDependencies
} from './AnalysisPipelineRunner';

/**
 * Uçtan uca Analysis Engine facade.
 */
export class AnalysisRuntimeFacade {
  private readonly runner: AnalysisPipelineRunner;

  constructor(deps?: AnalysisPipelineRunnerDependencies) {
    this.runner = createAnalysisPipelineRunner(deps);
  }

  /**
   * Tam yürütme — AnalysisExecutionResult döner.
   */
  async execute(
    context: AnalysisExecutionContext
  ): Promise<AnalysisExecutionResult> {
    return this.runner.execute(context);
  }

  /**
   * Kısayol — yalnızca AnalysisResult döner.
   */
  async run(
    request: AnalysisRequest,
    options: Omit<AnalysisExecutionContext, 'request'> = {}
  ): Promise<AnalysisResult> {
    const result = await this.execute(
      createAnalysisExecutionContext({ request, ...options })
    );
    return result.analysisResult;
  }
}

/**
 * Fabrika.
 */
export function createAnalysisRuntimeFacade(
  deps?: AnalysisPipelineRunnerDependencies
): AnalysisRuntimeFacade {
  return new AnalysisRuntimeFacade(deps);
}

export default AnalysisRuntimeFacade;
