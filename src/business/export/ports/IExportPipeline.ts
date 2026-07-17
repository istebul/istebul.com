import type { ExportPipelineStageDefinition } from '../pipeline/ExportPipeline';
import type { ExportRequest } from '../models/ExportRequest';
import type { ExportResult } from '../models/ExportResult';

export interface IExportPipeline {
  readonly stages: readonly ExportPipelineStageDefinition[];

  /**
   * İsteği export pipeline aşamalarından geçirir.
   * Implementasyon sonraki PR’lardadır.
   */
  run(request: ExportRequest): Promise<ExportResult>;
}
