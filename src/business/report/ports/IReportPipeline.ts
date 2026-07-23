/**
 * İSTEBUL Business Report Engine — pipeline portu.
 */

import type { ReportPipelineStageDefinition } from '../pipeline/ReportPipeline';
import type { ReportModel } from '../models/ReportModel';
import type { ReportRequest } from '../models/ReportRequest';

export interface IReportPipeline {
  readonly stages: readonly ReportPipelineStageDefinition[];

  /**
   * İsteği rapor pipeline aşamalarından geçirir.
   * Implementasyon sonraki PR’lardadır.
   */
  run(request: ReportRequest): Promise<ReportModel>;
}
