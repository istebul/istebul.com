/**
 * İSTEBUL Business Import Engine — ImportRuntimeFacade (PR-101J).
 *
 * Uçtan uca import giriş noktası — mevcut runtime katmanlarını birleştirir.
 */

import type { ImportRequest } from '../../types/ImportRequest';
import type { ImportResult } from '../../types/ImportResult';
import type { ImportExecutionContext } from './ImportExecutionContext';
import { createImportExecutionContext } from './ImportExecutionContext';
import type { ImportExecutionResult } from './ImportExecutionResult';
import {
  createPipelineRunner,
  type PipelineRunner,
  type PipelineRunnerDependencies
} from './PipelineRunner';

/**
 * Uçtan uca Import Engine facade.
 */
export class ImportRuntimeFacade {
  private readonly runner: PipelineRunner;

  constructor(deps?: PipelineRunnerDependencies) {
    this.runner = createPipelineRunner(deps);
  }

  /**
   * Tam yürütme — ImportExecutionResult döner.
   */
  async execute(
    context: ImportExecutionContext
  ): Promise<ImportExecutionResult> {
    return this.runner.execute(context);
  }

  /**
   * Kısayol — yalnızca ImportResult döner.
   */
  async run(
    request: ImportRequest,
    options: Omit<ImportExecutionContext, 'request'> = {}
  ): Promise<ImportResult> {
    const result = await this.execute(
      createImportExecutionContext({ request, ...options })
    );
    return result.importResult;
  }
}

/**
 * Fabrika.
 */
export function createImportRuntimeFacade(
  deps?: PipelineRunnerDependencies
): ImportRuntimeFacade {
  return new ImportRuntimeFacade(deps);
}

export default ImportRuntimeFacade;
