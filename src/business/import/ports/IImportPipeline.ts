/**
 * İSTEBUL Business Import Engine — pipeline portu.
 *
 * Aşamaları sırayla koordine eder. Bu PR’da implementasyon yoktur.
 */

import type { ImportPipelineStageDefinition } from '../pipeline/ImportPipeline';
import type { ImportRequest } from '../types/ImportRequest';
import type { ImportResult } from '../types/ImportResult';

export interface IImportPipeline {
  /** Kayıtlı aşama tanımları */
  readonly stages: readonly ImportPipelineStageDefinition[];

  /**
   * İsteği pipeline boyunca işler.
   * Implementasyon sonraki PR’lardadır.
   */
  run(request: ImportRequest): Promise<ImportResult>;
}
