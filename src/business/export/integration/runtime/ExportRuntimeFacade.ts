/**
 * İSTEBUL Business Export Engine — ExportRuntimeFacade (PR-106F).
 *
 * Uçtan uca export giriş noktası — mevcut runtime katmanlarını birleştirir.
 * Yeni export mantığı eklemez.
 */

import type { ExportRequest } from '../../models/ExportRequest';
import type { ExportResult } from '../../models/ExportResult';
import type { ExportExecutionContext } from './ExportExecutionContext';
import { createExportExecutionContext } from './ExportExecutionContext';
import type { ExportExecutionResult } from './ExportExecutionResult';
import {
  ExportPipelineRunner,
  createExportPipelineRunner,
  type ExportPipelineRunnerDependencies
} from './ExportPipelineRunner';

/**
 * Uçtan uca Export Engine facade.
 */
export class ExportRuntimeFacade {
  private readonly runner: ExportPipelineRunner;

  constructor(deps?: ExportPipelineRunnerDependencies) {
    this.runner = createExportPipelineRunner(deps);
  }

  /**
   * Tam yürütme — ExportExecutionResult döner.
   */
  async execute(
    context: ExportExecutionContext
  ): Promise<ExportExecutionResult> {
    return this.runner.execute(context);
  }

  /**
   * Kısayol — yalnızca foundation ExportResult döner.
   */
  async run(
    request: ExportRequest,
    options: Omit<ExportExecutionContext, 'request'> = {}
  ): Promise<ExportResult> {
    const result = await this.execute(
      createExportExecutionContext({ request, ...options })
    );
    return result.exportResult;
  }
}

/**
 * Fabrika.
 */
export function createExportRuntimeFacade(
  deps?: ExportPipelineRunnerDependencies
): ExportRuntimeFacade {
  return new ExportRuntimeFacade(deps);
}

export default ExportRuntimeFacade;
